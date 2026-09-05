import React, { useState, useEffect, useCallback } from 'react';
import { BadgeDollarSign, Wallet } from 'lucide-react';
import { PageHeader } from '../components/primitives/PageHeader';
import { Card } from '../components/primitives/Card';
import { Skeleton } from '../components/primitives/Skeleton';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import { EmptyState } from '../components/primitives/EmptyState';
import { Badge } from '../components/primitives/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/primitives/Table';
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

/**
 * `payroll.status` is a free-form VARCHAR(50) with no CHECK constraint in
 * the schema (default 'Processed') — not a fixed enum this frontend can
 * exhaustively know. Only the two values actually seeded/produced by this
 * system get a specific color; anything else still displays correctly as
 * neutral text instead of being miscolored as if it were known-good.
 */
function payrollStatusVariant(status: string): 'approved' | 'default' {
  return status === 'Processed' || status === 'Paid' ? 'approved' : 'default';
}

export const PayrollPage: React.FC = () => {
  const [records, setRecords] = useState<Payroll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setRecords(await getMyPayroll());
    } catch (err) {
      setLoadError(parseApiError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const latest = records[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <PageHeader title="Payroll" description="View your salary and payslip history." icon={<BadgeDollarSign size={20} color="var(--color-success-700)" />} />

      {loadError && <ErrorBanner variant="error" message={loadError} onRetry={load} />}

      {isLoading ? (
        <Card><Skeleton height="80px" /></Card>
      ) : latest ? (
        <Card style={{ background: 'linear-gradient(135deg, var(--color-slate-900) 0%, var(--color-slate-800) 100%)', padding: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div>
              <div style={{ font: 'var(--font-caption)', color: 'var(--text-on-dark-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Latest payslip · {latest.payPeriodStart} to {latest.payPeriodEnd}
              </div>
              <div className="font-numeric" style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: '#ffffff', marginTop: '0.25rem' }}>
                {formatCurrency(latest.netPay, latest.currency)}
              </div>
            </div>
            <Badge variant={payrollStatusVariant(latest.status)} dot={false} style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>{latest.status}</Badge>
          </div>
        </Card>
      ) : null}

      <Card padding="none">
        <div style={{ padding: 'var(--space-lg) var(--space-lg) var(--space-md)' }}>
          <h2 style={{ font: 'var(--font-section-title)' }}>Payslip history</h2>
        </div>

        {isLoading ? (
          <div style={{ padding: '0 var(--space-lg) var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <Skeleton height="44px" />
            <Skeleton height="44px" />
          </div>
        ) : records.length === 0 ? (
          <EmptyState icon={<Wallet size={22} />} title="No payroll records found yet" description="Your payslips will appear here once HR processes them." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Pay period</Th>
                <Th style={{ textAlign: 'right' }}>Base</Th>
                <Th style={{ textAlign: 'right' }}>Bonuses</Th>
                <Th style={{ textAlign: 'right' }}>Deductions</Th>
                <Th style={{ textAlign: 'right' }}>Net pay</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {records.map((p) => (
                <Tr key={p.id}>
                  <Td label="Pay period" className="font-numeric" style={{ fontWeight: 600 }}>{p.payPeriodStart} — {p.payPeriodEnd}</Td>
                  <Td label="Base" numeric className="font-numeric">{formatCurrency(p.baseSalary, p.currency)}</Td>
                  <Td label="Bonuses" numeric className="font-numeric">{formatCurrency(p.bonuses, p.currency)}</Td>
                  <Td label="Deductions" numeric className="font-numeric" style={{ color: 'var(--color-danger-700)' }}>−{formatCurrency(p.deductions, p.currency)}</Td>
                  <Td label="Net pay" numeric className="font-numeric" style={{ fontWeight: 700 }}>{formatCurrency(p.netPay, p.currency)}</Td>
                  <Td label="Status"><Badge variant={payrollStatusVariant(p.status)} size="sm">{p.status}</Badge></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
    </div>
  );
};
