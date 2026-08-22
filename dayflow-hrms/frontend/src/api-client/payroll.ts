import type { Payroll, UpdatePayrollRequest } from '../../../../shared/types';
import { request, mockDelay, USE_MOCKS } from './client';

const mockPayrollRecords: Payroll[] = [
  {
    id: 'pay-101-uuid-mock',
    employeeId: 'emp-101-uuid-mock',
    payPeriodStart: '2026-08-01',
    payPeriodEnd: '2026-08-31',
    baseSalary: 6500,
    bonuses: 500,
    deductions: 300,
    netPay: 6700,
    currency: 'USD',
    status: 'Paid',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'pay-100-uuid-mock',
    employeeId: 'emp-101-uuid-mock',
    payPeriodStart: '2026-07-01',
    payPeriodEnd: '2026-07-31',
    baseSalary: 6500,
    bonuses: 0,
    deductions: 300,
    netPay: 6200,
    currency: 'USD',
    status: 'Paid',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  },
];

export async function getMyPayroll(): Promise<Payroll[]> {
  if (USE_MOCKS) {
    return mockDelay(mockPayrollRecords);
  }
  return request<Payroll[]>('/api/payroll/me');
}

export async function getEmployeePayroll(employeeId: string): Promise<Payroll[]> {
  if (USE_MOCKS) {
    const filtered = mockPayrollRecords.filter((p) => p.employeeId === employeeId);
    return mockDelay(filtered.length ? filtered : mockPayrollRecords);
  }
  return request<Payroll[]>(`/api/payroll/${employeeId}`);
}

export async function updatePayroll(employeeId: string, data: UpdatePayrollRequest): Promise<Payroll> {
  if (USE_MOCKS) {
    const existing = mockPayrollRecords.find((p) => p.employeeId === employeeId) || mockPayrollRecords[0];
    const baseSalary = data.baseSalary ?? existing.baseSalary;
    const bonuses = data.bonuses ?? existing.bonuses;
    const deductions = data.deductions ?? existing.deductions;
    const netPay = Math.max(0, baseSalary + bonuses - deductions);

    const updated: Payroll = {
      ...existing,
      baseSalary,
      bonuses,
      deductions,
      netPay,
      updatedAt: new Date().toISOString(),
    };
    return mockDelay(updated);
  }

  return request<Payroll>(`/api/payroll/${employeeId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
