import type {
  SignupRequest,
  LoginRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  AuthResponse,
  User,
} from '@shared/types';
import { request, setAuthToken } from './client';

export async function signup(data: SignupRequest): Promise<{ user: User }> {
  return request<{ user: User }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
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
  return request<{ message: string }>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function resendVerification(data: ResendVerificationRequest): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
