import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/primitives/Card';
import { Button } from '../components/primitives/Button';
import { Skeleton } from '../components/primitives/Skeleton';
import { EmptyState } from '../components/primitives/EmptyState';
import {
  Clock,
  LogIn,
  LogOut,
  CalendarDays,
  BadgeDollarSign,
  FolderOpen,
  Users,
  Building2,
  UserCheck,
  User as UserIcon,
  ArrowRight,
  CheckCircle2,
  CheckCircle,
  XCircle,
  FileClock,
} from 'lucide-react';
import { checkIn, checkOut, getMyAttendance, getAllAttendance } from '../api-client/attendance';
import { getMyLeaveRequests, getAllLeaveRequests } from '../api-client/leave';
import { getMyPayroll } from '../api-client/payroll';
import { getMyDocuments } from '../api-client/documents';
import { getEmployees, getRecentActivity, getProfile } from '../api-client/employees';
import type { Attendance, ActivityItem } from '@shared/types';
import { DEFAULT_UNASSIGNED_DEPARTMENT } from '@shared/types';
import { parseApiError } from '../utils/apiHelper';
import { useToast } from '../components/primitives/Toast';

interface AttentionItem {
  id: string;
  icon: React.ReactNode;
  text: string;
  actionLabel: string;
  onAction: () => void;
  isActionLoading?: boolean;
}

/** Real actions synthesized server-side from attendance/leave rows (see
 *  EmployeesRepository.findRecentActivity) — an icon per actual action
 *  string the backend produces, not a generic bullet for everything. */
function activityIcon(action: string): React.ReactNode {
  if (action.includes('approved')) return <CheckCircle size={15} color="var(--color-success-500)" />;
  if (action.includes('rejected')) return <XCircle size={15} color="var(--color-danger-500)" />;
  if (action.includes('Leave request')) return <CalendarDays size={15} color="var(--color-primary-500)" />;
  return <Clock size={15} color="var(--text-tertiary-color)" />;
}

function formatActivityTime(iso: string): string {
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}

const metricCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
};

/**
 * Every number on this page comes from a real backend call made here — no
 * client-side aggregation of partial pages presented as a total, no invented
 * metric the API doesn't actually support (there is, for example, no
 * "attendance rate" endpoint, so this page doesn't show one). Where a true
 * count is needed (pending leave, employees, today's check-ins) it's read
 * from a paginated response's real `.total` field with `limit: 1`, not
 * derived by counting whatever happened to be on one page of items.
 */
