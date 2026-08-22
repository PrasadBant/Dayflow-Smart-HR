import { query } from '../config/db';
import { toDateString, toTimestampString } from './date.util';
import type { Payroll } from '../../../shared/types';

interface PayrollRow {
  id: string;
  employee_id: string;
  pay_period_start: string | Date;
  pay_period_end: string | Date;
  base_salary: string | number;
  bonuses: string | number;
  deductions: string | number;
  net_pay: string | number;
  currency: string;
  status: string;
  created_at: string | Date;
  updated_at: string | Date;
}

function mapRow(row: PayrollRow): Payroll {
  return {
    id: row.id,
    employeeId: row.employee_id,
    payPeriodStart: toDateString(row.pay_period_start),
    payPeriodEnd: toDateString(row.pay_period_end),
    baseSalary: Number(row.base_salary),
    bonuses: Number(row.bonuses),
    deductions: Number(row.deductions),
    netPay: Number(row.net_pay),
    currency: row.currency,
    status: row.status,
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
  };
}

export const PayrollRepository = {
  async findByEmployee(employeeId: string): Promise<Payroll[]> {
    const result = await query(
      `SELECT * FROM payroll WHERE employee_id = $1 ORDER BY pay_period_start DESC`,
      [employeeId]
    );
    return result.rows.map(mapRow);
  },

  /** Most recent payroll record for an employee — the PATCH target. */
  async findLatestByEmployee(employeeId: string): Promise<Payroll | null> {
    const result = await query(
      `SELECT * FROM payroll WHERE employee_id = $1 ORDER BY pay_period_start DESC LIMIT 1`,
      [employeeId]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  },

  async updateById(
    id: string,
    fields: { baseSalary: number; bonuses: number; deductions: number; netPay: number }
  ): Promise<Payroll> {
    const result = await query(
      `UPDATE payroll SET base_salary = $2, bonuses = $3, deductions = $4, net_pay = $5
       WHERE id = $1
       RETURNING *`,
      [id, fields.baseSalary, fields.bonuses, fields.deductions, fields.netPay]
    );
    return mapRow(result.rows[0]);
  },
};
