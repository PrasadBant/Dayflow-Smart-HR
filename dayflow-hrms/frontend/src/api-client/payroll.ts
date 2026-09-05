import type { Payroll, UpdatePayrollRequest } from '@shared/types';
import { request } from './client';

export async function getMyPayroll(): Promise<Payroll[]> {
  return request<Payroll[]>('/payroll/me');
}

export async function getEmployeePayroll(employeeId: string): Promise<Payroll[]> {
  return request<Payroll[]>(`/payroll/${employeeId}`);
}

export async function updatePayroll(employeeId: string, data: UpdatePayrollRequest): Promise<Payroll> {
  return request<Payroll>(`/payroll/${employeeId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
