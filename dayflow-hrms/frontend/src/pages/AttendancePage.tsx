import React, { useState, useEffect, useCallback } from 'react';
import { Clock, LogIn, LogOut, CalendarX2 } from 'lucide-react';
import { PageHeader } from '../components/primitives/PageHeader';
import { Card } from '../components/primitives/Card';
import { Button } from '../components/primitives/Button';
import { Badge } from '../components/primitives/Badge';
import { Skeleton } from '../components/primitives/Skeleton';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import { EmptyState } from '../components/primitives/EmptyState';
import { Pagination } from '../components/primitives/Pagination';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/primitives/Table';
import { useToast } from '../components/primitives/Toast';
import type { Attendance, Paginated } from '@shared/types';
import { checkIn, checkOut, getMyAttendance } from '../api-client/attendance';
import { parseApiError } from '../utils/apiHelper';

const PAGE_SIZE = 20;

function statusVariant(status: Attendance['status']): 'approved' | 'pending' | 'rejected' | 'default' {
  if (status === 'Present') return 'approved';
  if (status === 'HalfDay') return 'pending';
  if (status === 'Absent') return 'rejected';
  return 'default';
}

function formatTime(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
}

export const AttendancePage: React.FC = () => {
  const { showToast } = useToast();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Tracked separately from `records` (which reflects whichever history page
  // is currently being browsed): the Check In/Out buttons must always
  // reflect today's real status even while the user is looking at page 2+
  // of older history, not "undefined" just because today's row isn't on
  // the currently-viewed page.
  const [todayRecord, setTodayRecord] = useState<Attendance | undefined>(undefined);

  const load = useCallback(async (targetPage: number = 1) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await getMyAttendance({ page: targetPage, limit: PAGE_SIZE });
      const items: Attendance[] = Array.isArray(res) ? res : (res as Paginated<Attendance>).items;
      setRecords(items);
      setTotal(Array.isArray(res) ? items.length : (res as Paginated<Attendance>).total);
      setPage(targetPage);
      if (targetPage === 1) {
        const today = new Date().toISOString().slice(0, 10);
        setTodayRecord(items.find((r) => r.attDate === today));
      }
    } catch (err) {
      setLoadError(parseApiError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      await checkIn();
      showToast('Checked in successfully.', 'success');
      await load(page);
    } catch (err) {
      const parsed = parseApiError(err);
      showToast(parsed.code === 'ALREADY_CHECKED_IN' ? 'You have already checked in today.' : parsed.message, 'error');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setIsCheckingOut(true);
    try {
      await checkOut();
      showToast('Checked out successfully.', 'success');
      await load(page);
    } catch (err) {
      const parsed = parseApiError(err);
      showToast(parsed.code === 'NOT_CHECKED_IN' ? 'You need to check in before checking out.' : parsed.message, 'error');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const isCheckedIn = !!todayRecord?.checkIn && !todayRecord?.checkOut;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <PageHeader title="Attendance" description="Daily check-in, check-out, and your attendance history." icon={<Clock size={20} color="var(--color-success-500)" />} />

      <Card style={{ padding: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isCheckedIn ? 'var(--color-success-50)' : 'var(--bg-sunken)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Clock size={22} color={isCheckedIn ? 'var(--color-success-500)' : 'var(--text-tertiary-color)'} />
            </div>
            <div>
              <div style={{ font: 'var(--font-section-title)' }}>
                {todayRecord?.checkOut ? 'Shift completed for today' : todayRecord?.checkIn ? 'Currently checked in' : 'Not checked in yet today'}
              </div>
              {todayRecord?.checkIn && (
                <div className="font-numeric" style={{ font: 'var(--font-body-sm)', color: 'var(--text-tertiary-color)' }}>
                  In {formatTime(todayRecord.checkIn)}{todayRecord.checkOut && <> · Out {formatTime(todayRecord.checkOut)}</>}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <Button variant="primary" isLoading={isCheckingIn} disabled={!!todayRecord?.checkIn} onClick={handleCheckIn} leftIcon={<LogIn size={16} />}>
              Check in
            </Button>
            <Button variant="outline" isLoading={isCheckingOut} disabled={!todayRecord?.checkIn || !!todayRecord?.checkOut} onClick={handleCheckOut} leftIcon={<LogOut size={16} />}>
              Check out
            </Button>
          </div>
        </div>
      </Card>

      <Card padding="none">
        <div style={{ padding: 'var(--space-lg) var(--space-lg) var(--space-md)' }}>
          <h2 style={{ font: 'var(--font-section-title)' }}>History</h2>
        </div>

        {loadError && <div style={{ padding: '0 var(--space-lg)' }}><ErrorBanner variant="error" message={loadError} onRetry={() => load(page)} /></div>}

        {isLoading ? (
          <div style={{ padding: '0 var(--space-lg) var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <Skeleton height="40px" />
            <Skeleton height="40px" />
            <Skeleton height="40px" />
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={<CalendarX2 size={22} />}
            title="No attendance records yet"
            description="Check in above to start building your attendance history."
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Check in</Th>
                <Th>Check out</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {records.map((r) => (
                <Tr key={r.id}>
                  <Td label="Date" style={{ fontWeight: 600 }}>{r.attDate}</Td>
                  <Td label="Check in" numeric className="font-numeric">{formatTime(r.checkIn)}</Td>
                  <Td label="Check out" numeric className="font-numeric">{formatTime(r.checkOut)}</Td>
                  <Td label="Status"><Badge variant={statusVariant(r.status)} size="sm">{r.status}</Badge></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}

        {!isLoading && records.length > 0 && (
          <div style={{ padding: '0 var(--space-lg) var(--space-lg)' }}>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={load} />
          </div>
        )}
      </Card>
    </div>
  );
};
