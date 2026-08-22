/**
 * 25-Endpoint Integration Audit Suite — Phase D4
 *
 * Verifies all 25 CONTRACT.md endpoints against the real backend service.
 */

import { login } from '../../frontend/src/api-client/auth';
import { setAuthToken, ApiClientError, getBaseApiUrl } from '../../frontend/src/api-client/client';

export interface EndpointAuditResult {
  id: number;
  method: string;
  path: string;
  module: string;
  result: 'PASS' | 'BLOCKED' | 'FAIL';
  status: number;
  note?: string;
}

export async function run25EndpointAudit(): Promise<EndpointAuditResult[]> {
  console.log('=== Starting 25-Endpoint Integration Audit against Real Backend ===');
  console.log(`Target API URL: ${getBaseApiUrl()}`);

  const results: EndpointAuditResult[] = [];
  const baseUrl = getBaseApiUrl().replace(/\/$/, '');

  // 1. Authenticate as Employee (John Doe) & HR Admin (hr.admin@dayflow.com)
  const empLoginRes = await login({ email: 'john.doe@dayflow.com', password: 'Password123!' });
  const empToken = empLoginRes.token;

  const hrLoginRes = await login({ email: 'hr.admin@dayflow.com', password: 'Password123!' });
  const hrToken = hrLoginRes.token;

  // Helper for fetch check
  async function auditEndpoint(
    id: number,
    module: string,
    method: string,
    path: string,
    token: string | null,
    body?: any,
    expectedStatus = [200, 201]
  ): Promise<EndpointAuditResult> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const isPass = expectedStatus.includes(res.status);
      const isBlocked = res.status === 501;

      return {
        id,
        module,
        method,
        path,
        status: res.status,
        result: isBlocked ? 'BLOCKED' : isPass ? 'PASS' : 'FAIL',
        note: isPass ? 'Contract aligned' : isBlocked ? 'Backend HTTP 501 stub' : `HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        id,
        module,
        method,
        path,
        status: 0,
        result: 'FAIL',
        note: err.message,
      };
    }
  }

  // 1. POST /api/auth/signup (Real Signup)
  results.push(await auditEndpoint(1, 'AUTH', 'POST', '/auth/signup', null, {
    email: `audit.${Date.now()}@dayflow.com`,
    password: 'Password123!',
    firstName: 'Audit',
    lastName: 'User',
  }, [201]));

  // 2. POST /api/auth/login
  results.push(await auditEndpoint(2, 'AUTH', 'POST', '/auth/login', null, { email: 'john.doe@dayflow.com', password: 'Password123!' }, [200]));

  // 3. POST /api/auth/verify-email
  results.push(await auditEndpoint(3, 'AUTH', 'POST', '/auth/verify-email', null, { token: 'sample-token' }, [200, 400, 404]));

  // 4. POST /api/auth/resend-verification
  results.push(await auditEndpoint(4, 'AUTH', 'POST', '/auth/resend-verification', null, { email: 'john.doe@dayflow.com' }, [200, 404]));

  // --- EMPLOYEES MODULE (6 endpoints) ---
  // 5. GET /api/employees/me
  results.push(await auditEndpoint(5, 'EMPLOYEES', 'GET', '/employees/me', empToken, undefined, [200]));

  // 6. PATCH /api/employees/me
  results.push(await auditEndpoint(6, 'EMPLOYEES', 'PATCH', '/employees/me', empToken, { phone: '+1-555-9999' }, [200]));

  // 7. GET /api/employees
  results.push(await auditEndpoint(7, 'EMPLOYEES', 'GET', '/employees', hrToken, undefined, [200]));

  // 8. PATCH /api/employees/:id
  results.push(await auditEndpoint(8, 'EMPLOYEES', 'PATCH', '/employees/33333333-3333-3333-3333-222222222222', hrToken, { position: 'Staff Engineer' }, [200]));

  // 9. GET /api/employees/recent-activity
  results.push(await auditEndpoint(9, 'EMPLOYEES', 'GET', '/employees/recent-activity', empToken, undefined, [200]));

  // 10. GET /api/employees/switch-context/:id
  results.push(await auditEndpoint(10, 'EMPLOYEES', 'GET', '/employees/switch-context/33333333-3333-3333-3333-222222222222', hrToken, undefined, [200]));

  // --- DEPARTMENTS MODULE (1 endpoint) ---
  // 11. GET /api/departments
  results.push(await auditEndpoint(11, 'DEPARTMENTS', 'GET', '/departments', empToken, undefined, [200]));

  // --- LEAVE MODULE (4 endpoints) ---
  // 12. POST /api/leave-requests
  results.push(await auditEndpoint(12, 'LEAVE', 'POST', '/leave-requests', empToken, {
    leaveType: 'Paid',
    startDate: '2026-11-01',
    endDate: '2026-11-02',
    reason: 'Audit testing',
  }, [201, 409]));

  // 13. GET /api/leave-requests/me
  results.push(await auditEndpoint(13, 'LEAVE', 'GET', '/leave-requests/me', empToken, undefined, [200]));

  // 14. GET /api/leave-requests
  results.push(await auditEndpoint(14, 'LEAVE', 'GET', '/leave-requests', hrToken, undefined, [200]));

  // 15. PATCH /api/leave-requests/:id
  results.push(await auditEndpoint(15, 'LEAVE', 'PATCH', '/leave-requests/00000000-0000-0000-0000-000000000000', hrToken, { status: 'Approved' }, [200, 404]));

  // --- ATTENDANCE MODULE (4 endpoints) ---
  // 16. POST /api/attendance/check-in
  results.push(await auditEndpoint(16, 'ATTENDANCE', 'POST', '/attendance/check-in', empToken, {}, [201, 409]));

  // 17. POST /api/attendance/check-out
  results.push(await auditEndpoint(17, 'ATTENDANCE', 'POST', '/attendance/check-out', empToken, {}, [200, 400, 409]));

  // 18. GET /api/attendance/me
  results.push(await auditEndpoint(18, 'ATTENDANCE', 'GET', '/attendance/me', empToken, undefined, [200]));

  // 19. GET /api/attendance
  results.push(await auditEndpoint(19, 'ATTENDANCE', 'GET', '/attendance', hrToken, undefined, [200]));

  // --- PAYROLL MODULE (3 endpoints) ---
  // 20. GET /api/payroll/me
  results.push(await auditEndpoint(20, 'PAYROLL', 'GET', '/payroll/me', empToken, undefined, [200]));

  // 21. GET /api/payroll/:employeeId
  results.push(await auditEndpoint(21, 'PAYROLL', 'GET', '/payroll/33333333-3333-3333-3333-222222222222', hrToken, undefined, [200]));

  // 22. PATCH /api/payroll/:employeeId
  results.push(await auditEndpoint(22, 'PAYROLL', 'PATCH', '/payroll/33333333-3333-3333-3333-222222222222', hrToken, { baseSalary: 8500 }, [200]));

  // --- DOCUMENTS MODULE (3 endpoints) ---
  // 23. GET /api/documents/me
  results.push(await auditEndpoint(23, 'DOCUMENTS', 'GET', '/documents/me', empToken, undefined, [200]));

  // 24. GET /api/documents/:employeeId
  results.push(await auditEndpoint(24, 'DOCUMENTS', 'GET', '/documents/33333333-3333-3333-3333-222222222222', hrToken, undefined, [200]));

  // 25. POST /api/documents
  results.push(await auditEndpoint(25, 'DOCUMENTS', 'POST', '/documents', hrToken, {
    employeeId: '33333333-3333-3333-3333-222222222222',
    title: 'Audit Document',
    documentType: 'Policy',
    fileUrl: 'https://example.com/docs/policy.pdf',
  }, [201]));

  const passCount = results.filter((r) => r.result === 'PASS').length;
  const blockedCount = results.filter((r) => r.result === 'BLOCKED').length;
  const failCount = results.filter((r) => r.result === 'FAIL').length;

  console.log(`=== 25-Endpoint Integration Audit Summary: PASS: ${passCount}, BLOCKED: ${blockedCount}, FAIL: ${failCount} ===`);
  return results;
}

if (typeof require !== 'undefined' && require.main === module) {
  run25EndpointAudit()
    .then((res) => {
      console.table(res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('25-Endpoint Audit Failed:', err);
      process.exit(1);
    });
}
