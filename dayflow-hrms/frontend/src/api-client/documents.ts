import type { Document, CreateDocumentMetadataRequest } from '@shared/types';
import { request } from './client';

export async function getMyDocuments(): Promise<Document[]> {
  return request<Document[]>('/documents/me');
}

export async function getEmployeeDocuments(employeeId: string): Promise<Document[]> {
  return request<Document[]>(`/documents/${employeeId}`);
}

export async function createDocumentMetadata(data: CreateDocumentMetadataRequest): Promise<Document> {
  return request<Document>('/documents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
