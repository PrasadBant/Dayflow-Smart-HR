import type { Department } from '@shared/types';
import { request } from './client';

export async function getDepartments(): Promise<Department[]> {
  return request<Department[]>('/departments');
}
