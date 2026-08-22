import { DocumentsRepository } from '../repositories/documents.repository';
import { AppError } from '../auth/errors/AppError';
import type { Document, CreateDocumentMetadataRequest, Role } from '../../../shared/types';

export const DocumentsService = {
  async getMine(employeeId: string): Promise<Document[]> {
    return DocumentsRepository.findByEmployee(employeeId);
  },

  async getForEmployee(employeeId: string): Promise<Document[]> {
    return DocumentsRepository.findByEmployee(employeeId);
  },

  /**
   * Metadata-only document creation.
   * Employee role: forced to their own employeeId (any employeeId in the body is ignored).
   * HR role: may upload on behalf of any employeeId; defaults to their own if omitted.
   */
  async create(
    requesterEmployeeId: string,
    requesterRole: Role,
    dto: CreateDocumentMetadataRequest
  ): Promise<Document> {
    if (!dto.title?.trim() || !dto.documentType?.trim() || !dto.fileUrl?.trim()) {
      throw new AppError('VALIDATION_ERROR', 'title, documentType, and fileUrl are required', 400);
    }

    const targetEmployeeId =
      requesterRole === 'HR' && dto.employeeId ? dto.employeeId : requesterEmployeeId;

    return DocumentsRepository.create({
      employeeId: targetEmployeeId,
      title: dto.title,
      documentType: dto.documentType,
      fileUrl: dto.fileUrl,
      uploadedBy: requesterEmployeeId,
    });
  },
};
