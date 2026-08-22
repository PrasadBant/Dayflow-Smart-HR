import crypto from 'crypto';
import { query, pool } from '../config/db';
import { toTimestampString } from './date.util';
import { DEFAULT_UNASSIGNED_DEPARTMENT, DEFAULT_EMPLOYEE_POSITION } from '../../../shared/types';
import type { User, Role } from '../../../shared/types';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: Role;
  employee_code: string | null;
  email_verified: boolean;
  created_at: string | Date;
  updated_at: string | Date;
}

export function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    employeeCode: row.employee_code ?? undefined,
    emailVerified: row.email_verified,
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
  };
}

export const AuthRepository = {
  /** Returns the raw row (including password_hash) — callers must not leak it. */
  async findUserByEmail(email: string): Promise<UserRow | null> {
    const result = await query(`SELECT * FROM users WHERE email = $1`, [email]);
    return result.rows[0] ?? null;
  },

  async findUserById(id: string): Promise<UserRow | null> {
    const result = await query(`SELECT * FROM users WHERE id = $1`, [id]);
    return result.rows[0] ?? null;
  },

  async findEmployeeIdByUserId(userId: string): Promise<string | null> {
    const result = await query(`SELECT id FROM employees WHERE user_id = $1`, [userId]);
    return result.rows[0]?.id ?? null;
  },

  async markEmailVerified(userId: string): Promise<void> {
    await query(`UPDATE users SET email_verified = TRUE WHERE id = $1`, [userId]);
  },

  async isEmployeeCodeTaken(employeeCode: string): Promise<boolean> {
    const result = await query(`SELECT 1 FROM employees WHERE employee_code = $1 LIMIT 1`, [employeeCode]);
    return (result.rowCount ?? 0) > 0;
  },

  /**
   * Creates the users + employees rows for a self-registered EMPLOYEE in one
   * transaction. Per CONTRACT.md §6.6, new employees are assigned the default
   * `Unassigned` department and `'Employee'` position — HR fixes these later
   * via PATCH /api/employees/:id.
   */
  async createUserWithEmployee(input: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    employeeCode?: string;
  }): Promise<UserRow> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const employeeCode = input.employeeCode ?? `EMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role, employee_code, email_verified)
         VALUES ($1, $2, 'EMPLOYEE', $3, FALSE)
         RETURNING *`,
        [input.email, input.passwordHash, employeeCode]
      );
      const userRow: UserRow = userResult.rows[0];

      await client.query(
        `INSERT INTO employees
           (user_id, employee_code, first_name, last_name, email, department_id, department_name, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userRow.id,
          employeeCode,
          input.firstName,
          input.lastName,
          input.email,
          DEFAULT_UNASSIGNED_DEPARTMENT.id,
          DEFAULT_UNASSIGNED_DEPARTMENT.name,
          DEFAULT_EMPLOYEE_POSITION,
        ]
      );

      await client.query('COMMIT');
      return userRow;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
