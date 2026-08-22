import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/primitives/Card';
import { User } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <User size={24} color="var(--color-primary-500)" />
            <div>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>Personal information, contact details, and organization settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-slate-500)' }}>
            Profile Management Workspace ready for Phase C5 implementation.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
