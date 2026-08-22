/**
 * Unified E2E Test Runner — Phase D7-1
 *
 * Executes all six canonical E2E integration test suites in a deterministic
 * order against the real backend API:
 * 1. auth-flow.test.ts
 * 2. leave-slice.test.ts
 * 3. attendance-slice.test.ts
 * 4. idor.test.ts
 * 5. 25-endpoint-audit.test.ts
 * 6. master-regression.test.ts
 *
 * Aggregates pass/fail status and exits with status 0 if all pass, or 1 if any fail.
 */

import { runAuthFlowE2ETest } from '../tests/e2e/auth-flow.test';
import { runLeaveSliceE2ETest } from '../tests/e2e/leave-slice.test';
import { runAttendanceSliceE2ETest } from '../tests/e2e/attendance-slice.test';
import { runIDORE2ETest } from '../tests/e2e/idor.test';
import { run25EndpointAudit } from '../tests/e2e/25-endpoint-audit.test';
import { runMasterRegressionSuite } from '../tests/e2e/master-regression.test';

interface SuiteResult {
  name: string;
  status: 'PASS' | 'FAIL';
  error?: string;
}

export async function runAllE2ETestSuites(): Promise<boolean> {
  console.log('===========================================================');
  console.log('=== DAYFLOW HRMS UNIFIED E2E INTEGRATION SUITE RUNNER ===');
  console.log('===========================================================');

  const results: SuiteResult[] = [];

  // Suite 1: auth-flow
  console.log('\n>>> [1/6] Running Auth Flow E2E Suite...');
  try {
    await runAuthFlowE2ETest();
    results.push({ name: 'auth-flow', status: 'PASS' });
  } catch (err: any) {
    results.push({ name: 'auth-flow', status: 'FAIL', error: err.message });
  }

  // Suite 2: leave-slice
  console.log('\n>>> [2/6] Running Leave Slice E2E Suite...');
  try {
    await runLeaveSliceE2ETest();
    results.push({ name: 'leave-slice', status: 'PASS' });
  } catch (err: any) {
    results.push({ name: 'leave-slice', status: 'FAIL', error: err.message });
  }

  // Suite 3: attendance-slice
  console.log('\n>>> [3/6] Running Attendance Slice E2E Suite...');
  try {
    await runAttendanceSliceE2ETest();
    results.push({ name: 'attendance-slice', status: 'PASS' });
  } catch (err: any) {
    results.push({ name: 'attendance-slice', status: 'FAIL', error: err.message });
  }

  // Suite 4: idor
  console.log('\n>>> [4/6] Running IDOR Security E2E Suite...');
  try {
    await runIDORE2ETest();
    results.push({ name: 'idor', status: 'PASS' });
  } catch (err: any) {
    results.push({ name: 'idor', status: 'FAIL', error: err.message });
  }

  // Suite 5: 25-endpoint-audit
  console.log('\n>>> [5/6] Running 25-Endpoint Integration Audit Suite...');
  try {
    const auditRes = await run25EndpointAudit();
    const hasFail = auditRes.some((r) => r.result === 'FAIL' || r.result === 'BLOCKED');
    if (hasFail) {
      results.push({ name: '25-endpoint-audit', status: 'FAIL', error: 'One or more endpoints failed audit' });
    } else {
      results.push({ name: '25-endpoint-audit', status: 'PASS' });
    }
  } catch (err: any) {
    results.push({ name: '25-endpoint-audit', status: 'FAIL', error: err.message });
  }

  // Suite 6: master-regression
  console.log('\n>>> [6/6] Running Master End-to-End Regression Suite...');
  try {
    await runMasterRegressionSuite();
    results.push({ name: 'master-regression', status: 'PASS' });
  } catch (err: any) {
    results.push({ name: 'master-regression', status: 'FAIL', error: err.message });
  }

  // Summary Reporting
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const totalCount = results.length;
  const allPassed = passCount === totalCount;

  console.log('\n===========================================================');
  console.log('=== E2E INTEGRATION TEST SUMMARY ===');
  console.log('===========================================================');

  for (const res of results) {
    if (res.status === 'PASS') {
      console.log(`✓ ${res.name}`);
    } else {
      console.log(`✗ ${res.name} (Error: ${res.error || 'Unknown failure'})`);
    }
  }

  console.log('\n-----------------------------------------------------------');
  console.log(`TOTAL: ${passCount} / ${totalCount} PASSED`);
  console.log(`FINAL STATUS: ${allPassed ? 'PASS' : 'FAIL'}`);
  console.log('===========================================================');

  return allPassed;
}

if (typeof require !== 'undefined' && require.main === module) {
  runAllE2ETestSuites()
    .then((passed) => {
      process.exit(passed ? 0 : 1);
    })
    .catch((err) => {
      console.error('Unified E2E Runner Execution Error:', err);
      process.exit(1);
    });
}
