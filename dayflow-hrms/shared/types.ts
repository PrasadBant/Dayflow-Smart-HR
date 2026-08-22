/**
 * Shared Type Definitions for Dayflow HRMS
 * 
 * NAMING CONVENTION NOTE:
 * - `id`: Primary key of an entity (string/UUID).
 * - `employeeCode`: Unique human-readable code assigned to an employee (e.g. "EMP001").
 * - `employeeId`: Foreign key reference pointing to Employee.id.
 * 
 * All fields use camelCase.
 */

// User Roles
export type Role = 'EMPLOYEE' | 'HR';

// Leave System Enums
export type LeaveType = 'Paid' | 'Sick' | 'Unpaid';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

// Attendance System Enums
export type AttendanceStatus = 'Present' | 'Absent' | 'HalfDay' | 'Leave';

// Base User Interface
export interface User {
  id: string;
  email: string;
  role: Role;
  employeeCode?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Department Entity
export interface Department {
  id: string;
  name: string;
  code: string;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
}

// Default Department & Position for initial self-registration signup
export const DEFAULT_UNASSIGNED_DEPARTMENT = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'Unassigned',
  code: 'DEPT-UNASSIGNED',
} as const;

export const DEFAULT_EMPLOYEE_POSITION = 'Employee';


// Employee Entity
export interface Employee {
  id: string;
  userId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string;
  departmentName: string;
  position: string;
  phone?: string;
  address?: string;
  profilePictureUrl?: string;
  hireDate: string;
  createdAt: string;
  updatedAt: string;
}

// Attendance Entity
export interface Attendance {
  id: string;
  employeeId: string;
  attDate: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  createdAt: string;
  updatedAt: string;
}

// Leave Request Entity
export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  decidedBy?: string;
  decidedAt?: string;
  decisionComments?: string;
  createdAt: string;
  updatedAt: string;
}

// Payroll Entity
export interface Payroll {
  id: string;
  employeeId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Document Entity
export interface Document {
  id: string;
  employeeId: string;
  title: string;
  documentType: string;
  fileUrl: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

// Activity Item Entity
export interface ActivityItem {
  id: string;
  employeeId: string;
  action: string;
  details?: string;
  timestamp: string;
}

// Employee Context (for HR switcher / detailed view)
export interface EmployeeContext {
  employee: Employee;
  attendance: Attendance[];
  leaveRequests: LeaveRequest[];
  payroll?: Payroll[];
  documents?: Document[];
}

// Paginated Response Wrapper
export interface Paginated<T> {
  items: T[];
  total: number;
}

// Authentication DTOs & Responses
export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * Signup Request DTO
 * STRICT RULE: SignupRequest MUST NOT contain a `role` field.
 * Public registration automatically assigns the EMPLOYEE role on the backend.
 */
export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  employeeCode?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface UpdateProfileRequest {
  address?: string;
  phone?: string;
  profilePictureUrl?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  departmentId?: string;
}

export interface CreateLeaveRequest {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface DecideLeaveRequest {
  status: 'Approved' | 'Rejected';
  decisionComments?: string;
}

export interface CheckInRequest {
  timestamp?: string;
}

export interface CheckOutRequest {
  timestamp?: string;
}

export interface UpdatePayrollRequest {
  baseSalary?: number;
  bonuses?: number;
  deductions?: number;
}

export interface CreateDocumentMetadataRequest {
  title: string;
  documentType: string;
  fileUrl: string;
  employeeId?: string;
}

// Error Standard Shapes & Codes
export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'LEAVE_OVERLAP'
  | 'EMAIL_TAKEN'
  | 'EMAIL_NOT_VERIFIED'
  | 'ALREADY_CHECKED_IN'
  | 'NOT_CHECKED_IN'
  | 'INTERNAL_ERROR';

export interface ApiErrorDetail {
  field?: string;
  message: string;
  [key: string]: unknown;
}

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details?: ApiErrorDetail[] | Record<string, unknown>;
}

export interface ApiError {
  error: ApiErrorBody;
}
