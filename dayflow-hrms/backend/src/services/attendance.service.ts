import { AttendanceRepository } from '../repositories/attendance.repository';
import { AppError } from '../auth/errors/AppError';
import type { Attendance, CheckInRequest, CheckOutRequest, Paginated } from '../../../shared/types';

const PG_UNIQUE_VIOLATION = '23505';
const PG_CHECK_VIOLATION = '23514';

function resolveTimestamp(raw?: string): Date {
  if (!raw) return new Date();
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    throw new AppError('VALIDATION_ERROR', 'Invalid timestamp', 400, [
      { field: 'timestamp', message: 'Must be a valid ISO 8601 date-time string' },
    ]);
  }
  return d;
}

function toAttDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const AttendanceService = {
  /** BR-4: single active check-in per day per employee. */
  async checkIn(employeeId: string, dto: CheckInRequest): Promise<Attendance> {
    const checkInAt = resolveTimestamp(dto.timestamp);
    const attDate = toAttDate(checkInAt);

    try {
      return await AttendanceRepository.checkIn(employeeId, attDate, checkInAt);
    } catch (err: any) {
      if (err && err.code === PG_UNIQUE_VIOLATION) {
        throw new AppError('ALREADY_CHECKED_IN', 'You have already checked in today', 409);
      }
      throw err;
    }
  },

  /** BR-4: cannot check out without a prior check-in; checkOut must be after checkIn. */
  async checkOut(employeeId: string, dto: CheckOutRequest): Promise<Attendance> {
    const checkOutAt = resolveTimestamp(dto.timestamp);
    const attDate = toAttDate(checkOutAt);

    const today = await AttendanceRepository.findByEmployeeAndDate(employeeId, attDate);
    if (!today || !today.checkIn) {
      throw new AppError('NOT_CHECKED_IN', 'You have not checked in today', 400);
    }
    if (today.checkOut) {
      throw new AppError('CONFLICT', 'You have already checked out today', 409);
    }

    try {
      return await AttendanceRepository.checkOut(today.id, checkOutAt);
    } catch (err: any) {
      if (err && err.code === PG_CHECK_VIOLATION) {
        throw new AppError('VALIDATION_ERROR', 'Check-out time must be after check-in time', 400);
      }
      throw err;
    }
  },

  async listMine(employeeId: string, page: number, pageSize: number): Promise<Paginated<Attendance>> {
    return AttendanceRepository.findByEmployee(employeeId, page, pageSize);
  },

  async listAll(page: number, pageSize: number): Promise<Paginated<Attendance>> {
    return AttendanceRepository.findAll(page, pageSize);
  },
};
