import { query } from '../config/db';
import { toTimestampString } from './date.util';
import type { Document } from '../../../shared/types';

interface DocumentRow {
  id: string;
  employee_id: string;
  title: string;
  document_type: string;
  file_url: string;
  uploaded_by: string;
  created_at: string | Date;
  updated_at: string | Date;
}

function mapRow(row: DocumentRow): Document {
  return {
    id: row.id,
    employeeId: row.employee_id,
    title: row.title,
    documentType: row.document_type,
    fileUrl: row.file_url,
    uploadedBy: row.uploaded_by,
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
  };
}

export interface CreateDocumentInput {
  employeeId: string;
  title: string;
  documentType: string;
  fileUrl: string;
  uploadedBy: string;
}

export const DocumentsRepository = {
  async findByEmployee(employeeId: string): Promise<Document[]> {
    const result = await query(
      `SELECT * FROM documents WHERE employee_id = $1 ORDER BY created_at DESC`,
      [employeeId]
    );
    return result.rows.map(mapRow);
  },

  async create(input: CreateDocumentInput): Promise<Document> {
    const result = await query(
      `INSERT INTO documents (employee_id, title, document_type, file_url, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.employeeId, input.title, input.documentType, input.fileUrl, input.uploadedBy]
    );
    return mapRow(result.rows[0]);
  },
};
