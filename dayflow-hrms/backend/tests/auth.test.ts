// Set environment variables before importing app/config
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dayflow_hrms';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_dayflow_hrms_2026_secure';
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
process.env.PORT = process.env.PORT || '5000';

import { hashPassword, verifyPassword } from '../src/auth/hash';
import { signToken, verifyToken } from '../src/auth/jwt';
import { AppError } from '../src/auth/errors/AppError';
import { requireAuth, requireRole, requireOwnership } from '../src/auth/middleware';
import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import http from 'http';
import { env } from '../src/config/env';

async function runAuthTests() {
  console.log('--- STARTING PHASE A4 AUTH UTILITIES & MIDDLEWARE VERIFICATION ---');
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

  // 1. bcrypt hash + verify succeeds
  const password = 'SecurePassword123!';
  const hash = await hashPassword(password);
  const verifyValid = await verifyPassword(password, hash);
  assert(verifyValid === true, 'bcrypt hash + verify succeeds');

  // 2. Wrong password verification returns false
  const verifyInvalid = await verifyPassword('WrongPassword', hash);
  assert(verifyInvalid === false, 'Wrong password verification returns false');

  // 3. JWT sign + verify succeeds
  const testPayload = { userId: 'usr-123', employeeId: 'emp-456', role: 'EMPLOYEE' as const };
  const token = signToken(testPayload);
  const decoded = verifyToken(token);
  assert(decoded !== null && typeof token === 'string', 'JWT sign + verify succeeds');

  // 4. JWT contains userId, employeeId, role
  assert(
    decoded.userId === 'usr-123' && decoded.employeeId === 'emp-456' && decoded.role === 'EMPLOYEE',
    'JWT contains userId, employeeId, role'
  );

  // 5. JWT expires after 8 hours
  const rawDecoded = jwt.decode(token) as jwt.JwtPayload;
  const expiryHours = (rawDecoded.exp! - rawDecoded.iat!) / 3600;
  assert(expiryHours === 8, `JWT expires in exactly 8 hours (got ${expiryHours}h)`);

  // 6. Invalid JWT is rejected
  let invalidCaught = false;
  try {
    verifyToken('invalid.token.str');
  } catch (err: any) {
    invalidCaught = err instanceof AppError && err.status === 401 && err.code === 'UNAUTHORIZED';
  }
  assert(invalidCaught, 'Invalid JWT is rejected with 401 UNAUTHORIZED');

  // 7. Expired JWT is rejected
  const expiredToken = jwt.sign(testPayload, env.JWT_SECRET, { expiresIn: '-1s' });
  let expiredCaught = false;
  try {
    verifyToken(expiredToken);
  } catch (err: any) {
    expiredCaught = err instanceof AppError && err.status === 401 && err.code === 'UNAUTHORIZED';
  }
  assert(expiredCaught, 'Expired JWT is rejected with 401 UNAUTHORIZED');

  // 8. Missing Authorization header is rejected with 401
  let nextErr8: any = null;
  const mockReq8: any = { headers: {} };
  requireAuth(mockReq8, {} as any, (err?: any) => { nextErr8 = err; });
  assert(nextErr8 instanceof AppError && nextErr8.status === 401, 'Missing Authorization header rejected with 401');

  // 9. Invalid Bearer token is rejected with 401
  let nextErr9: any = null;
  const mockReq9: any = { headers: { authorization: 'Bearer bad.token.here' } };
  requireAuth(mockReq9, {} as any, (err?: any) => { nextErr9 = err; });
  assert(nextErr9 instanceof AppError && nextErr9.status === 401, 'Invalid Bearer token rejected with 401');

  // 10. HR role passes requireRole('HR')
  let nextErr10: any = null;
  const mockReq10: any = { user: { userId: 'u1', employeeId: 'e1', role: 'HR' } };
  requireRole('HR')(mockReq10, {} as any, (err?: any) => { nextErr10 = err; });
  assert(nextErr10 === undefined, "HR role passes requireRole('HR')");

  // 11. Employee role is rejected by requireRole('HR') with 403
  let nextErr11: any = null;
  const mockReq11: any = { user: { userId: 'u1', employeeId: 'e1', role: 'EMPLOYEE' } };
  requireRole('HR')(mockReq11, {} as any, (err?: any) => { nextErr11 = err; });
  assert(nextErr11 instanceof AppError && nextErr11.status === 403 && nextErr11.code === 'FORBIDDEN', "Employee role rejected by requireRole('HR') with 403 FORBIDDEN");

  // 12. Employee can access own employee route parameter
  let nextErr12: any = null;
  const mockReq12: any = { user: { userId: 'u1', employeeId: 'emp-100', role: 'EMPLOYEE' }, params: { employeeId: 'emp-100' } };
  requireOwnership('employeeId')(mockReq12, {} as any, (err?: any) => { nextErr12 = err; });
  assert(nextErr12 === undefined, 'Employee can access own employee route parameter');

  // 13. Employee cannot access another employee route parameter (403)
  let nextErr13: any = null;
  const mockReq13: any = { user: { userId: 'u1', employeeId: 'emp-100', role: 'EMPLOYEE' }, params: { employeeId: 'emp-999' } };
  requireOwnership('employeeId')(mockReq13, {} as any, (err?: any) => { nextErr13 = err; });
  assert(nextErr13 instanceof AppError && nextErr13.status === 403 && nextErr13.code === 'FORBIDDEN', "Employee cannot access another employee route parameter (403 FORBIDDEN)");

  // 14. Employee with matching body/query but different route parameter MUST get 403
  let nextErr14: any = null;
  const mockReq14: any = {
    user: { userId: 'u1', employeeId: 'emp-100', role: 'EMPLOYEE' },
    params: { id: 'emp-999' },
    body: { id: 'emp-100' },
    query: { id: 'emp-100' }
  };
  requireOwnership('id')(mockReq14, {} as any, (err?: any) => { nextErr14 = err; });
  assert(nextErr14 instanceof AppError && nextErr14.status === 403 && nextErr14.code === 'FORBIDDEN', 'Employee with matching body/query but different route parameter gets 403 FORBIDDEN');

  // 15. Missing route parameter returns 403 FORBIDDEN
  let nextErr15: any = null;
  const mockReq15: any = { user: { userId: 'u1', employeeId: 'emp-100', role: 'EMPLOYEE' }, params: {} };
  requireOwnership('employeeId')(mockReq15, {} as any, (err?: any) => { nextErr15 = err; });
  assert(nextErr15 instanceof AppError && nextErr15.status === 403 && nextErr15.code === 'FORBIDDEN', 'Missing route parameter returns 403 FORBIDDEN');

  // 16. HR bypasses ownership restriction
  let nextErr16: any = null;
  const mockReq16: any = { user: { userId: 'u1', employeeId: 'emp-hr', role: 'HR' }, params: { employeeId: 'emp-999' } };
  requireOwnership('employeeId')(mockReq16, {} as any, (err?: any) => { nextErr16 = err; });
  assert(nextErr16 === undefined, 'HR bypasses ownership restriction');

  // 17. Missing req.user returns 401 UNAUTHORIZED
  let nextErr17: any = null;
  const mockReq17: any = { params: { employeeId: 'emp-100' } };
  requireOwnership('employeeId')(mockReq17, {} as any, (err?: any) => { nextErr17 = err; });
  assert(nextErr17 instanceof AppError && nextErr17.status === 401 && nextErr17.code === 'UNAUTHORIZED', 'Missing req.user returns 401 UNAUTHORIZED');

  // 18. AppError integrates with app.ts central error handling pattern & no secrets exposed
  const testApp = express();
  testApp.use(express.json());
  testApp.get('/test-auth', requireAuth, (_req, res) => res.json({ ok: true }));
  testApp.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err.status || err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = err.message || 'An unexpected error occurred';
    res.status(statusCode).json({ error: { code, message } });
  });

  const server = testApp.listen(0, () => {
    const port = (server.address() as any).port;
    http.get({
      hostname: 'localhost',
      port,
      path: '/test-auth',
      headers: { authorization: 'Bearer invalid_token' }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const json = JSON.parse(body);
        assert(
          res.statusCode === 401 &&
          json.error &&
          json.error.code === 'UNAUTHORIZED' &&
          !body.includes(env.JWT_SECRET) &&
          !body.includes('password'),
          'AppError integrates with app.ts error middleware without exposing secrets'
        );
        server.close();
        console.log(`\n=== SUMMARY: ${passed}/${total} TESTS PASSED ===`);
      });
    });
  });
}

runAuthTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
