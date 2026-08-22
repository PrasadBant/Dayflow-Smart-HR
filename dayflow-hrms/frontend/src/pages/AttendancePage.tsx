import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/primitives/Card';
import { Clock } from 'lucide-react';

export const AttendancePage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={24} color="var(--color-success-500)" />
            <div>
              <CardTitle>Attendance Tracking</CardTitle>
              <CardDescription>Daily check-in, check-out, and attendance history</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-slate-500)' }}>
            Attendance Workspace ready for Phase C5 implementation.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
