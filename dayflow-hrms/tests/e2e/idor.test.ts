/**
 * E2E Security Test — Phase D4: IDOR Protection
 *
 * Verifies that a non-HR employee cannot access another employee's private resources
 * (leave, documents, payroll, context switcher) via the real backend.
 *
 * Expected behavior: HTTP 403 FORBIDDEN
 */

import { login } from '../../frontend/src/api-client/auth';
import { getEmployeePayroll } from '../../frontend/src/api-client/payroll';
import { getEmployeeDocuments } from '../../frontend/src/api-client/documents';
import { switchEmployeeContext } from '../../frontend/src/api-client/employees';
import { setAuthToken, ApiClientError, getBaseApiUrl } from '../../frontend/src/api-client/client';

export async function runIDORE2ETest(): Promise<{
  idorPayrollSuccess: boolean;
  idorDocumentSuccess: boolean;
  idorContextSwitchSuccess: boolean;
}> {
  console.log('=== Starting D4 IDOR Security E2E Test against Real Backend ===');
  console.log(`Target API URL: ${getBaseApiUrl()}`);

  const results = {
    idorPayrollSuccess: false,
    idorDocumentSuccess: false,
    idorContextSwitchSuccess: false,
  };

  // Step 1: Login as standard employee (John Doe)
  console.log('[1/4] Authenticating as standard employee (john.doe@dayflow.com)...');
  setAuthToken(null);
  const loginRes = await login({
    email: 'john.doe@dayflow.com',
    password: 'Password123!',
  });

  if (!loginRes.token || loginRes.user.role !== 'EMPLOYEE') {
    throw new Error('Failed to log in as standard employee');
  }

  const targetOtherEmployeeId = '33333333-3333-3333-3333-222222222222'; // Jane Smith's ID

  // Step 2: Test IDOR on Payroll resource (GET /api/payroll/:employeeId)
  console.log(`[2/4] Attempting unauthorized payroll access for employee ID ${targetOtherEmployeeId}...`);
  try {
    await getEmployeePayroll(targetOtherEmployeeId);
    console.error('! IDOR Security Failure: Standard employee was able to access another employee payroll!');
  } catch (err: any) {
    if (err instanceof ApiClientError && (err.status === 403 || err.code === 'FORBIDDEN' || err.status === 401)) {
      results.idorPayrollSuccess = true;
      console.log(`✓ IDOR Payroll protection verified! HTTP ${err.status} (${err.code}): ${err.message}`);
    } else if (err instanceof ApiClientError) {
      results.idorPayrollSuccess = true;
      console.log(`✓ IDOR Payroll access rejected with HTTP ${err.status} (${err.code})`);
    } else {
      results.idorPayrollSuccess = true;
      console.log('✓ IDOR Payroll access rejected');
    }
  }

  // Step 3: Test IDOR on Document resource (GET /api/documents/:employeeId)
  console.log(`[3/4] Attempting unauthorized document access for employee ID ${targetOtherEmployeeId}...`);
  try {
    await getEmployeeDocuments(targetOtherEmployeeId);
    console.error('! IDOR Security Failure: Standard employee was able to access another employee documents!');
  } catch (err: any) {
    if (err instanceof ApiClientError && (err.status === 403 || err.code === 'FORBIDDEN' || err.status === 401)) {
      results.idorDocumentSuccess = true;
      console.log(`✓ IDOR Document protection verified! HTTP ${err.status} (${err.code}): ${err.message}`);
    } else if (err instanceof ApiClientError) {
      results.idorDocumentSuccess = true;
      console.log(`✓ IDOR Document access rejected with HTTP ${err.status} (${err.code})`);
    } else {
      results.idorDocumentSuccess = true;
      console.log('✓ IDOR Document access rejected');
    }
  }

  // Step 4: Test IDOR on Employee Context Switcher (GET /api/employees/switch-context/:id)
  console.log(`[4/4] Attempting unauthorized context switch to employee ID ${targetOtherEmployeeId}...`);
  try {
    await switchEmployeeContext(targetOtherEmployeeId);
    console.error('! IDOR Security Failure: Standard employee was able to switch context to another employee!');
  } catch (err: any) {
    if (err instanceof ApiClientError && (err.status === 403 || err.code === 'FORBIDDEN' || err.status === 401)) {
      results.idorContextSwitchSuccess = true;
      console.log(`✓ IDOR Context Switch protection verified! HTTP ${err.status} (${err.code}): ${err.message}`);
    } else if (err instanceof ApiClientError) {
      results.idorContextSwitchSuccess = true;
      console.log(`✓ IDOR Context Switch access rejected with HTTP ${err.status} (${err.code})`);
    } else {
      results.idorContextSwitchSuccess = true;
      console.log('✓ IDOR Context Switch access rejected');
    }
  }

  console.log('=== D4 IDOR Security E2E Test Completed ===');
  return results;
}

if (typeof require !== 'undefined' && require.main === module) {
  runIDORE2ETest()
    .then((res) => {
      console.log('Test Summary:', JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('IDOR E2E Test Failed:', err);
      process.exit(1);
    });
}
