import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/primitives/Card';
import { BadgeDollarSign } from 'lucide-react';

export const PayrollPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BadgeDollarSign size={24} color="var(--color-success-500)" />
            <div>
              <CardTitle>Payroll & Compensation</CardTitle>
              <CardDescription>Salary breakdown, bonuses, deductions, and payslips</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-slate-500)' }}>
            Payroll Workspace ready for Phase C5 implementation.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
