import { DepartmentsRepository } from '../repositories/departments.repository';
import type { Department } from '../../../shared/types';

export const DepartmentsService = {
  async list(): Promise<Department[]> {
    return DepartmentsRepository.findAll();
  },
};
