import { query } from '../config/db';
import { toTimestampString } from './date.util';
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
};
