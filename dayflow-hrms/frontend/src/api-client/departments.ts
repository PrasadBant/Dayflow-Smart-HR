import type { Department } from '@shared/types';
import { request, mockDelay, USE_MOCKS } from './client';

const mockDepartments: Department[] = [
  {
    id: 'dept-eng-001',
    name: 'Engineering',
    code: 'ENG',
    managerId: 'emp-101-uuid-mock',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    id: 'dept-hr-001',
    name: 'Human Resources',
    code: 'HR',
    managerId: 'emp-102-uuid-mock',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    id: 'dept-fin-001',
    name: 'Finance',
    code: 'FIN',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    id: 'dept-sales-001',
    name: 'Sales & Marketing',
    code: 'SLS',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
];

export async function getDepartments(): Promise<Department[]> {
  if (USE_MOCKS) {
    return mockDelay(mockDepartments);
  }
  return request<Department[]>('/departments');
}