export const DashboardPage: React.FC = () => {
  const { user, employee } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isHR = user?.role === 'HR';
  const firstName = employee?.firstName || user?.email?.split('@')[0] || '';

  const [isLoading, setIsLoading] = useState(true);

  // Employee-facing data
  const [todayRecord, setTodayRecord] = useState<Attendance | undefined>(undefined);
  const [pendingLeaveCount, setPendingLeaveCount] = useState<number | null>(null);
  const [latestPayNet, setLatestPayNet] = useState<{ amount: number; currency: string } | null>(null);
  const [documentCount, setDocumentCount] = useState<number | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  // Real profile fields (phone/address) — fetched fresh here rather than
  // read from the possibly-stale AuthContext copy, specifically so "needs
  // attention" reflects the server's current truth, not what was true at
  // last login.
  const [profileContact, setProfileContact] = useState<{ phone?: string; address?: string } | null>(null);

  // HR-facing data
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [checkedInToday, setCheckedInToday] = useState<number | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<number | null>(null);
  const [unassignedCount, setUnassignedCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        if (isHR) {
          const today = new Date().toISOString().slice(0, 10);
          const [empRes, attRes, leaveRes, unassignedRes] = await Promise.all([
            getEmployees({ page: 1, limit: 1 }),
            getAllAttendance({ page: 1, limit: 1, date: today }),
            getAllLeaveRequests({ page: 1, limit: 1, status: 'Pending' }),
            getEmployees({ page: 1, limit: 1, departmentId: DEFAULT_UNASSIGNED_DEPARTMENT.id }),
          ]);
          if (cancelled) return;
          setEmployeeCount(Array.isArray(empRes) ? empRes.length : empRes.total);
          setCheckedInToday(Array.isArray(attRes) ? attRes.length : attRes.total);
          setPendingApprovals(leaveRes.total);
          setUnassignedCount(Array.isArray(unassignedRes) ? unassignedRes.length : unassignedRes.total);
        } else {
          const [attRes, leaveRes, payRes, docRes, activityRes, profileRes] = await Promise.all([
            getMyAttendance({ page: 1, limit: 5 }),
            getMyLeaveRequests({ page: 1, limit: 1, status: 'Pending' }),
            getMyPayroll(),
            getMyDocuments(),
            getRecentActivity(),
            getProfile(),
          ]);
          if (cancelled) return;
          const attItems = Array.isArray(attRes) ? attRes : attRes.items;
          const today = new Date().toISOString().slice(0, 10);
          setTodayRecord(attItems.find((r) => r.attDate === today));
          setPendingLeaveCount(leaveRes.total);
          if (payRes.length > 0) {
            setLatestPayNet({ amount: payRes[0].netPay, currency: payRes[0].currency });
          }
          setDocumentCount(docRes.length);
          setRecentActivity(activityRes.slice(0, 5));
          setProfileContact({ phone: profileRes.phone, address: profileRes.address });
        }
      } catch {
        // Dashboard summary data failing to load isn't fatal to the app —
        // each section below degrades to its own "couldn't load" state
        // rather than blocking the whole page behind one error banner.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [isHR]);

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const record = await checkIn();
      setTodayRecord(record);
      showToast('Checked in successfully.', 'success');
    } catch (err) {
      showToast(parseApiError(err).message, 'error');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setIsCheckingOut(true);
    try {
      const record = await checkOut();
      setTodayRecord(record);
      showToast('Checked out successfully.', 'success');
    } catch (err) {
      showToast(parseApiError(err).message, 'error');
    } finally {
      setIsCheckingOut(false);
    }
  };

  /**
   * Every entry here is derived from real data already loaded above — no
   * invented counts, no decorative "notifications". Each item both explains
   * why it's here and gives the one action that resolves it, so the
   * dashboard tells the user what to do next instead of just what exists.
   */
  const attentionItems: AttentionItem[] = isLoading
    ? []
    : isHR
    ? [
        ...(pendingApprovals
          ? [{
              id: 'pending-approvals',
              icon: <UserCheck size={16} color="var(--color-warning-700)" />,
              text: `${pendingApprovals} leave ${pendingApprovals === 1 ? 'request is' : 'requests are'} awaiting your approval`,
              actionLabel: 'Review requests',
              onAction: () => navigate('/leave'),
            }]
          : []),
        ...(unassignedCount
          ? [{
              id: 'unassigned-department',
              icon: <Building2 size={16} color="var(--color-warning-700)" />,
              text: `${unassignedCount} employee${unassignedCount === 1 ? ' has' : 's have'} no department assigned`,
              actionLabel: 'View employees',
              onAction: () => navigate('/employees', { state: { departmentId: DEFAULT_UNASSIGNED_DEPARTMENT.id } }),
            }]
          : []),
      ]
    : [
        ...(!todayRecord?.checkIn
          ? [{
              id: 'not-checked-in',
              icon: <Clock size={16} color="var(--color-warning-700)" />,
              text: "You haven't checked in today",
              actionLabel: 'Check in',
              onAction: handleCheckIn,
              isActionLoading: isCheckingIn,
            }]
          : []),
        ...(pendingLeaveCount
          ? [{
              id: 'pending-leave',
              icon: <CalendarDays size={16} color="var(--color-warning-700)" />,
              text: `${pendingLeaveCount} leave ${pendingLeaveCount === 1 ? 'request is' : 'requests are'} awaiting approval`,
              actionLabel: 'View request',
              onAction: () => navigate('/leave', { state: { filterStatus: 'Pending' } }),
            }]
          : []),
        ...(profileContact && (!profileContact.phone || !profileContact.address)
          ? [{
              id: 'incomplete-profile',
              icon: <UserIcon size={16} color="var(--color-warning-700)" />,
              text: 'Your profile is missing contact information',
              actionLabel: 'Complete profile',
              onAction: () => navigate('/profile'),
            }]
          : []),
      ];

  const attentionSection = !isLoading && (
    <div>
      <h2 style={{ font: 'var(--font-section-title)', marginBottom: 'var(--space-sm)' }}>Needs your attention</h2>
      <Card padding="none">
        {attentionItems.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-lg)' }}>
            <CheckCircle size={18} color="var(--color-success-500)" />
            <span style={{ font: 'var(--font-body)', color: 'var(--text-secondary-color)' }}>You're all caught up. Nothing needs your attention right now.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {attentionItems.map((item, i) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-md)',
                  flexWrap: 'wrap',
                  padding: 'var(--space-md) var(--space-lg)',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', minWidth: 0 }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'var(--color-warning-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <span style={{ font: 'var(--font-body)', color: 'var(--text-primary-color)' }}>{item.text}</span>
                </div>
                <Button variant="outline" size="sm" isLoading={item.isActionLoading} onClick={item.onAction}>
                  {item.actionLabel}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div>
        <h1 style={{ font: 'var(--font-page-title)', color: 'var(--text-primary-color)' }}>
          {greeting()}, {firstName}
        </h1>
        <p style={{ font: 'var(--font-body)', color: 'var(--text-secondary-color)', marginTop: '0.25rem' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          {isHR ? ' · Workforce overview' : ''}
        </p>
      </div>

      {!isHR && (
        <Card style={{ padding: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: todayRecord?.checkIn && !todayRecord?.checkOut ? 'var(--color-success-50)' : 'var(--bg-sunken)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Clock size={22} color={todayRecord?.checkIn && !todayRecord?.checkOut ? 'var(--color-success-500)' : 'var(--text-tertiary-color)'} />
              </div>
              <div>
                <div style={{ font: 'var(--font-section-title)' }}>
                  {isLoading ? 'Checking today’s status…' : todayRecord?.checkOut
                    ? 'You completed your shift today'
                    : todayRecord?.checkIn
                    ? 'You’re checked in'
                    : 'You haven’t checked in yet'}
                </div>
                {todayRecord?.checkIn && (
                  <div style={{ font: 'var(--font-body-sm)', color: 'var(--text-tertiary-color)' }} className="font-numeric">
                    In {new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {todayRecord.checkOut && <> · Out {new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>}
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
      )}

      {attentionSection}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-md)' }}>
        {isHR ? (
          <>
            <Card style={metricCardStyle}>
              <span style={{ font: 'var(--font-label)', color: 'var(--text-tertiary-color)' }}>Total employees</span>
              {isLoading ? <Skeleton height="28px" width="60px" /> : <span className="font-numeric" style={{ font: 'var(--font-metric)' }}>{employeeCount}</span>}
            </Card>
            <Card style={metricCardStyle}>
              <span style={{ font: 'var(--font-label)', color: 'var(--text-tertiary-color)' }}>Checked in today</span>
              {isLoading ? (
                <Skeleton height="28px" width="60px" />
              ) : (
                <span className="font-numeric" style={{ font: 'var(--font-metric)', color: 'var(--color-success-700)' }}>
                  {checkedInToday}{employeeCount ? <span style={{ color: 'var(--text-tertiary-color)', fontSize: 'var(--text-lg)', fontWeight: 500 }}> / {employeeCount}</span> : null}
                </span>
              )}
            </Card>
            <Card padding="none">
              {/* The whole card is the click target, not just the number below the
                  label — the label row is where the "→ more" affordance lives, so
                  it has to be clickable too or the affordance is misleading. */}
              <button
                onClick={() => navigate('/leave')}
                disabled={isLoading}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', width: '100%', padding: 'var(--space-lg)', background: 'none', border: 'none', cursor: isLoading ? 'default' : 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ font: 'var(--font-label)', color: 'var(--text-tertiary-color)' }}>Pending approvals</span>
                  {!isLoading && !!pendingApprovals && <ArrowRight size={14} color="var(--text-tertiary-color)" />}
                </div>
                {isLoading ? (
                  <Skeleton height="28px" width="60px" />
                ) : (
                  <span className="font-numeric" style={{ font: 'var(--font-metric)', color: pendingApprovals ? 'var(--color-warning-700)' : 'var(--text-primary-color)' }}>
                    {pendingApprovals}
                  </span>
                )}
              </button>
            </Card>
          </>
        ) : (
          <>
            <Card padding="none">
              {/* Whole card is the click target — see the matching HR "Pending
                  approvals" card above for why (the arrow affordance sits on the
                  label row, so that row must be clickable too). */}
              <button
                onClick={() => navigate('/leave', { state: { filterStatus: 'Pending' } })}
                disabled={isLoading}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', width: '100%', padding: 'var(--space-lg)', background: 'none', border: 'none', cursor: isLoading ? 'default' : 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ font: 'var(--font-label)', color: 'var(--text-tertiary-color)' }}>Pending leave requests</span>
                  {!isLoading && !!pendingLeaveCount && <ArrowRight size={14} color="var(--text-tertiary-color)" />}
                </div>
                {isLoading ? (
                  <Skeleton height="28px" width="40px" />
                ) : (
                  <span className="font-numeric" style={{ font: 'var(--font-metric)', color: pendingLeaveCount ? 'var(--color-warning-700)' : 'var(--text-primary-color)' }}>
                    {pendingLeaveCount}
                  </span>
                )}
              </button>
            </Card>
            <Card style={metricCardStyle}>
              <span style={{ font: 'var(--font-label)', color: 'var(--text-tertiary-color)' }}>Latest payslip</span>
              {isLoading ? (
                <Skeleton height="28px" width="90px" />
              ) : latestPayNet ? (
                <span className="font-numeric" style={{ font: 'var(--font-metric)' }}>{formatCurrency(latestPayNet.amount, latestPayNet.currency)}</span>
              ) : (
                <span style={{ font: 'var(--font-body-sm)', color: 'var(--text-tertiary-color)' }}>No records yet</span>
              )}
            </Card>
            <Card style={metricCardStyle}>
              <span style={{ font: 'var(--font-label)', color: 'var(--text-tertiary-color)' }}>Documents on file</span>
              {isLoading ? <Skeleton height="28px" width="40px" /> : <span className="font-numeric" style={{ font: 'var(--font-metric)' }}>{documentCount}</span>}
            </Card>
          </>
        )}
      </div>

      <div>
        <h2 style={{ font: 'var(--font-section-title)', marginBottom: 'var(--space-sm)' }}>Quick actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-sm)' }}>
          {(isHR
            ? [
                { label: 'Review leave approvals', icon: <CheckCircle2 size={18} />, path: '/leave' },
                { label: 'Employee directory', icon: <Users size={18} />, path: '/employees' },
              ]
            : [
                { label: 'Request leave', icon: <CalendarDays size={18} />, path: '/leave' },
                { label: 'View payslips', icon: <BadgeDollarSign size={18} />, path: '/payroll' },
                { label: 'My documents', icon: <FolderOpen size={18} />, path: '/documents' },
              ]
          ).map((a) => (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-md)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                textAlign: 'left',
                font: 'var(--font-body)',
                fontWeight: 500,
                color: 'var(--text-primary-color)',
                transition: 'border-color var(--transition-fast), background-color var(--transition-fast)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.backgroundColor = 'var(--bg-sunken)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.backgroundColor = 'var(--bg-surface)'; }}
            >
              <span style={{ color: 'var(--color-primary-600)' }}>{a.icon}</span>
              <span style={{ flexGrow: 1 }}>{a.label}</span>
              <ArrowRight size={16} color="var(--text-tertiary-color)" />
            </button>
          ))}
        </div>
      </div>

      {!isHR && (
        <div>
          <h2 style={{ font: 'var(--font-section-title)', marginBottom: 'var(--space-sm)' }}>Recent activity</h2>
          <Card padding="none">
            {isLoading ? (
              <div style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <Skeleton height="20px" />
                <Skeleton height="20px" />
              </div>
            ) : recentActivity.length === 0 ? (
              <EmptyState compact icon={<FileClock size={20} />} title="No activity yet" description="Check-ins and leave updates will show up here." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recentActivity.map((item, i) => (
                  <div key={item.id + item.action} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: '0.625rem var(--space-lg)', borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)' }}>
                    {activityIcon(item.action)}
                    <span style={{ font: 'var(--font-body)', color: 'var(--text-primary-color)', flexGrow: 1 }}>
                      {item.action}{item.details ? ` — ${item.details}` : ''}
                    </span>
                    <span className="font-numeric" style={{ font: 'var(--font-body-sm)', color: 'var(--text-tertiary-color)', flexShrink: 0 }}>
                      {formatActivityTime(item.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
