import { query } from '../config/db';
import { toTimestampString } from './date.util';
import type { Department } from '../../../shared/types';

interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  manager_id: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

function mapRow(row: DepartmentRow): Department {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    managerId: row.manager_id ?? undefined,
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
  };
}

export const DepartmentsRepository = {
  async findAll(): Promise<Department[]> {
    const result = await query(`SELECT * FROM departments ORDER BY name ASC`);
    return result.rows.map(mapRow);
  },

  async findById(id: string): Promise<Department | null> {
    const result = await query(`SELECT * FROM departments WHERE id = $1`, [id]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  },
};
