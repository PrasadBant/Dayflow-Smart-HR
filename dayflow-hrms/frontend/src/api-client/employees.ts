import type {
  Employee,
  UpdateProfileRequest,
  Paginated,
  ActivityItem,
  EmployeeContext,
} from '@shared/types';
import { request, mockDelay, USE_MOCKS } from './client';

export const mockEmployee: Employee = {
  id: 'emp-101-uuid-mock',
  userId: 'usr-101-uuid-mock',
  employeeCode: 'EMP001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'employee@dayflow.com',
  departmentId: 'dept-eng-001',
  departmentName: 'Engineering',
  position: 'Senior Software Engineer',
  phone: '+1-555-0199',
  address: '123 Tech Boulevard, Innovation City',
  profilePictureUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
  hireDate: '2023-01-15',
  createdAt: '2023-01-15T09:00:00Z',
  updatedAt: '2026-01-10T12:00:00Z',
};

const mockEmployeeList: Employee[] = [
  mockEmployee,
  {
    id: 'emp-102-uuid-mock',
    userId: 'usr-102-uuid-mock',
    employeeCode: 'EMP002',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@dayflow.com',
    departmentId: 'dept-hr-001',
    departmentName: 'Human Resources',
    position: 'HR Specialist',
    phone: '+1-555-0288',
    address: '456 Corporate Way, Business Town',
    profilePictureUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    hireDate: '2023-03-01',
    createdAt: '2023-03-01T09:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  },
];

const mockActivityItems: ActivityItem[] = [
  {
    id: 'act-001',
    employeeId: 'emp-101-uuid-mock',
    action: 'CHECK_IN',
    details: 'Checked in at 09:02 AM',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'act-002',
    employeeId: 'emp-101-uuid-mock',
    action: 'LEAVE_SUBMITTED',
    details: 'Submitted Paid Leave request for 2 days',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
];

export async function getProfile(): Promise<Employee> {
  if (USE_MOCKS) {
    return mockDelay(mockEmployee);
  }
  return request<Employee>('/employees/me');
}

export async function updateMyProfile(data: UpdateProfileRequest): Promise<Employee> {
  if (USE_MOCKS) {
    const updated = {
      ...mockEmployee,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return mockDelay(updated);
  }
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
  if (USE_MOCKS) {
    let filtered = [...mockEmployeeList];
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.firstName.toLowerCase().includes(q) ||
          e.lastName.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q)
      );
    }
    if (params?.departmentId) {
      filtered = filtered.filter((e) => e.departmentId === params.departmentId);
    }
    return mockDelay({
      items: filtered,
      total: filtered.length,
    });
  }

  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.search) query.set('search', params.search);
  if (params?.departmentId) query.set('departmentId', params.departmentId);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return request<Paginated<Employee>>(`/employees${queryString}`);
}

export async function updateEmployee(id: string, data: UpdateProfileRequest): Promise<Employee> {
  if (USE_MOCKS) {
    const existing = mockEmployeeList.find((e) => e.id === id) || mockEmployee;
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return mockDelay(updated);
  }
  return request<Employee>(`/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getRecentActivity(): Promise<ActivityItem[]> {
  if (USE_MOCKS) {
    return mockDelay(mockActivityItems);
  }
  return request<ActivityItem[]>('/employees/recent-activity');
}

export async function switchEmployeeContext(id: string): Promise<EmployeeContext> {
  if (USE_MOCKS) {
    const emp = mockEmployeeList.find((e) => e.id === id) || mockEmployee;
    const context: EmployeeContext = {
      employee: emp,
      attendance: [
        {
          id: 'att-mock-01',
          employeeId: emp.id,
          attDate: new Date().toISOString().split('T')[0],
          checkIn: '2026-08-22T09:00:00Z',
          checkOut: '2026-08-22T17:00:00Z',
          status: 'Present',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      leaveRequests: [
        {
          id: 'lvr-mock-01',
          employeeId: emp.id,
          leaveType: 'Paid',
          startDate: '2026-09-01',
          endDate: '2026-09-03',
          reason: 'Vacation',
          status: 'Approved',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      payroll: [
        {
          id: 'pay-mock-01',
          employeeId: emp.id,
          payPeriodStart: '2026-08-01',
          payPeriodEnd: '2026-08-31',
          baseSalary: 5000,
          bonuses: 500,
          deductions: 200,
          netPay: 5300,
          currency: 'USD',
          status: 'Paid',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      documents: [
        {
          id: 'doc-mock-01',
          employeeId: emp.id,
          title: 'Employment Contract',
          documentType: 'Contract',
          fileUrl: 'https://example.com/docs/contract.pdf',
          uploadedBy: 'HR001',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };
    return mockDelay(context);
  }
  return request<EmployeeContext>(`/employees/switch-context/${id}`);
}
