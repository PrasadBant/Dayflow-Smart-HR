import React, { useState, useEffect, useCallback } from 'react';
import { Clock, LogIn, LogOut, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/primitives/Card';
import { Button } from '../components/primitives/Button';
import { Badge } from '../components/primitives/Badge';
import { Skeleton } from '../components/primitives/Skeleton';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import type { Attendance, Paginated } from '@shared/types';
import { checkIn, checkOut, getMyAttendance } from '../api-client/attendance';
import { parseApiError } from '../utils/apiHelper';

function statusVariant(status: Attendance['status']): 'approved' | 'pending' | 'rejected' | 'default' {
  if (status === 'Present') return 'approved';
  if (status === 'HalfDay') return 'pending';
  if (status === 'Absent') return 'rejected';
  return 'default';
}

export const AttendancePage: React.FC = () => {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await getMyAttendance();
      const items: Attendance[] = Array.isArray(res) ? res : (res as Paginated<Attendance>).items;
      setRecords(items);
    } catch (err) {
      setLoadError(parseApiError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const todayRecord = records.find((r) => r.attDate === today);

  const handleCheckIn = async () => {
    setActionError(null);
    setActionMessage(null);
    setIsCheckingIn(true);
    try {
      await checkIn();
      setActionMessage('Checked in successfully.');
      await load();
    } catch (err) {
      const parsed = parseApiError(err);
      setActionError(
        parsed.code === 'ALREADY_CHECKED_IN' ? 'You have already checked in today.' : parsed.message
      );
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setActionError(null);
    setActionMessage(null);
    setIsCheckingOut(true);
    try {
      await checkOut();
      setActionMessage('Checked out successfully.');
      await load();
    } catch (err) {
      const parsed = parseApiError(err);
      setActionError(
        parsed.code === 'NOT_CHECKED_IN' ? 'You need to check in before checking out.' : parsed.message
      );
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
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
          {actionMessage && <ErrorBanner variant="success" message={actionMessage} />}
          {actionError && <ErrorBanner variant="error" message={actionError} />}

          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
            <Button
              variant="primary"
              isLoading={isCheckingIn}
              disabled={!!todayRecord?.checkIn}
              onClick={handleCheckIn}
              leftIcon={<LogIn size={16} />}
            >
              Check In
            </Button>
            <Button
              variant="outline"
              isLoading={isCheckingOut}
              disabled={!todayRecord?.checkIn || !!todayRecord?.checkOut}
              onClick={handleCheckOut}
              leftIcon={<LogOut size={16} />}
            >
              Check Out
            </Button>
            {todayRecord && (
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate-600)' }}>
                Today: {todayRecord.checkIn ? new Date(todayRecord.checkIn).toLocaleTimeString() : '—'}
                {' → '}
                {todayRecord.checkOut ? new Date(todayRecord.checkOut).toLocaleTimeString() : '—'}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-slate-700)' }}>Recent History</h4>
            <Button variant="ghost" size="sm" onClick={load} leftIcon={<RefreshCw size={14} />}>Refresh</Button>
          </div>

          {loadError && <ErrorBanner variant="error" message={loadError} onRetry={load} />}

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <Skeleton height="50px" />
              <Skeleton height="50px" />
            </div>
          ) : records.length === 0 ? (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-slate-500)' }}>
              No attendance records yet. Check in to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {records.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--space-sm) var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{r.attDate}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate-600)' }}>
                    {r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '—'}
                    {' → '}
                    {r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '—'}
                  </div>
                  <Badge variant={statusVariant(r.status)} size="sm">{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
