import React, { useState, useEffect, useCallback } from 'react';
import { FolderOpen, PlusCircle, ExternalLink, FileText } from 'lucide-react';
import { PageHeader } from '../components/primitives/PageHeader';
import { Card } from '../components/primitives/Card';
import { FormField, Input, Select } from '../components/primitives/FormField';
import { Button } from '../components/primitives/Button';
import { Skeleton } from '../components/primitives/Skeleton';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import { EmptyState } from '../components/primitives/EmptyState';
import { useToast } from '../components/primitives/Toast';
import type { Document } from '@shared/types';
import { getMyDocuments, createDocumentMetadata } from '../api-client/documents';
import { parseApiError } from '../utils/apiHelper';

const DOCUMENT_TYPES = ['Contract', 'ID', 'Tax', 'Certification', 'Other'];

export const DocumentsPage: React.FC = () => {
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [fileUrl, setFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setDocuments(await getMyDocuments());
    } catch (err) {
      setLoadError(parseApiError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !fileUrl.trim()) {
      setFormError('Title and file URL are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createDocumentMetadata({ title: title.trim(), documentType, fileUrl: fileUrl.trim() });
      setTitle('');
      setFileUrl('');
      showToast('Document added.', 'success');
      await load();
    } catch (err) {
      setFormError(parseApiError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <PageHeader title="Documents" description="Employment records referenced by link — metadata only, no file upload." icon={<FolderOpen size={20} color="var(--color-primary-600)" />} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-xl)', alignItems: 'start' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-md)' }}>
            <PlusCircle size={18} color="var(--color-primary-600)" />
            <h2 style={{ font: 'var(--font-section-title)' }}>Add a document</h2>
          </div>
          {formError && <ErrorBanner variant="error" message={formError} />}
          <form onSubmit={handleSubmit}>
            <FormField label="Title" required htmlFor="doc-title">
              <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Employment contract" required />
            </FormField>
            <FormField label="Document type" required htmlFor="doc-type">
              <Select id="doc-type" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="File URL" required helperText="Link to the document — this stores a reference only, it doesn't upload a file" htmlFor="doc-url">
              <Input id="doc-url" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://…" required />
            </FormField>
            <Button type="submit" variant="primary" isLoading={isSubmitting} style={{ width: '100%' }}>
              Add document
            </Button>
          </form>
        </Card>

        <Card padding="none">
          <div style={{ padding: 'var(--space-lg) var(--space-lg) var(--space-md)' }}>
            <h2 style={{ font: 'var(--font-section-title)' }}>Your documents</h2>
          </div>

          {loadError && <div style={{ padding: '0 var(--space-lg)' }}><ErrorBanner variant="error" message={loadError} onRetry={load} /></div>}

          {isLoading ? (
            <div style={{ padding: '0 var(--space-lg) var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <Skeleton height="52px" />
              <Skeleton height="52px" />
            </div>
          ) : documents.length === 0 ? (
            <EmptyState icon={<FileText size={22} />} title="No documents yet" description="Add a reference using the form to get started." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {documents.map((d, i) => (
                <a
                  key={d.id}
                  href={d.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                    padding: 'var(--space-sm) var(--space-lg)',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', minWidth: 0 }}>
                    <FileText size={16} color="var(--text-tertiary-color)" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ font: 'var(--font-body)', fontWeight: 600, color: 'var(--text-primary-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                      <div style={{ font: 'var(--font-body-sm)', color: 'var(--text-tertiary-color)' }}>{d.documentType}</div>
                    </div>
                  </div>
                  <ExternalLink size={15} color="var(--text-tertiary-color)" style={{ flexShrink: 0 }} />
                </a>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
