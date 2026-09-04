import React, { useState, useEffect, useCallback } from 'react';
import { BadgeDollarSign, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/primitives/Card';
import { Button } from '../components/primitives/Button';
import { Skeleton } from '../components/primitives/Skeleton';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import type { Payroll } from '@shared/types';
import { getMyPayroll } from '../api-client/payroll';
import { parseApiError } from '../utils/apiHelper';

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export const PayrollPage: React.FC = () => {
  const [records, setRecords] = useState<Payroll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await getMyPayroll();
      setRecords(res);
    } catch (err) {
      setLoadError(parseApiError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <Card>
        <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BadgeDollarSign size={24} color="var(--color-success-500)" />
            <div>
              <CardTitle>Payroll & Compensation</CardTitle>
              <CardDescription>Salary breakdown, bonuses, deductions, and payslips</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={load} leftIcon={<RefreshCw size={14} />}>Refresh</Button>
        </CardHeader>
        <CardContent>
          {loadError && <ErrorBanner variant="error" message={loadError} onRetry={load} />}

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Skeleton height="90px" />
              <Skeleton height="90px" />
            </div>
          ) : records.length === 0 ? (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-slate-500)' }}>
              No payroll records found yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {records.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                      {p.payPeriodStart} — {p.payPeriodEnd}
                    </div>
                    <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-success-700)' }}>
                      {formatCurrency(p.netPay, p.currency)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-lg)', fontSize: 'var(--text-xs)', color: 'var(--color-slate-600)' }}>
                    <span>Base: {formatCurrency(p.baseSalary, p.currency)}</span>
                    <span>Bonuses: {formatCurrency(p.bonuses, p.currency)}</span>
                    <span>Deductions: −{formatCurrency(p.deductions, p.currency)}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
