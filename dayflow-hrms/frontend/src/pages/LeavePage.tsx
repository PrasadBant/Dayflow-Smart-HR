import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CalendarDays,
  PlusCircle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  UserCheck,
  Inbox,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/primitives/PageHeader';
import { Card } from '../components/primitives/Card';
import { FormField, Input, Select, Textarea } from '../components/primitives/FormField';
import { Button } from '../components/primitives/Button';
import { LeaveStatusBadge } from '../components/primitives/LeaveStatusBadge';
import { Skeleton } from '../components/primitives/Skeleton';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import { EmptyState } from '../components/primitives/EmptyState';
import { Pagination } from '../components/primitives/Pagination';
import { Tabs } from '../components/primitives/Tabs';
import { Modal } from '../components/primitives/Modal';
import { useToast } from '../components/primitives/Toast';
import type {
  LeaveType,
  LeaveStatus,
  LeaveRequest,
  CreateLeaveRequest,
  DecideLeaveRequest,
} from '@shared/types';
import {
  createLeaveRequest,
  getMyLeaveRequests,
  getAllLeaveRequests,
  decideLeaveRequest,
} from '../api-client/leave';
import { getEmployees } from '../api-client/employees';
import { parseApiError } from '../utils/apiHelper';

const PAGE_SIZE = 20;
const STATUS_SUMMARY: LeaveStatus[] = ['Pending', 'Approved', 'Rejected'];

