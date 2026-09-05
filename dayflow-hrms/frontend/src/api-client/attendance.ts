import type {
  Attendance,
  CheckInRequest,
  CheckOutRequest,
  Paginated,
} from '@shared/types';
import { request } from './client';

export async function checkIn(data?: CheckInRequest): Promise<Attendance> {
  return request<Attendance>('/attendance/check-in', {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

export async function checkOut(data?: CheckOutRequest): Promise<Attendance> {
  return request<Attendance>('/attendance/check-out', {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

export async function getMyAttendance(params?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}): Promise<Paginated<Attendance>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return request<Paginated<Attendance>>(`/attendance/me${queryString}`);
}

export async function getAllAttendance(params?: {
  page?: number;
  limit?: number;
  employeeId?: string;
  date?: string;
}): Promise<Paginated<Attendance>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.employeeId) query.set('employeeId', params.employeeId);
  if (params?.date) query.set('date', params.date);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return request<Paginated<Attendance>>(`/attendance${queryString}`);
}
