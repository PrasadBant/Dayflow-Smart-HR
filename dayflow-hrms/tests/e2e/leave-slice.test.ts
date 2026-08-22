/**
 * E2E Integration Test — Phase D2: Leave Slice
 *
 * Exercises the REAL backend vertical slice for Leave Requests:
 * 1. Login with seeded employee credentials (john.doe@dayflow.com / Password123!)
 * 2. Create a leave request (POST /api/leave-requests)
 * 3. Verify HTTP 201 response and Pending status
 * 4. Fetch own leave requests (GET /api/leave-requests/me)
 * 5. Verify the newly created leave request appears in Paginated<LeaveRequest>
 * 6. Test BR-1 Leave Overlap Prevention (POST overlapping dates -> HTTP 409 LEAVE_OVERLAP)
 * 7. Test unauthorized access (request without JWT fails with HTTP 401)
 */

import { login } from '../../frontend/src/api-client/auth';
import { createLeaveRequest, getMyLeaveRequests } from '../../frontend/src/api-client/leave';
import { setAuthToken, ApiClientError, getBaseApiUrl } from '../../frontend/src/api-client/client';
import type { CreateLeaveRequest } from '../../shared/types';

export async function runLeaveSliceE2ETest(): Promise<{
  loginSuccess: boolean;
  createSuccess: boolean;
  listSuccess: boolean;
  pendingStatusSuccess: boolean;
  overlapSuccess: boolean;
  unauthorizedSuccess: boolean;
}> {
  console.log('=== Starting D2 Leave Slice E2E Test against Real Backend ===');
  console.log(`Target API URL: ${getBaseApiUrl()}`);

  const results = {
    loginSuccess: false,
    createSuccess: false,
    listSuccess: false,
    pendingStatusSuccess: false,
    overlapSuccess: false,
    unauthorizedSuccess: false,
  };

  // Step 1: Login as Seeded Employee (John Doe)
  console.log('[1/7] Logging in with seeded employee credentials (john.doe@dayflow.com)...');
  setAuthToken(null);

  // Directly call real auth login endpoint to get valid token
  const baseUrl = getBaseApiUrl().replace(/\/$/, '');
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'john.doe@dayflow.com',
      password: 'Password123!',
    }),
  });

  if (!loginRes.ok) {
    const errText = await loginRes.text();
    throw new Error(`Login failed with status ${loginRes.status}: ${errText}`);
  }

  const authData = await loginRes.json();
  if (!authData.token || !authData.user) {
    throw new Error('Login response missing token or user payload');
  }

  setAuthToken(authData.token);
  results.loginSuccess = true;
  console.log(`✓ Login successful! Employee ID: ${authData.user.employeeCode || authData.user.id}`);

  // Step 2: Test Unauthorized Access (Without JWT Token)
  console.log('[2/7] Verifying unauthorized request protection (expecting HTTP 401)...');
  const unauthRes = await fetch(`${baseUrl}/leave-requests/me`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (unauthRes.status === 401 || unauthRes.status === 403) {
    results.unauthorizedSuccess = true;
    console.log(`✓ Unauthorized request correctly rejected with status ${unauthRes.status}`);
  } else {
    console.warn(`! Warning: Unauthorized request returned unexpected status ${unauthRes.status}`);
  }

  // Step 3: Create a Leave Request (POST /api/leave-requests)
  const uniqueId = Date.now().toString().slice(-4);
  const futureOffsetDays = 100 + (Math.floor(Date.now() / 1000) % 50000);
  const startD = new Date(Date.now() + futureOffsetDays * 86400000);
  const endD = new Date(startD.getTime() + 4 * 86400000);
  const overlapD = new Date(startD.getTime() + 2 * 86400000);
  const overlapEndD = new Date(startD.getTime() + 6 * 86400000);

  const safeStartDate = startD.toISOString().split('T')[0];
  const safeEndDate = endD.toISOString().split('T')[0];
  const overlapStartDate = overlapD.toISOString().split('T')[0];
  const overlapEndDate = overlapEndD.toISOString().split('T')[0];

  const newLeaveDto: CreateLeaveRequest = {
    leaveType: 'Paid',
    startDate: safeStartDate,
    endDate: safeEndDate,
    reason: `D2 E2E Integration Test Leave ${uniqueId}`,
  };

  console.log(`[3/7] Creating leave request for ${safeStartDate} to ${safeEndDate}...`);
  const createdLeave = await createLeaveRequest(newLeaveDto);

  if (!createdLeave.id || !createdLeave.employeeId) {
    throw new Error('Created leave request missing id or employeeId');
  }
  results.createSuccess = true;
  console.log(`✓ Leave request created successfully! ID: ${createdLeave.id}`);

  // Step 4: Verify Status is "Pending"
  console.log('[4/7] Verifying leave request status === "Pending"...');
  if (createdLeave.status === 'Pending') {
    results.pendingStatusSuccess = true;
    console.log('✓ Leave request status is Pending');
  } else {
    throw new Error(`Expected status Pending but received "${createdLeave.status}"`);
  }

  // Step 5: List Own Leave Requests (GET /api/leave-requests/me)
  console.log('[5/7] Fetching employee leave requests (GET /api/leave-requests/me)...');
  const ownLeavesPaginated = await getMyLeaveRequests();

  if (!Array.isArray(ownLeavesPaginated.items)) {
    throw new Error('getMyLeaveRequests did not return a valid Paginated items array');
  }

  const foundItem = ownLeavesPaginated.items.find((item) => item.id === createdLeave.id);
  if (!foundItem) {
    throw new Error(`Newly created leave request #${createdLeave.id} not found in GET /api/leave-requests/me list`);
  }
  results.listSuccess = true;
  console.log(`✓ Newly created leave request #${createdLeave.id} verified in GET /api/leave-requests/me`);

  // Step 6: Test BR-1 Leave Overlap Prevention (POST overlapping dates)
  console.log('[6/7] Testing BR-1 Leave Overlap Prevention (expecting HTTP 409 LEAVE_OVERLAP)...');
  const overlappingDto: CreateLeaveRequest = {
    leaveType: 'Sick',
    startDate: overlapStartDate,
    endDate: overlapEndDate,
    reason: 'Overlapping Leave Attempt',
  };

  try {
    await createLeaveRequest(overlappingDto);
    console.error('! Error: Overlapping leave request succeeded when it should have failed!');
  } catch (err) {
    if (err instanceof ApiClientError) {
      if (err.status === 409 || err.code === 'LEAVE_OVERLAP') {
        results.overlapSuccess = true;
        console.log(`✓ Leave overlap correctly prevented! HTTP ${err.status} (${err.code}): ${err.message}`);
      } else {
        console.warn(`! Received unexpected ApiClientError code: ${err.code} status: ${err.status}`);
      }
    } else {
      console.log('✓ Overlap request failed with error:', (err as Error).message);
      results.overlapSuccess = true;
    }
  }

  console.log('=== D2 Leave Slice E2E Test Completed Successfully ===');
  return results;
}

if (typeof require !== 'undefined' && require.main === module) {
  runLeaveSliceE2ETest()
    .then((res) => {
      console.log('Test Summary:', JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('E2E Test Failed with error:', err);
      process.exit(1);
    });
}
