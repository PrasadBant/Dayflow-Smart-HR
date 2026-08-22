import { query } from '../config/db';
import type { LeaveRequest, LeaveType, LeaveStatus } from '../../../shared/types';

/**
 * Leave Request Repository.
 * Parameterized SQL only. Maps snake_case DB rows to camelCase shared types.
 * Knows nothing about roles/auth — that's the service/route layers' job.
 */

interface LeaveRequestRow {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string | Date;
  end_date: string | Date;
  reason: string;
  status: LeaveStatus;
  decided_by: string | null;
  decided_at: string | Date | null;
  decision_comments: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

function toDateString(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function toTimestampString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapRow(row: LeaveRequestRow): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveType: row.leave_type,
    startDate: toDateString(row.start_date),
    endDate: toDateString(row.end_date),
    reason: row.reason,
    status: row.status,
    decidedBy: row.decided_by ?? undefined,
    decidedAt: row.decided_at ? toTimestampString(row.decided_at) : undefined,
    decisionComments: row.decision_comments ?? undefined,
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
  };
}

export interface CreateLeaveRequestInput {
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export const LeaveRepository = {
  /**
   * Inserts a new leave request. Status defaults to 'Pending' at the DB level.
   * May throw a Postgres error with code 23P01 (exclusion_violation) if the
   * `no_overlapping_active_leave` constraint is hit — the service layer handles that.
   */
  async create(input: CreateLeaveRequestInput): Promise<LeaveRequest> {
    const result = await query(
      `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.employeeId, input.leaveType, input.startDate, input.endDate, input.reason]
    );
    return mapRow(result.rows[0]);
  },

  /**
   * Belt-and-suspenders pre-check: does this employee already have a Pending/Approved
   * leave request whose date range overlaps [startDate, endDate]?
   */
  async hasOverlap(employeeId: string, startDate: string, endDate: string): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM leave_requests
       WHERE employee_id = $1
         AND status IN ('Pending', 'Approved')
         AND daterange(start_date, end_date, '[]') && daterange($2::date, $3::date, '[]')
       LIMIT 1`,
      [employeeId, startDate, endDate]
    );
    return (result.rowCount ?? 0) > 0;
  },

  /** Paginated list of an employee's own leave requests, newest first. */
  async findByEmployee(
    employeeId: string,
    page: number,
    pageSize: number
  ): Promise<{ items: LeaveRequest[]; total: number }> {
    const offset = (page - 1) * pageSize;

    const [itemsResult, countResult] = await Promise.all([
      query(
        `SELECT * FROM leave_requests
         WHERE employee_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [employeeId, pageSize, offset]
      ),
      query(`SELECT COUNT(*)::int AS total FROM leave_requests WHERE employee_id = $1`, [employeeId]),
    ]);

    return {
      items: itemsResult.rows.map(mapRow),
      total: countResult.rows[0]?.total ?? 0,
    };
  },

  /** Most recent N leave requests for an employee (used by switch-context). */
  async findRecentByEmployee(employeeId: string, limit: number): Promise<LeaveRequest[]> {
    const result = await query(
      `SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [employeeId, limit]
    );
    return result.rows.map(mapRow);
  },

  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await query(`SELECT * FROM leave_requests WHERE id = $1`, [id]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  },

  /** HR-only paginated list, optionally filtered by status. */
  async findAll(
    page: number,
    pageSize: number,
    status?: LeaveStatus
  ): Promise<{ items: LeaveRequest[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const whereClause = status ? `WHERE status = $3` : '';
    const params = status ? [pageSize, offset, status] : [pageSize, offset];

    const [itemsResult, countResult] = await Promise.all([
      query(
        `SELECT * FROM leave_requests ${whereClause} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        params
      ),
      query(
        `SELECT COUNT(*)::int AS total FROM leave_requests ${status ? 'WHERE status = $1' : ''}`,
        status ? [status] : []
      ),
    ]);

    return {
      items: itemsResult.rows.map(mapRow),
      total: countResult.rows[0]?.total ?? 0,
    };
  },

  /**
   * Records an HR decision (Approved/Rejected). Only meaningful when the
   * request is currently Pending — the service layer enforces that.
   */
  async updateDecision(
    id: string,
    decidedBy: string,
    status: 'Approved' | 'Rejected',
    decisionComments?: string
  ): Promise<LeaveRequest> {
    const result = await query(
      `UPDATE leave_requests
       SET status = $2, decided_by = $3, decided_at = CURRENT_TIMESTAMP, decision_comments = $4
       WHERE id = $1
       RETURNING *`,
      [id, status, decidedBy, decisionComments ?? null]
    );
    return mapRow(result.rows[0]);
  },
};
