import type {
  Attendance,
  CheckInRequest,
  CheckOutRequest,
  Paginated,
} from '../../../../shared/types';
import { request, mockDelay, USE_MOCKS } from './client';

const mockAttendanceRecords: Attendance[] = [
  {
    id: 'att-101-uuid-mock',
    employeeId: 'emp-101-uuid-mock',
    attDate: new Date().toISOString().split('T')[0],
    checkIn: '2026-08-22T08:58:00Z',
    checkOut: '2026-08-22T17:05:00Z',
    status: 'Present',
    createdAt: '2026-08-22T08:58:00Z',
    updatedAt: '2026-08-22T17:05:00Z',
  },
  {
    id: 'att-100-uuid-mock',
    employeeId: 'emp-101-uuid-mock',
    attDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    checkIn: '2026-08-21T09:02:00Z',
    checkOut: '2026-08-21T17:00:00Z',
    status: 'Present',
    createdAt: '2026-08-21T09:02:00Z',
    updatedAt: '2026-08-21T17:00:00Z',
  },
];

/**
 * Phase D3: Real network call to POST /api/attendance/check-in
 */
export async function checkIn(data?: CheckInRequest): Promise<Attendance> {
  return request<Attendance>('/api/attendance/check-in', {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

/**
 * Phase D3: Real network call to POST /api/attendance/check-out
 */
export async function checkOut(data?: CheckOutRequest): Promise<Attendance> {
  return request<Attendance>('/api/attendance/check-out', {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

/**
 * Phase D3: Real network call to GET /api/attendance/me
 */
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
  return request<Paginated<Attendance>>(`/api/attendance/me${queryString}`);
}

export async function getAllAttendance(params?: {
  page?: number;
  limit?: number;
  employeeId?: string;
  date?: string;
}): Promise<Paginated<Attendance>> {
  if (USE_MOCKS) {
    let filtered = [...mockAttendanceRecords];
    if (params?.employeeId) {
      filtered = filtered.filter((a) => a.employeeId === params.employeeId);
    }
    if (params?.date) {
      filtered = filtered.filter((a) => a.attDate === params.date);
    }
    return mockDelay({
      items: filtered,
      total: filtered.length,
    });
  }

  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.employeeId) query.set('employeeId', params.employeeId);
  if (params?.date) query.set('date', params.date);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return request<Paginated<Attendance>>(`/api/attendance${queryString}`);
}
