import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/primitives/Card';
import { Users } from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <Card style={{ borderColor: 'var(--color-purple-500)' }}>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={24} color="var(--color-purple-700)" />
            <div>
              <CardTitle style={{ color: 'var(--color-purple-900)' }}>Employee Directory (HR Administrative Control)</CardTitle>
              <CardDescription>Manage employee profiles, roles, and context switching</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-slate-500)' }}>
            HR Employee Directory Workspace ready for Phase C5 implementation.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
