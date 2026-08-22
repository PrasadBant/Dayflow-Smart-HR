// Set environment variables before importing app/config (same convention as auth.test.ts)
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dayflow_hrms';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_dayflow_hrms_2026_secure';
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
process.env.PORT = process.env.PORT || '5000';

import { LeaveService } from '../src/services/leave.service';
import { LeaveRepository } from '../src/repositories/leave.repository';
import { AppError } from '../src/auth/errors/AppError';
import type { CreateLeaveRequest, LeaveRequest } from '../../shared/types';

async function runOverlapTests() {
  console.log('--- STARTING PHASE B3 LEAVE OVERLAP RULE (BR-1) VERIFICATION ---');
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

  const validDto: CreateLeaveRequest = {
    leaveType: 'Paid',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    reason: 'Family trip',
  };

  const fakeCreated: LeaveRequest = {
    id: 'leave-1',
    employeeId: 'emp-100',
    leaveType: validDto.leaveType,
    startDate: validDto.startDate,
    endDate: validDto.endDate,
    reason: validDto.reason,
    status: 'Pending',
    createdAt: '2026-08-22T00:00:00.000Z',
    updatedAt: '2026-08-22T00:00:00.000Z',
  };

  // Save originals to restore after monkey-patching the repository singleton.
  const originalHasOverlap = LeaveRepository.hasOverlap;
  const originalCreate = LeaveRepository.create;

  // --- Test 1: non-overlapping request succeeds ---
  {
    let createCalled = false;
    LeaveRepository.hasOverlap = async () => false;
    LeaveRepository.create = async (input) => {
      createCalled = true;
      return { ...fakeCreated, employeeId: input.employeeId };
    };

    const result = await LeaveService.create('emp-100', validDto);
    assert(
      createCalled && result.status === 'Pending' && result.employeeId === 'emp-100',
      'Non-overlapping leave request succeeds and returns the created LeaveRequest (Pending)'
    );
  }

  // --- Test 2: pre-check catches an overlap before ever hitting the DB insert ---
  {
    let createCalled = false;
    LeaveRepository.hasOverlap = async () => true;
    LeaveRepository.create = async (input) => {
      createCalled = true;
      return { ...fakeCreated, employeeId: input.employeeId };
    };

    let caught: any = null;
    try {
      await LeaveService.create('emp-100', validDto);
    } catch (err) {
      caught = err;
    }

    assert(
      caught instanceof AppError &&
        caught.code === 'LEAVE_OVERLAP' &&
        caught.status === 409 &&
        !createCalled,
      'Overlap pre-check rejects with 409 LEAVE_OVERLAP and never calls LeaveRepository.create'
    );
  }

  // --- Test 3: DB exclusion constraint (23P01) is translated to 409 LEAVE_OVERLAP ---
  // Simulates a race where the pre-check passes but the `no_overlapping_active_leave`
  // EXCLUDE constraint still fires on insert — the DB is the real source of truth.
  {
    LeaveRepository.hasOverlap = async () => false;
    LeaveRepository.create = async () => {
      const pgError: any = new Error('conflicting key value violates exclusion constraint "no_overlapping_active_leave"');
      pgError.code = '23P01';
      throw pgError;
    };

    let caught: any = null;
    try {
      await LeaveService.create('emp-100', validDto);
    } catch (err) {
      caught = err;
    }

    assert(
      caught instanceof AppError && caught.code === 'LEAVE_OVERLAP' && caught.status === 409,
      'DB exclusion_violation (23P01) on insert is translated to 409 LEAVE_OVERLAP'
    );
  }

  // --- Test 4: a non-overlap DB error still propagates unchanged (not swallowed as overlap) ---
  {
    LeaveRepository.hasOverlap = async () => false;
    LeaveRepository.create = async () => {
      const pgError: any = new Error('connection refused');
      pgError.code = 'ECONNREFUSED';
      throw pgError;
    };

    let caught: any = null;
    try {
      await LeaveService.create('emp-100', validDto);
    } catch (err) {
      caught = err;
    }

    assert(
      caught?.code === 'ECONNREFUSED' && !(caught instanceof AppError),
      'Unrelated DB errors are not misreported as LEAVE_OVERLAP'
    );
  }

  // --- Test 5: validation still runs before any overlap check ---
  {
    let hasOverlapCalled = false;
    LeaveRepository.hasOverlap = async () => {
      hasOverlapCalled = true;
      return false;
    };

    let caught: any = null;
    try {
      await LeaveService.create('emp-100', { ...validDto, endDate: '2026-08-01' }); // endDate before startDate
    } catch (err) {
      caught = err;
    }

    assert(
      caught instanceof AppError && caught.code === 'VALIDATION_ERROR' && !hasOverlapCalled,
      'Invalid date range is rejected by validation before the overlap check runs'
    );
  }

  // Restore the real repository implementation.
  LeaveRepository.hasOverlap = originalHasOverlap;
  LeaveRepository.create = originalCreate;

  console.log(`\n=== SUMMARY: ${passed}/${total} TESTS PASSED ===`);
}

runOverlapTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