export const LeavePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const isHR = user?.role === 'HR';

  const [activeTab, setActiveTab] = useState<'pending' | 'mine'>(isHR ? 'pending' : 'mine');

  // Employee status summary — real totals from the server (one filtered
  // call per status, reading `.total`), never a count of whatever happens
  // to be on the currently-loaded page.
  const [statusCounts, setStatusCounts] = useState<Record<LeaveStatus, number | null>>({ Pending: null, Approved: null, Rejected: null });

  // Clicking a status card filters "My leave history" to that status — the
  // only way to answer "do I have anything pending?" without scrolling
  // past every approved/rejected request first. Also settable by deep-link
  // from the Dashboard's "Pending leave requests" metric (location.state),
  // so following that link lands the user on exactly what it promised
  // instead of an unfiltered list they'd have to re-filter themselves.
  const [historyFilter, setHistoryFilter] = useState<LeaveStatus | null>(
    (location.state as { filterStatus?: LeaveStatus } | null)?.filterStatus ?? null
  );

  // Employee form
  const [leaveType, setLeaveType] = useState<LeaveType>('Paid');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Employee list
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [myPage, setMyPage] = useState(1);
  const [myTotal, setMyTotal] = useState(0);
  const [isLoadingMine, setIsLoadingMine] = useState(true);
  const [mineError, setMineError] = useState<string | null>(null);

  // HR queue
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  // employeeId -> "First Last" for the pending-approvals list below. HR needs
  // to know WHO is asking before deciding — a truncated UUID isn't an answer.
  // Built from the existing employee directory (already paginated up to 100
  // per page), never a name invented client-side.
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>({});

  // HR decision modal
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [decisionComments, setDecisionComments] = useState('');
  const [isDeciding, setIsDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const fetchMyRequests = useCallback(async (targetPage: number = 1, status: LeaveStatus | null = historyFilter) => {
    setIsLoadingMine(true);
    setMineError(null);
    try {
      const res = await getMyLeaveRequests({ page: targetPage, limit: PAGE_SIZE, status: status ?? undefined });
      setMyRequests(res.items);
      setMyTotal(res.total);
      setMyPage(targetPage);
    } catch (err: unknown) {
      setMineError(parseApiError(err).message);
    } finally {
      setIsLoadingMine(false);
    }
  }, [historyFilter]);

  const fetchStatusCounts = useCallback(async () => {
    const results = await Promise.allSettled(
      STATUS_SUMMARY.map((status) => getMyLeaveRequests({ page: 1, limit: 1, status }))
    );
    setStatusCounts((prev) => {
      const next = { ...prev };
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') next[STATUS_SUMMARY[i]] = r.value.total;
      });
      return next;
    });
  }, []);

  const fetchPendingRequests = useCallback(async (targetPage: number = 1) => {
    if (!isHR) return;
    setIsLoadingPending(true);
    setPendingError(null);
    try {
      const res = await getAllLeaveRequests({ status: 'Pending', page: targetPage, limit: PAGE_SIZE });
      setPendingRequests(res.items);
      setPendingTotal(res.total);
      setPendingPage(targetPage);
    } catch (err: unknown) {
      setPendingError(parseApiError(err).message);
    } finally {
      setIsLoadingPending(false);
    }
  }, [isHR]);

  useEffect(() => {
    fetchMyRequests();
    if (!isHR) fetchStatusCounts();
    if (isHR) fetchPendingRequests();
  }, [fetchMyRequests, fetchStatusCounts, fetchPendingRequests, isHR]);

  useEffect(() => {
    if (!isHR) return;
    // The org is small enough (see the 100-per-page cap the API already
    // enforces) that one call covers the whole directory — no pagination
    // loop needed to build a complete lookup.
    getEmployees({ limit: 100 })
      .then((res) => {
        const map: Record<string, string> = {};
        res.items.forEach((emp) => { map[emp.id] = `${emp.firstName} ${emp.lastName}`; });
        setEmployeeNames(map);
      })
      .catch(() => { /* Non-critical: falls back to the employee code below. */ });
  }, [isHR]);

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!startDate || !endDate || !reason.trim()) {
      setFormError('Please fill in all required fields (start date, end date, and reason).');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setFormError('End date cannot be earlier than start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateLeaveRequest = { leaveType, startDate, endDate, reason: reason.trim() };
      await createLeaveRequest(payload);

      showToast('Leave request submitted.', 'success');
      setReason('');
      setStartDate('');
      setEndDate('');

      // Re-fetch from the server rather than splicing the response into
      // local state — keeps the list a true reflection of server state.
      await fetchMyRequests();
      await fetchStatusCounts();
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      // P0 rule: LEAVE_OVERLAP must display as a form-level error the user can act on immediately.
      setFormError(parsed.code === 'LEAVE_OVERLAP' ? 'Those dates overlap an existing request — pick different dates.' : parsed.message || 'Failed to submit leave request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMakeDecision = async (status: 'Approved' | 'Rejected') => {
    if (!selectedRequest) return;
    setIsDeciding(true);
    setDecisionError(null);
    try {
      const payload: DecideLeaveRequest = { status, decisionComments: decisionComments.trim() || undefined };
      await decideLeaveRequest(selectedRequest.id, payload);

      setPendingRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id));
      setSelectedRequest(null);
      setDecisionComments('');
      showToast(status === 'Approved' ? 'Leave request approved.' : 'Leave request rejected.', 'success');
      fetchPendingRequests(pendingPage);
    } catch (err: unknown) {
      setDecisionError(parseApiError(err).message || 'Failed to record decision.');
    } finally {
      setIsDeciding(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <PageHeader
        title="Leave"
        description={isHR ? 'Review and decide on employee leave requests.' : 'Request leave and track the status of your requests.'}
        icon={<CalendarDays size={20} color="var(--color-primary-600)" />}
      />

      {isHR && (
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as 'pending' | 'mine')}
          items={[
            { key: 'pending', label: 'Pending approvals', icon: <UserCheck size={16} />, count: pendingTotal },
            { key: 'mine', label: 'My leave requests', icon: <CalendarDays size={16} /> },
          ]}
        />
      )}

      {isHR && activeTab === 'pending' && (
        <Card padding="none">
          {pendingError && <div style={{ padding: 'var(--space-lg) var(--space-lg) 0' }}><ErrorBanner variant="error" message={pendingError} onRetry={() => fetchPendingRequests(pendingPage)} /></div>}

          {isLoadingPending ? (
            <div style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Skeleton height="72px" />
              <Skeleton height="72px" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <EmptyState icon={<CheckCircle2 size={22} />} title="No pending approvals" description="Every submitted leave request has been reviewed." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {pendingRequests.map((req, i) => (
                <div
                  key={req.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 'var(--space-md)',
                    padding: 'var(--space-md) var(--space-lg)',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <span style={{ font: 'var(--font-section-title)' }}>
                        {employeeNames[req.employeeId] ?? `Employee #${req.employeeId.slice(0, 8)}`}
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary-color)', backgroundColor: 'var(--bg-sunken)', padding: '0.0625rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                        {req.leaveType}
                      </span>
                    </div>
                    <div className="font-numeric" style={{ font: 'var(--font-body)', color: 'var(--text-secondary-color)' }}>
                      {req.startDate} → {req.endDate}
                    </div>
                    <div style={{ font: 'var(--font-body-sm)', color: 'var(--text-tertiary-color)', marginTop: '0.125rem', fontStyle: 'italic' }}>
                      "{req.reason}"
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => { setSelectedRequest(req); setDecisionComments(''); setDecisionError(null); }}
                  >
                    Review
                  </Button>
                </div>
              ))}
            </div>
          )}
          {!isLoadingPending && pendingRequests.length > 0 && (
            <div style={{ padding: '0 var(--space-lg) var(--space-lg)' }}>
              <Pagination page={pendingPage} pageSize={PAGE_SIZE} total={pendingTotal} onPageChange={fetchPendingRequests} />
            </div>
          )}
        </Card>
      )}

      <Modal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title="Review leave request"
        description={selectedRequest ? `Submitted by ${employeeNames[selectedRequest.employeeId] ?? `employee #${selectedRequest.employeeId.slice(0, 8)}`}` : undefined}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(null)} disabled={isDeciding}>Cancel</Button>
            <Button variant="danger" size="sm" isLoading={isDeciding} onClick={() => handleMakeDecision('Rejected')} leftIcon={<XCircle size={16} />}>Reject</Button>
            <Button variant="primary" size="sm" isLoading={isDeciding} onClick={() => handleMakeDecision('Approved')} leftIcon={<CheckCircle2 size={16} />} style={{ backgroundColor: 'var(--color-success-700)' }}>Approve</Button>
          </>
        }
      >
        {selectedRequest && (
          <>
            {decisionError && <ErrorBanner variant="error" message={decisionError} />}
            <div style={{ backgroundColor: 'var(--bg-sunken)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: 'var(--text-sm)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div><strong>Type:</strong> {selectedRequest.leaveType} leave</div>
              <div className="font-numeric"><strong>Duration:</strong> {selectedRequest.startDate} to {selectedRequest.endDate}</div>
              <div><strong>Reason:</strong> "{selectedRequest.reason}"</div>
            </div>
            <FormField label="Decision comments" helperText="Optional note shown to the employee" htmlFor="decision-comments">
              <Textarea id="decision-comments" placeholder="e.g. Approved — please ensure handovers are complete." value={decisionComments} onChange={(e) => setDecisionComments(e.target.value)} rows={3} />
            </FormField>
          </>
        )}
      </Modal>

      {(!isHR || activeTab === 'mine') && (
        <>
          {!isHR && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-md)' }}>
              {STATUS_SUMMARY.map((status) => {
                const isActive = historyFilter === status;
                return (
                  <button
                    key={status}
                    onClick={() => setHistoryFilter(isActive ? null : status)}
                    aria-pressed={isActive}
                    title={`Show only ${status.toLowerCase()} requests`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.375rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      backgroundColor: 'var(--bg-surface)',
                      border: `1px solid ${isActive ? 'var(--color-primary-500)' : 'var(--border-default)'}`,
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: isActive ? 'var(--focus-ring)' : 'var(--shadow-xs)',
                      padding: 'var(--space-lg)',
                      font: 'inherit',
                      color: 'inherit',
                      transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
                    }}
                  >
                    <span style={{ font: 'var(--font-label)', color: 'var(--text-tertiary-color)' }}>{status}</span>
                    {statusCounts[status] === null ? (
                      <Skeleton height="28px" width="32px" />
                    ) : (
                      <span className="font-numeric" style={{ font: 'var(--font-metric)' }}>{statusCounts[status]}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-xl)', alignItems: 'start' }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-md)' }}>
                <PlusCircle size={18} color="var(--color-primary-600)" />
                <h2 style={{ font: 'var(--font-section-title)' }}>Request leave</h2>
              </div>

              {formError && <ErrorBanner variant="error" title="Couldn't submit" message={formError} />}

              <form onSubmit={handleCreateLeave}>
                <FormField label="Leave type" required htmlFor="leave-type">
                  <Select id="leave-type" value={leaveType} onChange={(e) => setLeaveType(e.target.value as LeaveType)} required>
                    <option value="Paid">Paid leave</option>
                    <option value="Sick">Sick leave</option>
                    <option value="Unpaid">Unpaid leave</option>
                  </Select>
                </FormField>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <FormField label="Start date" required htmlFor="leave-start-date">
                    <Input id="leave-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                  </FormField>
                  <FormField label="End date" required htmlFor="leave-end-date">
                    <Input id="leave-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                  </FormField>
                </div>

                <FormField label="Reason" required helperText="A short note for HR reviewing this request" htmlFor="leave-reason">
                  <Textarea id="leave-reason" placeholder="e.g. Attending a family event out of town…" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required />
                </FormField>

                <Button type="submit" variant="primary" isLoading={isSubmitting} style={{ width: '100%', marginTop: 'var(--space-sm)' }}>
                  Request leave
                </Button>
              </form>
            </Card>

            <Card padding="none">
              <div style={{ padding: 'var(--space-lg) var(--space-lg) var(--space-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ font: 'var(--font-section-title)' }}>
                  {historyFilter ? `${historyFilter} requests` : 'History'}
                </h2>
                {historyFilter && (
                  <Button variant="ghost" size="sm" onClick={() => setHistoryFilter(null)} leftIcon={<X size={13} />}>
                    Clear filter
                  </Button>
                )}
              </div>

              {mineError && <div style={{ padding: '0 var(--space-lg)' }}><ErrorBanner variant="error" message={mineError} onRetry={() => fetchMyRequests(myPage)} /></div>}

              {isLoadingMine ? (
                <div style={{ padding: '0 var(--space-lg) var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  <Skeleton height="64px" />
                  <Skeleton height="64px" />
                </div>
              ) : myRequests.length === 0 ? (
                <EmptyState
                  icon={<Inbox size={22} />}
                  title={historyFilter ? `No ${historyFilter.toLowerCase()} requests` : 'No leave requests yet'}
                  description={historyFilter ? 'Try a different filter, or clear it to see everything.' : 'Use the form to request your first leave.'}
                  compact
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {myRequests.map((req, i) => (
                    <div key={req.id} style={{ padding: 'var(--space-md) var(--space-lg)', borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ font: 'var(--font-section-title)', fontSize: 'var(--text-sm)' }}>{req.leaveType} leave</span>
                        <LeaveStatusBadge status={req.status} size="sm" />
                      </div>
                      <div className="font-numeric" style={{ font: 'var(--font-body-sm)', color: 'var(--text-tertiary-color)' }}>{req.startDate} → {req.endDate}</div>
                      <div style={{ font: 'var(--font-body)', color: 'var(--text-secondary-color)', marginTop: '0.25rem' }}>"{req.reason}"</div>
                      {req.decisionComments && (
                        <div style={{ marginTop: 'var(--space-xs)', padding: '0.375rem var(--space-sm)', backgroundColor: 'var(--bg-sunken)', borderRadius: 'var(--radius-sm)', borderLeft: '2px solid var(--color-primary-400)', font: 'var(--font-body-sm)', color: 'var(--text-secondary-color)', display: 'flex', alignItems: 'flex-start', gap: '0.375rem' }}>
                          <MessageSquare size={13} color="var(--color-primary-500)" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <span><strong>HR note:</strong> {req.decisionComments}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!isLoadingMine && myRequests.length > 0 && (
                <div style={{ padding: '0 var(--space-lg) var(--space-lg)' }}>
                  <Pagination page={myPage} pageSize={PAGE_SIZE} total={myTotal} onPageChange={fetchMyRequests} />
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
