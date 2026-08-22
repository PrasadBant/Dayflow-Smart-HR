import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/primitives/Card';
import { FolderOpen } from 'lucide-react';

export const DocumentsPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FolderOpen size={24} color="var(--color-primary-500)" />
            <div>
              <CardTitle>Document Repository</CardTitle>
              <CardDescription>Employee contracts, policies, and uploaded metadata</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-slate-500)' }}>
            Document Repository Workspace ready for Phase C5 implementation.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
