import React, { useState, useEffect, useCallback } from 'react';
import { FolderOpen, PlusCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/primitives/Card';
import { FormField, Input, Select } from '../components/primitives/FormField';
import { Button } from '../components/primitives/Button';
import { Skeleton } from '../components/primitives/Skeleton';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import type { Document } from '@shared/types';
import { getMyDocuments, createDocumentMetadata } from '../api-client/documents';
import { parseApiError } from '../utils/apiHelper';

const DOCUMENT_TYPES = ['Contract', 'ID', 'Tax', 'Certification', 'Other'];

export const DocumentsPage: React.FC = () => {
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
      const res = await getMyDocuments();
      setDocuments(res);
    } catch (err) {
      setLoadError(parseApiError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      await load();
    } catch (err) {
      setFormError(parseApiError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-xl)', alignItems: 'start' }}>
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={20} color="var(--color-primary-600)" />
            <CardTitle>Add Document Metadata</CardTitle>
          </div>
          <CardDescription>Record a document reference (metadata only — no file upload)</CardDescription>
        </CardHeader>
        <CardContent>
          {formError && <ErrorBanner variant="error" message={formError} />}
          <form onSubmit={handleSubmit}>
            <FormField label="Title" required htmlFor="doc-title">
              <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Employment Contract" required />
            </FormField>
            <FormField label="Document Type" required htmlFor="doc-type">
              <Select id="doc-type" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="File URL" required helperText="Link to the document (metadata only, not uploaded here)" htmlFor="doc-url">
              <Input id="doc-url" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." required />
            </FormField>
            <Button type="submit" variant="primary" isLoading={isSubmitting} style={{ width: '100%' }}>
              Add Document
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FolderOpen size={20} color="var(--color-primary-500)" />
            <CardTitle>My Documents</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={load} leftIcon={<RefreshCw size={14} />}>Refresh</Button>
        </CardHeader>
        <CardContent>
          {loadError && <ErrorBanner variant="error" message={loadError} onRetry={load} />}

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <Skeleton height="60px" />
              <Skeleton height="60px" />
            </div>
          ) : documents.length === 0 ? (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-slate-500)' }}>
              No documents yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {documents.map((d) => (
                <a
                  key={d.id}
                  href={d.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--space-sm) var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{d.title}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate-500)' }}>{d.documentType}</div>
                  </div>
                  <ExternalLink size={16} color="var(--color-slate-400)" />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
