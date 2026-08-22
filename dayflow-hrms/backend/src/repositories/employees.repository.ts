import { query } from '../config/db';
import { toDateString, toTimestampString } from './date.util';
import type { Employee, ActivityItem } from '../../../shared/types';

interface EmployeeRow {
  id: string;
  user_id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: string;
  department_name: string;
  position: string;
  phone: string | null;
  address: string | null;
  profile_picture_url: string | null;
  hire_date: string | Date;
  created_at: string | Date;
  updated_at: string | Date;
}

function mapRow(row: EmployeeRow): Employee {
  return {
    id: row.id,
    userId: row.user_id,
    employeeCode: row.employee_code,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    departmentId: row.department_id,
    departmentName: row.department_name,
    position: row.position,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    profilePictureUrl: row.profile_picture_url ?? undefined,
    hireDate: toDateString(row.hire_date),
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
  };
}

export interface EmployeeUpdateFields {
  firstName?: string;
  lastName?: string;
  position?: string;
  departmentId?: string;
  departmentName?: string; // kept in sync whenever departmentId changes
  phone?: string;
  address?: string;
  profilePictureUrl?: string;
}

const COLUMN_MAP: Record<keyof EmployeeUpdateFields, string> = {
  firstName: 'first_name',
  lastName: 'last_name',
  position: 'position',
  departmentId: 'department_id',
  departmentName: 'department_name',
  phone: 'phone',
  address: 'address',
  profilePictureUrl: 'profile_picture_url',
};

export const EmployeesRepository = {
  async findById(id: string): Promise<Employee | null> {
    const result = await query(`SELECT * FROM employees WHERE id = $1`, [id]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  },

  /** Dynamic partial UPDATE — only the provided fields are touched. */
  async updateProfile(id: string, fields: EmployeeUpdateFields): Promise<Employee | null> {
    const entries = Object.entries(fields).filter(([, v]) => v !== undefined) as [
      keyof EmployeeUpdateFields,
      string
    ][];

    if (entries.length === 0) {
      return this.findById(id);
    }

    const setClauses = entries.map(([key], idx) => `${COLUMN_MAP[key]} = $${idx + 2}`);
    const values = entries.map(([, value]) => value);

    const result = await query(
      `UPDATE employees SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  },

  async list(page: number, pageSize: number): Promise<{ items: Employee[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const [itemsResult, countResult] = await Promise.all([
      query(
        `SELECT * FROM employees ORDER BY last_name ASC, first_name ASC LIMIT $1 OFFSET $2`,
        [pageSize, offset]
      ),
      query(`SELECT COUNT(*)::int AS total FROM employees`),
    ]);
    return {
      items: itemsResult.rows.map(mapRow),
      total: countResult.rows[0]?.total ?? 0,
    };
  },

  /**
   * Recent activity feed synthesized from leave requests and attendance
   * check-ins for this employee (there's no dedicated per-employee activity
   * table — `audit_log` tracks admin actions by user_id, not this shape).
   */
  async findRecentActivity(employeeId: string, limit = 10): Promise<ActivityItem[]> {
    const result = await query(
      `
      (
        SELECT id, employee_id, 'Leave request submitted' AS action,
               (leave_type || ' leave: ' || start_date || ' to ' || end_date) AS details,
               created_at AS ts
        FROM leave_requests WHERE employee_id = $1
      )
      UNION ALL
      (
        SELECT id, employee_id,
               CASE WHEN status = 'Approved' THEN 'Leave request approved'
                    WHEN status = 'Rejected' THEN 'Leave request rejected'
                    ELSE 'Leave request updated' END AS action,
               decision_comments AS details,
               decided_at AS ts
        FROM leave_requests WHERE employee_id = $1 AND decided_at IS NOT NULL
      )
      UNION ALL
      (
        SELECT id, employee_id, 'Checked in' AS action, NULL AS details, check_in AS ts
        FROM attendance WHERE employee_id = $1 AND check_in IS NOT NULL
      )
      UNION ALL
      (
        SELECT id, employee_id, 'Checked out' AS action, NULL AS details, check_out AS ts
        FROM attendance WHERE employee_id = $1 AND check_out IS NOT NULL
      )
      ORDER BY ts DESC
      LIMIT $2
      `,
      [employeeId, limit]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id,
      action: row.action,
      details: row.details ?? undefined,
      timestamp: toTimestampString(row.ts),
    }));
  },
};
