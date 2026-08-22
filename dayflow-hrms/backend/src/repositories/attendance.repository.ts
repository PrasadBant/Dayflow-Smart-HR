import { query } from '../config/db';
import { toDateString, toTimestampString } from './date.util';
import type { Attendance, AttendanceStatus } from '../../../shared/types';

interface AttendanceRow {
  id: string;
  employee_id: string;
  att_date: string | Date;
  check_in: string | Date | null;
  check_out: string | Date | null;
  status: AttendanceStatus;
  created_at: string | Date;
  updated_at: string | Date;
}

function mapRow(row: AttendanceRow): Attendance {
  return {
    id: row.id,
    employeeId: row.employee_id,
    attDate: toDateString(row.att_date),
    checkIn: row.check_in ? toTimestampString(row.check_in) : undefined,
    checkOut: row.check_out ? toTimestampString(row.check_out) : undefined,
    status: row.status,
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
  };
}

export const AttendanceRepository = {
  async findByEmployeeAndDate(employeeId: string, attDate: string): Promise<Attendance | null> {
    const result = await query(
      `SELECT * FROM attendance WHERE employee_id = $1 AND att_date = $2`,
      [employeeId, attDate]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  },

  /**
   * Inserts today's check-in. May throw a Postgres error with code 23505
   * (unique_violation on employee_id+att_date) if already checked in —
   * the service layer translates that to 409 ALREADY_CHECKED_IN.
   */
  async checkIn(employeeId: string, attDate: string, checkInAt: Date): Promise<Attendance> {
    const result = await query(
      `INSERT INTO attendance (employee_id, att_date, check_in, status)
       VALUES ($1, $2, $3, 'Present')
       RETURNING *`,
      [employeeId, attDate, checkInAt]
    );
    return mapRow(result.rows[0]);
  },

  /**
   * Sets check_out on an existing row. May throw a Postgres check_violation
   * (23514) if checkOutAt <= check_in — the service layer translates that
   * to 400 VALIDATION_ERROR.
   */
  async checkOut(id: string, checkOutAt: Date): Promise<Attendance> {
    const result = await query(
      `UPDATE attendance SET check_out = $2 WHERE id = $1 RETURNING *`,
      [id, checkOutAt]
    );
    return mapRow(result.rows[0]);
  },

  async findByEmployee(
    employeeId: string,
    page: number,
    pageSize: number
  ): Promise<{ items: Attendance[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const [itemsResult, countResult] = await Promise.all([
      query(
        `SELECT * FROM attendance WHERE employee_id = $1 ORDER BY att_date DESC LIMIT $2 OFFSET $3`,
        [employeeId, pageSize, offset]
      ),
      query(`SELECT COUNT(*)::int AS total FROM attendance WHERE employee_id = $1`, [employeeId]),
    ]);
    return { items: itemsResult.rows.map(mapRow), total: countResult.rows[0]?.total ?? 0 };
  },

  /** Most recent N attendance records for an employee (used by switch-context). */
  async findRecentByEmployee(employeeId: string, limit: number): Promise<Attendance[]> {
    const result = await query(
      `SELECT * FROM attendance WHERE employee_id = $1 ORDER BY att_date DESC LIMIT $2`,
      [employeeId, limit]
    );
    return result.rows.map(mapRow);
  },

  async findAll(page: number, pageSize: number): Promise<{ items: Attendance[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const [itemsResult, countResult] = await Promise.all([
      query(`SELECT * FROM attendance ORDER BY att_date DESC LIMIT $1 OFFSET $2`, [pageSize, offset]),
      query(`SELECT COUNT(*)::int AS total FROM attendance`),
    ]);
    return { items: itemsResult.rows.map(mapRow), total: countResult.rows[0]?.total ?? 0 };
  },
};
