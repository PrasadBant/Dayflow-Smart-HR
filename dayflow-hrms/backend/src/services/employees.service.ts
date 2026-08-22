import { EmployeesRepository, EmployeeUpdateFields } from '../repositories/employees.repository';
import { DepartmentsRepository } from '../repositories/departments.repository';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { LeaveRepository } from '../repositories/leave.repository';
import { AppError } from '../auth/errors/AppError';
import type {
  Employee,
  UpdateProfileRequest,
  ActivityItem,
  EmployeeContext,
  Paginated,
} from '../../../shared/types';

/** CONTRACT.md §7.3: employee self-edit is limited to these three fields. */
const SELF_EDITABLE_FIELDS = ['address', 'phone', 'profilePictureUrl'] as const;

function pickSelfEditable(dto: UpdateProfileRequest): EmployeeUpdateFields {
  const fields: EmployeeUpdateFields = {};
  for (const key of SELF_EDITABLE_FIELDS) {
    if (dto[key] !== undefined) fields[key] = dto[key];
  }
  return fields;
}

export const EmployeesService = {
  async getMe(employeeId: string): Promise<Employee> {
    const employee = await EmployeesRepository.findById(employeeId);
    if (!employee) throw new AppError('NOT_FOUND', 'Employee profile not found', 404);
    return employee;
  },

  /** Employee self-update — only address/phone/profilePictureUrl may be touched. */
  async updateMe(employeeId: string, dto: UpdateProfileRequest): Promise<Employee> {
    const fields = pickSelfEditable(dto);
    if (Object.keys(fields).length === 0) {
      throw new AppError('VALIDATION_ERROR', 'At least one editable field is required', 400, [
        { field: 'body', message: 'Provide address, phone, and/or profilePictureUrl' },
      ]);
    }
    const updated = await EmployeesRepository.updateProfile(employeeId, fields);
    if (!updated) throw new AppError('NOT_FOUND', 'Employee profile not found', 404);
    return updated;
  },

  async list(page: number, pageSize: number): Promise<Paginated<Employee>> {
    return EmployeesRepository.list(page, pageSize);
  },

  /** HR full-profile update — all fields allowed, including department/position. */
  async updateById(id: string, dto: UpdateProfileRequest): Promise<Employee> {
    const fields: EmployeeUpdateFields = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      position: dto.position,
      phone: dto.phone,
      address: dto.address,
      profilePictureUrl: dto.profilePictureUrl,
    };

    if (dto.departmentId !== undefined) {
      const department = await DepartmentsRepository.findById(dto.departmentId);
      if (!department) {
        throw new AppError('NOT_FOUND', 'Department not found', 404, [
          { field: 'departmentId', message: 'No department exists with this id' },
        ]);
      }
      fields.departmentId = dto.departmentId;
      fields.departmentName = department.name; // keep denormalized column in sync
    }

    const hasAnyField = Object.values(fields).some((v) => v !== undefined);
    if (!hasAnyField) {
      throw new AppError('VALIDATION_ERROR', 'At least one field is required', 400);
    }

    const updated = await EmployeesRepository.updateProfile(id, fields);
    if (!updated) throw new AppError('NOT_FOUND', 'Employee not found', 404);
    return updated;
  },

  async recentActivity(employeeId: string): Promise<ActivityItem[]> {
    return EmployeesRepository.findRecentActivity(employeeId, 10);
  },

  /** HR employee switcher: full context in one call. */
  async switchContext(employeeId: string): Promise<EmployeeContext> {
    const employee = await EmployeesRepository.findById(employeeId);
    if (!employee) throw new AppError('NOT_FOUND', 'Employee not found', 404);

    const [attendance, leaveRequests] = await Promise.all([
      AttendanceRepository.findRecentByEmployee(employeeId, 7),
      LeaveRepository.findRecentByEmployee(employeeId, 20),
    ]);

    return { employee, attendance, leaveRequests };
  },
};
