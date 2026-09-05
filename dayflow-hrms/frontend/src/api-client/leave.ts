import type {
  LeaveRequest,
  CreateLeaveRequest,
  DecideLeaveRequest,
  Paginated,
  LeaveStatus,
} from '@shared/types';
import { request } from './client';

export async function createLeaveRequest(data: CreateLeaveRequest): Promise<LeaveRequest> {
  return request<LeaveRequest>('/leave-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMyLeaveRequests(params?: {
  page?: number;
  limit?: number;
  status?: LeaveStatus;
}): Promise<Paginated<LeaveRequest>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.status) query.set('status', params.status);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return request<Paginated<LeaveRequest>>(`/leave-requests/me${queryString}`);
}

export async function getAllLeaveRequests(params?: {
  page?: number;
  limit?: number;
  status?: LeaveStatus;
  employeeId?: string;
}): Promise<Paginated<LeaveRequest>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.status) query.set('status', params.status);
  if (params?.employeeId) query.set('employeeId', params.employeeId);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return request<Paginated<LeaveRequest>>(`/leave-requests${queryString}`);
}

export async function decideLeaveRequest(id: string, data: DecideLeaveRequest): Promise<LeaveRequest> {
  return request<LeaveRequest>(`/leave-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
