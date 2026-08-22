import { LeaveRepository } from '../repositories/leave.repository';
import { AppError } from '../auth/errors/AppError';
import type { CreateLeaveRequest, LeaveRequest, Paginated } from '../../../shared/types';

const VALID_LEAVE_TYPES = ['Paid', 'Sick', 'Unpaid'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateCreateDto(dto: CreateLeaveRequest): void {
  const details: { field: string; message: string }[] = [];

  if (!dto.leaveType || !VALID_LEAVE_TYPES.includes(dto.leaveType)) {
    details.push({ field: 'leaveType', message: "Must be one of 'Paid', 'Sick', 'Unpaid'" });
  }
  if (!dto.startDate || !DATE_RE.test(dto.startDate)) {
    details.push({ field: 'startDate', message: 'Must be a valid date in YYYY-MM-DD format' });
  }
  if (!dto.endDate || !DATE_RE.test(dto.endDate)) {
    details.push({ field: 'endDate', message: 'Must be a valid date in YYYY-MM-DD format' });
  }
  if (
    dto.startDate &&
    dto.endDate &&
    DATE_RE.test(dto.startDate) &&
    DATE_RE.test(dto.endDate) &&
    dto.endDate < dto.startDate
  ) {
    details.push({ field: 'endDate', message: 'endDate must be on or after startDate' });
  }
  if (!dto.reason || !dto.reason.trim()) {
    details.push({ field: 'reason', message: 'Reason is required' });
  }

  if (details.length > 0) {
    throw new AppError('VALIDATION_ERROR', 'Invalid leave request', 400, details);
  }
}

/**
 * BR-1: Leave Overlap Prevention.
 * PostgreSQL error code for an EXCLUDE constraint violation
 * (the `no_overlapping_active_leave` constraint hits this).
 */
const PG_EXCLUSION_VIOLATION = '23P01';

function overlapError(): AppError {
  return new AppError(
    'LEAVE_OVERLAP',
    'Those dates overlap an existing request - pick different dates',
    409,
    [{ field: 'startDate', message: 'Date range overlaps an existing pending/approved leave request' }]
  );
}

export const LeaveService = {
  /**
   * Creates a new leave request for the authenticated employee.
   * Status defaults to 'Pending' (enforced at the DB level).
   *
   * BR-1 overlap prevention is enforced twice ("belt-and-suspenders"):
   *  1. A pre-check query (LeaveRepository.hasOverlap) short-circuits obvious overlaps.
   *  2. The DB's `no_overlapping_active_leave` EXCLUDE constraint is the source of truth —
   *     if it fires (Postgres error 23P01) during insert, it's translated to the same
   *     409 LEAVE_OVERLAP response.
   */
  async create(employeeId: string, dto: CreateLeaveRequest): Promise<LeaveRequest> {
    validateCreateDto(dto);

    const overlaps = await LeaveRepository.hasOverlap(employeeId, dto.startDate, dto.endDate);
    if (overlaps) {
      throw overlapError();
    }

    try {
      return await LeaveRepository.create({
        employeeId,
        leaveType: dto.leaveType,
        startDate: dto.startDate,
        endDate: dto.endDate,
        reason: dto.reason,
      });
    } catch (err: any) {
      if (err && err.code === PG_EXCLUSION_VIOLATION) {
        throw overlapError();
      }
      throw err;
    }
  },

  /** Returns the employee's own leave requests, paginated. */
  async listOwn(employeeId: string, page: number, pageSize: number): Promise<Paginated<LeaveRequest>> {
    const { items, total } = await LeaveRepository.findByEmployee(employeeId, page, pageSize);
    return { items, total };
  },
};
