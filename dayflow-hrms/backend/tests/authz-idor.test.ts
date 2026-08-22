// Set environment variables before importing app/config (same convention as auth.test.ts)
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dayflow_hrms';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_dayflow_hrms_2026_secure';
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
process.env.PORT = process.env.PORT || '5000';

import http from 'http';
import app from '../src/app';
import { signToken } from '../src/auth/jwt';
import { AuthService } from '../src/services/auth.service';
import { AuthRepository, UserRow } from '../src/repositories/auth.repository';
import { AppError } from '../src/auth/errors/AppError';
import type { SignupRequest } from '../../shared/types';

async function runTests() {
  console.log('--- STARTING PHASE B5 AUTHZ / IDOR / SIGNUP VERIFICATION ---');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, description: string) {
    total++;
    if (condition) {
      console.log(`✅ TEST ${total}: ${description}`);
      passed++;
    } else {
      console.error(`❌ TEST ${total} FAILED: ${description}`);
      process.exitCode = 1;
    }
  }

  function fakeUserRow(overrides: Partial<UserRow> = {}): UserRow {
    return {
      id: 'user-1',
      email: 'existing@dayflow.com',
      password_hash: '$2b$10$fakehashfakehashfakehashfa',
      role: 'EMPLOYEE',
      employee_code: null,
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  // ============================================================
  // Group 1: duplicate-email signup -> 409 EMAIL_TAKEN
  // ============================================================
  {
    const originalFindUserByEmail = AuthRepository.findUserByEmail;
    AuthRepository.findUserByEmail = async () => fakeUserRow();

    let caught: any = null;
    try {
      await AuthService.signup({
        email: 'existing@dayflow.com',
        password: 'Password123',
        firstName: 'Dup',
        lastName: 'User',
      });
    } catch (err) {
      caught = err;
    }

    assert(
      caught instanceof AppError && caught.code === 'EMAIL_TAKEN' && caught.status === 409,
      'Duplicate-email signup is rejected with 409 EMAIL_TAKEN'
    );

    AuthRepository.findUserByEmail = originalFindUserByEmail;
  }

  // ============================================================
  // Group 2: signup with role:'HR' injected in the body still creates EMPLOYEE
  // ============================================================
  {
    const originalFindUserByEmail = AuthRepository.findUserByEmail;
    const originalIsEmployeeCodeTaken = AuthRepository.isEmployeeCodeTaken;
    const originalCreateUserWithEmployee = AuthRepository.createUserWithEmployee;

    AuthRepository.findUserByEmail = async () => null;
    AuthRepository.isEmployeeCodeTaken = async () => false;

    let capturedInput: any = null;
    AuthRepository.createUserWithEmployee = async (input) => {
      capturedInput = input;
      // The repository itself hardcodes role='EMPLOYEE' in the INSERT (see
      // auth.repository.ts) — this fake mirrors that: role isn't even a
      // parameter the repository accepts.
      return fakeUserRow({ id: 'new-user', email: input.email, role: 'EMPLOYEE', email_verified: false });
    };

    // SignupRequest has no `role` field — this simulates a malicious/naive
    // client sending one anyway via an `any` cast, same as raw JSON would.
    const maliciousDto = {
      email: 'hacker@evil.com',
      password: 'Password123',
      firstName: 'Would-Be',
      lastName: 'Admin',
      role: 'HR',
    } as unknown as SignupRequest;

    const result = await AuthService.signup(maliciousDto);

    assert(
      result.user.role === 'EMPLOYEE' &&
        capturedInput !== null &&
        !('role' in capturedInput),
      "signup with role:'HR' injected in the body still creates an EMPLOYEE (role never read from dto)"
    );

    AuthRepository.findUserByEmail = originalFindUserByEmail;
    AuthRepository.isEmployeeCodeTaken = originalIsEmployeeCodeTaken;
    AuthRepository.createUserWithEmployee = originalCreateUserWithEmployee;
  }

  // ============================================================
  // Group 3: live HTTP — employee hitting HR-only routes -> 403 FORBIDDEN
  // (also covers BR-5 ownership/IDOR: every ID-parameterized leave/
  // attendance/payroll/employee endpoint in CONTRACT.md §5 is HR Only —
  // there is no employee-accessible-by-other-id variant, so the role gate
  // *is* the IDOR protection for this API surface.)
  // ============================================================
  const server = app.listen(0);
  const port = (server.address() as any).port;

  function request(
    method: string,
    path: string,
    token?: string
  ): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: 'localhost', port, path, method, headers: token ? { authorization: `Bearer ${token}` } : {} },
        (res) => {
          let raw = '';
          res.on('data', (chunk) => (raw += chunk));
          res.on('end', () => {
            let body: any = null;
            try {
              body = raw ? JSON.parse(raw) : null;
            } catch {
              body = raw;
            }
            resolve({ status: res.statusCode ?? 0, body });
          });
        }
      );
      req.on('error', reject);
      req.end();
    });
  }

  const employeeToken = signToken({ userId: 'u-emp', employeeId: 'emp-self', role: 'EMPLOYEE' });
  const hrToken = signToken({ userId: 'u-hr', employeeId: 'emp-hr', role: 'HR' });

  const otherEmployeeId = 'emp-someone-else';

  const hrOnlyGetRoutes = [
    ['GET /api/employees', 'GET', '/api/employees'],
    ['GET /api/employees/switch-context/:id', 'GET', `/api/employees/switch-context/${otherEmployeeId}`],
    ['GET /api/leave-requests (HR list)', 'GET', '/api/leave-requests'],
    ['GET /api/attendance (HR list)', 'GET', '/api/attendance'],
    [`GET /api/payroll/:employeeId (another employee's payroll)`, 'GET', `/api/payroll/${otherEmployeeId}`],
    [`GET /api/documents/:employeeId (another employee's documents)`, 'GET', `/api/documents/${otherEmployeeId}`],
  ] as const;

  for (const [label, method, path] of hrOnlyGetRoutes) {
    const res = await request(method, path, employeeToken);
    assert(
      res.status === 403 &&
        res.body?.error?.code === 'FORBIDDEN' &&
        typeof res.body?.error?.message === 'string',
      `Employee hitting ${label} gets 403 FORBIDDEN with the standard error shape`
    );
  }

  // PATCH routes (HR only)
  {
    const res = await request('PATCH', `/api/leave-requests/some-leave-id`, employeeToken);
    assert(
      res.status === 403 && res.body?.error?.code === 'FORBIDDEN',
      "Employee hitting PATCH /api/leave-requests/:id (decide) gets 403 FORBIDDEN"
    );
  }
  {
    const res = await request('PATCH', `/api/employees/${otherEmployeeId}`, employeeToken);
    assert(
      res.status === 403 && res.body?.error?.code === 'FORBIDDEN',
      'Employee hitting PATCH /api/employees/:id gets 403 FORBIDDEN'
    );
  }
  {
    const res = await request('PATCH', `/api/payroll/${otherEmployeeId}`, employeeToken);
    assert(
      res.status === 403 && res.body?.error?.code === 'FORBIDDEN',
      'Employee hitting PATCH /api/payroll/:employeeId gets 403 FORBIDDEN'
    );
  }

  // Sanity check: HR gets PAST the role gate on the same routes (may still
  // 500 with no live DB, but must never be 403 — confirms the gate isn't
  // over-blocking HR).
  {
    const res = await request('GET', '/api/employees', hrToken);
    assert(res.status !== 403, 'HR token is not blocked by requireRole on GET /api/employees');
  }

  // No token at all -> 401 UNAUTHORIZED, not 403 (distinct failure mode)
  {
    const res = await request('GET', '/api/employees', undefined);
    assert(
      res.status === 401 && res.body?.error?.code === 'UNAUTHORIZED',
      'No token on an HR-only route gets 401 UNAUTHORIZED (not 403)'
    );
  }

  server.close();

  console.log(`\n=== SUMMARY: ${passed}/${total} TESTS PASSED ===`);
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
