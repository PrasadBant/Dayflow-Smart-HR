import type { Document, CreateDocumentMetadataRequest } from '../../../../shared/types';
import { request, mockDelay, USE_MOCKS } from './client';

const mockDocuments: Document[] = [
  {
    id: 'doc-101-uuid-mock',
    employeeId: 'emp-101-uuid-mock',
    title: 'Employment Offer Letter',
    documentType: 'Contract',
    fileUrl: 'https://example.com/docs/offer_letter.pdf',
    uploadedBy: 'usr-hr-001-uuid-mock',
    createdAt: '2023-01-15T09:00:00Z',
    updatedAt: '2023-01-15T09:00:00Z',
  },
  {
    id: 'doc-102-uuid-mock',
    employeeId: 'emp-101-uuid-mock',
    title: 'Tax Declaration 2026',
    documentType: 'Tax',
    fileUrl: 'https://example.com/docs/tax_2026.pdf',
    uploadedBy: 'usr-101-uuid-mock',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
];

export async function getMyDocuments(): Promise<Document[]> {
  if (USE_MOCKS) {
    return mockDelay(mockDocuments);
  }
  return request<Document[]>('/api/documents/me');
}

export async function getEmployeeDocuments(employeeId: string): Promise<Document[]> {
  if (USE_MOCKS) {
    const filtered = mockDocuments.filter((d) => d.employeeId === employeeId);
    return mockDelay(filtered.length ? filtered : mockDocuments);
  }
  return request<Document[]>(`/api/documents/${employeeId}`);
}

export async function createDocumentMetadata(data: CreateDocumentMetadataRequest): Promise<Document> {
  if (USE_MOCKS) {
    const newDoc: Document = {
      id: `doc-${Date.now()}-mock`,
      employeeId: data.employeeId || 'emp-101-uuid-mock',
      title: data.title,
      documentType: data.documentType,
      fileUrl: data.fileUrl,
      uploadedBy: 'usr-101-uuid-mock',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return mockDelay(newDoc);
  }

  return request<Document>('/api/documents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
