// Set environment variables before importing app/config (same convention as auth.test.ts)
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dayflow_hrms';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_dayflow_hrms_2026_secure';
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
process.env.PORT = process.env.PORT || '5000';

/**
 * IMPORTANT — what this file does and does NOT verify:
 *
 * No live Postgres instance is available in this environment (verified before
 * writing this file). So the "default Unassigned department" / "default
 * Employee position" / "role hardcoded to EMPLOYEE" tests below do NOT check
 * a persisted database row. Instead they mock `pool.connect()` (the pg
 * transport boundary) with a fake client that records every SQL statement
 * and parameter array AuthRepository.createUserWithEmployee actually sends,
 * and assert on those. The repository/service code under test is 100% real —
 * only the network call to Postgres is stubbed. This proves "the backend
 * sends the right INSERT," not "the row exists in the database." If/when a
 * live DB is available, that's a separate, stronger claim someone should
 * verify (e.g. via scripts/verify-constraints.sql or a real integration run).
 */

import { pool } from '../src/config/db';
import { AuthService } from '../src/services/auth.service';
import { AuthRepository, UserRow } from '../src/repositories/auth.repository';
import { AppError } from '../src/auth/errors/AppError';
import { env } from '../src/config/env';
import { DEFAULT_UNASSIGNED_DEPARTMENT, DEFAULT_EMPLOYEE_POSITION } from '../../shared/types';
import type { SignupRequest } from '../../shared/types';

interface RecordedQuery {
  text: string;
  params?: unknown[];
}

/** A fake pg PoolClient that records every query instead of touching a real DB. */
function makeFakeClient(userRowToReturn: UserRow) {
  const calls: RecordedQuery[] = [];
  const client = {
    query: async (text: string, params?: unknown[]) => {
      calls.push({ text, params });
      if (text.includes('INSERT INTO users')) {
        return { rows: [userRowToReturn], rowCount: 1 };
      }
      // BEGIN / COMMIT / ROLLBACK / INSERT INTO employees
      return { rows: [], rowCount: 1 };
    },
    release: () => {},
  };
  return { client, calls };
}

