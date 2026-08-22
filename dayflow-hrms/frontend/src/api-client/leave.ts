import type {
  LeaveRequest,
  CreateLeaveRequest,
  DecideLeaveRequest,
  Paginated,
  LeaveStatus,
} from '../../../../shared/types';
import { request, mockDelay, USE_MOCKS } from './client';

const mockLeaveRequests: LeaveRequest[] = [
  {
    id: 'lvr-101-uuid-mock',
    employeeId: 'emp-101-uuid-mock',
    leaveType: 'Paid',
    startDate: '2026-09-01',
    endDate: '2026-09-03',
    reason: 'Annual family vacation',
    status: 'Approved',
    decidedBy: 'emp-102-uuid-mock',
    decidedAt: '2026-08-20T14:30:00Z',
    decisionComments: 'Approved. Enjoy your time off!',
    createdAt: '2026-08-19T10:00:00Z',
    updatedAt: '2026-08-20T14:30:00Z',
  },
  {
    id: 'lvr-102-uuid-mock',
    employeeId: 'emp-101-uuid-mock',
    leaveType: 'Sick',
    startDate: '2026-09-15',
    endDate: '2026-09-15',
    reason: 'Medical checkup',
    status: 'Pending',
    createdAt: '2026-08-21T08:00:00Z',
    updatedAt: '2026-08-21T08:00:00Z',
  },
];

/**
 * Phase D2: Real network call to POST /api/leave-requests
 */
export async function createLeaveRequest(data: CreateLeaveRequest): Promise<LeaveRequest> {
  return request<LeaveRequest>('/api/leave-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Phase D2: Real network call to GET /api/leave-requests/me
 */
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
  return request<Paginated<LeaveRequest>>(`/api/leave-requests/me${queryString}`);
}

export async function getAllLeaveRequests(params?: {
  page?: number;
  limit?: number;
  status?: LeaveStatus;
  employeeId?: string;
}): Promise<Paginated<LeaveRequest>> {
  if (USE_MOCKS) {
    let filtered = [...mockLeaveRequests];
    if (params?.status) {
      filtered = filtered.filter((r) => r.status === params.status);
    }
    if (params?.employeeId) {
      filtered = filtered.filter((r) => r.employeeId === params.employeeId);
    }
    return mockDelay({
      items: filtered,
      total: filtered.length,
    });
  }

  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.status) query.set('status', params.status);
  if (params?.employeeId) query.set('employeeId', params.employeeId);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return request<Paginated<LeaveRequest>>(`/api/leave-requests${queryString}`);
}

export async function decideLeaveRequest(id: string, data: DecideLeaveRequest): Promise<LeaveRequest> {
  if (USE_MOCKS) {
    const existing = mockLeaveRequests.find((r) => r.id === id) || mockLeaveRequests[0];
    const updated: LeaveRequest = {
      ...existing,
      status: data.status,
      decidedBy: 'emp-102-uuid-mock',
      decidedAt: new Date().toISOString(),
      decisionComments: data.decisionComments,
      updatedAt: new Date().toISOString(),
    };
    return mockDelay(updated);
  }

  return request<LeaveRequest>(`/api/leave-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
