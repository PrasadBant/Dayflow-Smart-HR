import type {
  SignupRequest,
  LoginRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  AuthResponse,
  User,
} from '@shared/types';
import { request, mockDelay, USE_MOCKS, setAuthToken } from './client';

const mockUser: User = {
  id: 'usr-101-uuid-mock',
  email: 'employee@dayflow.com',
  role: 'EMPLOYEE',
  employeeCode: 'EMP001',
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockHrUser: User = {
  id: 'usr-hr-001-uuid-mock',
  email: 'hr@dayflow.com',
  role: 'HR',
  employeeCode: 'HR001',
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function signup(data: SignupRequest): Promise<{ user: User }> {
  if (USE_MOCKS) {
    const newUser: User = {
      id: `usr-${Date.now()}-mock`,
      email: data.email,
      role: 'EMPLOYEE', // Strictly forced to EMPLOYEE per BR-2 / CONTRACT.md
      employeeCode: data.employeeCode || `EMP${Math.floor(100 + Math.random() * 900)}`,
      emailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return mockDelay({ user: newUser });
  }

  return request<{ user: User }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  if (USE_MOCKS) {
    const isHr = data.email.toLowerCase().includes('hr');
    const user = isHr ? mockHrUser : mockUser;
    const token = `mock-jwt-token-${user.role.toLowerCase()}-${Date.now()}`;
    setAuthToken(token);
    return mockDelay({ token, user });
  }

  const response = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (response.token) {
    setAuthToken(response.token);
  }
  return response;
}

export async function verifyEmail(data: VerifyEmailRequest): Promise<{ message: string }> {
  if (USE_MOCKS) {
    return mockDelay({ message: 'Email verified successfully' });
  }

  return request<{ message: string }>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function resendVerification(data: ResendVerificationRequest): Promise<{ message: string }> {
  if (USE_MOCKS) {
    return mockDelay({ message: 'Verification email sent' });
  }

  return request<{ message: string }>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
