import { PayrollRepository } from '../repositories/payroll.repository';
import { AppError } from '../auth/errors/AppError';
import type { Payroll, UpdatePayrollRequest } from '../../../shared/types';

/** BR-6: base salary, bonuses, deductions, and net pay must all be non-negative. */
function assertNonNegative(field: string, value: number | undefined): void {
  if (value !== undefined && (typeof value !== 'number' || isNaN(value) || value < 0)) {
    throw new AppError('VALIDATION_ERROR', 'Payroll values must be non-negative', 400, [
      { field, message: 'Must be a number >= 0' },
    ]);
  }
}

export const PayrollService = {
  async getMine(employeeId: string): Promise<Payroll[]> {
    return PayrollRepository.findByEmployee(employeeId);
  },

  async getForEmployee(employeeId: string): Promise<Payroll[]> {
    return PayrollRepository.findByEmployee(employeeId);
  },

  /** Updates the most recent payroll record for the employee; recomputes netPay. */
  async update(employeeId: string, dto: UpdatePayrollRequest): Promise<Payroll> {
    assertNonNegative('baseSalary', dto.baseSalary);
    assertNonNegative('bonuses', dto.bonuses);
    assertNonNegative('deductions', dto.deductions);

    const latest = await PayrollRepository.findLatestByEmployee(employeeId);
    if (!latest) {
      throw new AppError('NOT_FOUND', 'No payroll record found for this employee', 404);
    }

    const baseSalary = dto.baseSalary ?? latest.baseSalary;
    const bonuses = dto.bonuses ?? latest.bonuses;
    const deductions = dto.deductions ?? latest.deductions;
    const netPay = baseSalary + bonuses - deductions;

    if (netPay < 0) {
      throw new AppError('VALIDATION_ERROR', 'Resulting net pay cannot be negative', 400, [
        { field: 'deductions', message: 'Deductions exceed base salary plus bonuses' },
      ]);
    }

    return PayrollRepository.updateById(latest.id, { baseSalary, bonuses, deductions, netPay });
  },
};
