import type {
  Employee,
  UpdateProfileRequest,
  Paginated,
  ActivityItem,
  EmployeeContext,
} from '@shared/types';
import { request } from './client';

export async function getProfile(): Promise<Employee> {
  return request<Employee>('/employees/me');
}

export async function updateMyProfile(data: UpdateProfileRequest): Promise<Employee> {
  return request<Employee>('/employees/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getEmployees(params?: {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
}): Promise<Paginated<Employee>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.search) query.set('search', params.search);
  if (params?.departmentId) query.set('departmentId', params.departmentId);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return request<Paginated<Employee>>(`/employees${queryString}`);
}

export async function updateEmployee(id: string, data: UpdateProfileRequest): Promise<Employee> {
  return request<Employee>(`/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getRecentActivity(): Promise<ActivityItem[]> {
  return request<ActivityItem[]>('/employees/recent-activity');
}

export async function switchEmployeeContext(id: string): Promise<EmployeeContext> {
  return request<EmployeeContext>(`/employees/switch-context/${id}`);
}