async function runTests() {
  console.log('--- STARTING SIGNUP VERIFICATION (B4 gap closure) ---');
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
      id: 'new-user-id',
      email: 'new.employee@dayflow.com',
      password_hash: '$2b$10$doesnotmatterforthistest.......',
      role: 'EMPLOYEE',
      employee_code: null,
      email_verified: false,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  const validDto: SignupRequest = {
    email: 'new.employee@dayflow.com',
    password: 'Password123',
    firstName: 'New',
    lastName: 'Employee',
  };

  const originalFindUserByEmail = AuthRepository.findUserByEmail;
  const originalIsEmployeeCodeTaken = AuthRepository.isEmployeeCodeTaken;
  const originalPoolConnect = pool.connect.bind(pool);

  function stubNoExistingUser() {
    AuthRepository.findUserByEmail = async () => null;
    AuthRepository.isEmployeeCodeTaken = async () => false;
  }

  function restoreAll() {
    AuthRepository.findUserByEmail = originalFindUserByEmail;
    AuthRepository.isEmployeeCodeTaken = originalIsEmployeeCodeTaken;
    (pool as any).connect = originalPoolConnect;
  }

  // ============================================================
  // 1. Normal signup creates an EMPLOYEE
  // ============================================================
  {
    stubNoExistingUser();
    const { client } = makeFakeClient(fakeUserRow());
    (pool as any).connect = async () => client;

    const result = await AuthService.signup(validDto);

    assert(result.user.role === 'EMPLOYEE', 'Normal signup creates a user with role EMPLOYEE');
    assert(!('token' in result), 'Signup response contains no token (per contract: { user } only)');

    restoreAll();
  }

  // ============================================================
  // 2. signup with role:"HR" injected cannot create an HR user
  //    — asserted both on the returned role AND on the raw SQL actually sent
  //    (role is architecturally hardcoded into the query text, not a param).
  // ============================================================
  {
    stubNoExistingUser();
    const { client, calls } = makeFakeClient(fakeUserRow({ role: 'EMPLOYEE' }));
    (pool as any).connect = async () => client;

    const maliciousDto = { ...validDto, email: 'wannabe.hr@dayflow.com', role: 'HR' } as unknown as SignupRequest;
    const result = await AuthService.signup(maliciousDto);

    const usersInsert = calls.find((c) => c.text.includes('INSERT INTO users'));

    assert(result.user.role === 'EMPLOYEE', "signup with role:'HR' injected still returns role EMPLOYEE");
    assert(
      !!usersInsert && usersInsert.text.includes(`'EMPLOYEE'`) && !usersInsert.text.includes(`'HR'`),
      "The INSERT INTO users statement hardcodes role = 'EMPLOYEE' in the query text (not parameterized) — role from the client can never reach it"
    );
    assert(
      !!usersInsert && !(usersInsert.params ?? []).some((p) => p === 'HR'),
      "'HR' never appears anywhere in the parameters sent to the users INSERT"
    );

    restoreAll();
  }

  // ============================================================
  // 3-5. Password strength rejections (BR-7)
  // ============================================================
  {
    let caught: any = null;
    try {
      await AuthService.signup({ ...validDto, password: 'Ab1' }); // too short
    } catch (err) {
      caught = err;
    }
    assert(
      caught instanceof AppError && caught.code === 'VALIDATION_ERROR' && caught.status === 400,
      'Weak (too short) password is rejected with 400 VALIDATION_ERROR'
    );
  }
  {
    let caught: any = null;
    try {
      await AuthService.signup({ ...validDto, password: 'abcdefgh' }); // letters only, 8 chars
    } catch (err) {
      caught = err;
    }
    assert(
      caught instanceof AppError && caught.code === 'VALIDATION_ERROR' && caught.status === 400,
      'Letters-only password is rejected with 400 VALIDATION_ERROR'
    );
  }
  {
    let caught: any = null;
    try {
      await AuthService.signup({ ...validDto, password: '12345678' }); // numbers only, 8 chars
    } catch (err) {
      caught = err;
    }
    assert(
      caught instanceof AppError && caught.code === 'VALIDATION_ERROR' && caught.status === 400,
      'Numbers-only password is rejected with 400 VALIDATION_ERROR'
    );
  }

  // ============================================================
  // 6. Duplicate email is rejected
  // ============================================================
  {
    AuthRepository.findUserByEmail = async () => fakeUserRow({ email: validDto.email });

    let caught: any = null;
    try {
      await AuthService.signup(validDto);
    } catch (err) {
      caught = err;
    }

    assert(
      caught instanceof AppError && caught.code === 'EMAIL_TAKEN' && caught.status === 409,
      'Duplicate email is rejected with 409 EMAIL_TAKEN'
    );

    restoreAll();
  }

  // ============================================================
  // 7-8. Default Unassigned department + default Employee position
  //       (see file-level note: verifies the SQL params sent, not a
  //       persisted row — no live DB is available in this environment)
  // ============================================================
  {
    stubNoExistingUser();
    const { client, calls } = makeFakeClient(fakeUserRow());
    (pool as any).connect = async () => client;

    await AuthService.signup(validDto);

    const employeesInsert = calls.find((c) => c.text.includes('INSERT INTO employees'));
    const params = employeesInsert?.params ?? [];
    // Column order in auth.repository.ts:
    // (user_id, employee_code, first_name, last_name, email, department_id, department_name, position)
    const departmentId = params[5];
    const departmentName = params[6];
    const position = params[7];

    assert(
      departmentId === DEFAULT_UNASSIGNED_DEPARTMENT.id && departmentName === DEFAULT_UNASSIGNED_DEPARTMENT.name,
      'New employee is assigned the default Unassigned department (id + name sent to the employees INSERT)'
    );
    assert(
      position === DEFAULT_EMPLOYEE_POSITION,
      "New employee is assigned the default 'Employee' position (sent to the employees INSERT)"
    );

    restoreAll();
  }

  // ============================================================
  // 9. No sensitive credentials leak — response, logs, or error objects
  // ============================================================
  {
    stubNoExistingUser();
    const plaintextPassword = 'SuperSecret123';
    const { client, calls } = makeFakeClient(fakeUserRow({ email: 'leak-check@dayflow.com' }));
    (pool as any).connect = async () => client;

    const loggedLines: string[] = [];
    const originalConsoleLog = console.log;
    console.log = (...args: unknown[]) => {
      loggedLines.push(args.map(String).join(' '));
    };

    let result: { user: any } | undefined;
    try {
      result = await AuthService.signup({
        ...validDto,
        email: 'leak-check@dayflow.com',
        password: plaintextPassword,
      });
    } finally {
      console.log = originalConsoleLog;
    }

    const serializedResponse = JSON.stringify(result);
    const allLoggedText = loggedLines.join('\n');

    assert(
      !serializedResponse.includes(plaintextPassword) &&
        !serializedResponse.includes('password') &&
        !serializedResponse.includes('passwordHash') &&
        !serializedResponse.includes(env.JWT_SECRET),
      'Signup response contains no plaintext password, password field, or JWT secret'
    );

    assert(
      !allLoggedText.includes(plaintextPassword) && !allLoggedText.includes(env.JWT_SECRET),
      'Nothing logged during signup contains the plaintext password or the JWT secret'
    );

    const usersInsert = calls.find((c) => c.text.includes('INSERT INTO users'));
    const sentPasswordParam = (usersInsert?.params ?? [])[1] as string | undefined;
    assert(
      typeof sentPasswordParam === 'string' &&
        sentPasswordParam !== plaintextPassword &&
        sentPasswordParam.startsWith('$2'),
      'The value sent to the DB for password_hash is a bcrypt hash, never the plaintext password'
    );

    // Error paths must not leak the password either.
    AuthRepository.findUserByEmail = async () => fakeUserRow({ email: 'leak-check@dayflow.com' });
    let caughtError: any = null;
    try {
      await AuthService.signup({ ...validDto, email: 'leak-check@dayflow.com', password: plaintextPassword });
    } catch (err) {
      caughtError = err;
    }
    const serializedError = JSON.stringify({
      code: caughtError?.code,
      message: caughtError?.message,
      details: caughtError?.details,
    });
    assert(
      caughtError instanceof AppError &&
        !serializedError.includes(plaintextPassword) &&
        !serializedError.includes(env.JWT_SECRET),
      'The EMAIL_TAKEN error object contains no plaintext password or JWT secret'
    );

    restoreAll();
  }

  console.log(`\n=== SUMMARY: ${passed}/${total} TESTS PASSED ===`);
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
