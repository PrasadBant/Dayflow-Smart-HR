import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/primitives/Card';
import { FormField, Input, Select, Textarea } from '../components/primitives/FormField';
import { Button } from '../components/primitives/Button';
import { LeaveStatusBadge } from '../components/primitives/LeaveStatusBadge';
import { Skeleton } from '../components/primitives/Skeleton';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import { Pagination } from '../components/primitives/Pagination';
import type {
  LeaveType,
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
import { parseApiError } from '../utils/apiHelper';

const PAGE_SIZE = 20;

export const LeavePage: React.FC = () => {
  const { user } = useAuth();
  const isHR = user?.role === 'HR';

  // Active HR view tab ('pending' | 'mine')
  const [activeTab, setActiveTab] = useState<'pending' | 'mine'>(isHR ? 'pending' : 'mine');

  // Employee Form State
  const [leaveType, setLeaveType] = useState<LeaveType>('Paid');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Employee List State
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [myPage, setMyPage] = useState(1);
  const [myTotal, setMyTotal] = useState(0);
  const [isLoadingMine, setIsLoadingMine] = useState(true);
  const [mineError, setMineError] = useState<string | null>(null);

  // HR Queue State
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  // HR Decision Modal State
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [decisionComments, setDecisionComments] = useState('');
  const [isDeciding, setIsDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  // Load Employee's own leave requests
  const fetchMyRequests = useCallback(async (targetPage: number = 1) => {
    setIsLoadingMine(true);
    setMineError(null);
    try {
      const res = await getMyLeaveRequests({ page: targetPage, limit: PAGE_SIZE });
      setMyRequests(res.items);
      setMyTotal(res.total);
      setMyPage(targetPage);
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setMineError(parsed.message);
    } finally {
      setIsLoadingMine(false);
    }
  }, []);

  // Load HR Pending Approvals Queue
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
      const parsed = parseApiError(err);
      setPendingError(parsed.message);
    } finally {
      setIsLoadingPending(false);
    }
  }, [isHR]);

  useEffect(() => {
    fetchMyRequests();
    if (isHR) {
      fetchPendingRequests();
    }
  }, [fetchMyRequests, fetchPendingRequests, isHR]);

  // Handle Employee Form Submit
  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    // Client Validation
    if (!startDate || !endDate || !reason.trim()) {
      setFormError('Please fill in all required fields (Start Date, End Date, and Reason).');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setFormError('End Date cannot be earlier than Start Date.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateLeaveRequest = {
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
      };

      await createLeaveRequest(payload);

      setFormSuccess('Your leave application has been submitted successfully.');
      setReason('');
      setStartDate('');
      setEndDate('');

      // Re-fetch from the server rather than splicing the response into
      // local state — keeps the list as a true reflection of server state
      // (e.g. correct id/createdAt, and consistent with every other
      // mutation on this page/app calling its list's refresh afterward).
      await fetchMyRequests();
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      // P0 CRITICAL RULE: LEAVE_OVERLAP HTTP 409 must display FORM-LEVEL BANNER
      if (parsed.code === 'LEAVE_OVERLAP') {
        setFormError('Those dates overlap an existing request - pick different dates');
      } else {
        setFormError(parsed.message || 'Failed to submit leave request. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle HR Decision (Approve / Reject)
  const handleMakeDecision = async (status: 'Approved' | 'Rejected') => {
    if (!selectedRequest) return;
    setIsDeciding(true);
    setDecisionError(null);

    try {
      const payload: DecideLeaveRequest = {
        status,
        decisionComments: decisionComments.trim() || undefined,
      };

      await decideLeaveRequest(selectedRequest.id, payload);

      // Update local state
      setPendingRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id));

      // Close modal
      setSelectedRequest(null);
      setDecisionComments('');
      fetchPendingRequests(pendingPage);
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setDecisionError(parsed.message || 'Failed to record decision. Please try again.');
    } finally {
      setIsDeciding(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Role Navigation Toggle for HR */}
      {isHR && (
        <div style={{ display: 'flex', gap: 'var(--space-md)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-sm)' }}>
          <Button
            variant={activeTab === 'pending' ? 'primary' : 'ghost'}
            size="md"
            onClick={() => setActiveTab('pending')}
            leftIcon={<UserCheck size={18} />}
          >
            Pending Approvals ({pendingRequests.length})
          </Button>
          <Button
            variant={activeTab === 'mine' ? 'primary' : 'ghost'}
            size="md"
            onClick={() => setActiveTab('mine')}
            leftIcon={<CalendarDays size={18} />}
          >
            My Leave Requests
          </Button>
        </div>
      )}

      {/* VIEW 1: HR PENDING APPROVAL QUEUE */}
      {isHR && activeTab === 'pending' && (
        <Card>
          <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <CardTitle style={{ color: 'var(--color-purple-900)' }}>HR Leave Approval Queue</CardTitle>
              <CardDescription>Review and process pending leave applications from employees</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchPendingRequests(pendingPage)} leftIcon={<RefreshCw size={14} />}>
              Refresh Queue
            </Button>
          </CardHeader>

          <CardContent>
            {pendingError && (
              <ErrorBanner variant="error" message={pendingError} onRetry={() => fetchPendingRequests(pendingPage)} />
            )}

            {isLoadingPending ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <Skeleton height="80px" />
                <Skeleton height="80px" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', backgroundColor: 'var(--color-slate-50)', borderRadius: 'var(--radius-md)' }}>
                <CheckCircle2 size={36} color="var(--color-success-500)" style={{ margin: '0 auto var(--space-md)' }} />
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-slate-800)' }}>No pending approvals</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate-500)', marginTop: '0.25rem' }}>
                  All submitted employee leave applications have been reviewed.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      padding: 'var(--space-md)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 'var(--space-md)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--color-slate-900)' }}>
                          Employee #{req.employeeId}
                        </span>
                        <LeaveStatusBadge status={req.status} size="sm" />
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate-500)', backgroundColor: 'var(--color-slate-100)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                          {req.leaveType} Leave
                        </span>
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate-700)', marginBottom: 'var(--space-xs)' }}>
                        <strong>Dates:</strong> {req.startDate} to {req.endDate}
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate-600)', fontStyle: 'italic' }}>
                        "{req.reason}"
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(req);
                        setDecisionComments('');
                        setDecisionError(null);
                      }}
                      style={{ backgroundColor: 'var(--color-purple-700)' }}
                    >
                      Review Request
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {!isLoadingPending && pendingRequests.length > 0 && (
              <Pagination page={pendingPage} pageSize={PAGE_SIZE} total={pendingTotal} onPageChange={fetchPendingRequests} />
            )}
          </CardContent>
        </Card>
      )}

      {/* HR DECISION MODAL / DRAWER */}
      {selectedRequest && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 'var(--space-md)' }}>
          <Card style={{ maxWidth: '520px', width: '100%', padding: 'var(--space-xl)', boxShadow: 'var(--shadow-lg)' }}>
            <CardHeader style={{ marginBottom: 'var(--space-md)' }}>
              <CardTitle style={{ fontSize: 'var(--text-xl)' }}>Review Leave Application</CardTitle>
              <CardDescription>Submitted by Employee #{selectedRequest.employeeId}</CardDescription>
            </CardHeader>

            <CardContent>
              {decisionError && <ErrorBanner variant="error" message={decisionError} />}

              <div style={{ backgroundColor: 'var(--color-slate-50)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: 'var(--text-sm)' }}>
                <div style={{ marginBottom: '0.25rem' }}><strong>Type:</strong> {selectedRequest.leaveType} Leave</div>
                <div style={{ marginBottom: '0.25rem' }}><strong>Duration:</strong> {selectedRequest.startDate} to {selectedRequest.endDate}</div>
                <div><strong>Reason:</strong> "{selectedRequest.reason}"</div>
              </div>

              <FormField label="Decision Comments" helperText="Add feedback or notes for the employee" htmlFor="decision-comments">
                <Textarea
                  id="decision-comments"
                  placeholder="e.g. Approved. Please ensure your handovers are complete."
                  value={decisionComments}
                  onChange={(e) => setDecisionComments(e.target.value)}
                  rows={3}
                />
              </FormField>

              <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                <Button
                  variant="danger"
                  size="md"
                  isLoading={isDeciding}
                  onClick={() => handleMakeDecision('Rejected')}
                  leftIcon={<XCircle size={18} />}
                  style={{ flex: 1 }}
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  isLoading={isDeciding}
                  onClick={() => handleMakeDecision('Approved')}
                  leftIcon={<CheckCircle2 size={18} />}
                  style={{ flex: 1, backgroundColor: 'var(--color-success-700)' }}
                >
                  Approve
                </Button>
              </div>

              <div style={{ marginTop: 'var(--space-md)', textAlign: 'center' }}>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(null)} disabled={isDeciding}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* VIEW 2: EMPLOYEE LEAVE APPLICATION FORM & MY LEAVE LIST */}
      {(!isHR || activeTab === 'mine') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-xl)', alignItems: 'start' }}>
          {/* Apply Leave Form */}
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PlusCircle size={22} color="var(--color-primary-600)" />
                <CardTitle>Apply for Leave</CardTitle>
              </div>
              <CardDescription>Submit a new leave request for HR approval</CardDescription>
            </CardHeader>

            <CardContent>
              {/* Form Success Notice */}
              {formSuccess && (
                <ErrorBanner variant="success" message={formSuccess} />
              )}

              {/* CRITICAL P0 RULE: LEAVE_OVERLAP FORM-LEVEL ERROR BANNER */}
              {formError && (
                <ErrorBanner
                  variant="error"
                  title="Leave Application Error"
                  message={formError}
                />
              )}

              <form onSubmit={handleCreateLeave}>
                <FormField label="Leave Type" required htmlFor="leave-type">
                  <Select
                    id="leave-type"
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                    required
                  >
                    <option value="Paid">Paid Leave</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Unpaid">Unpaid Leave</option>
                  </Select>
                </FormField>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <FormField label="Start Date" required htmlFor="leave-start-date">
                    <Input
                      id="leave-start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </FormField>

                  <FormField label="End Date" required htmlFor="leave-end-date">
                    <Input
                      id="leave-end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </FormField>
                </div>

                <FormField label="Reason / Remarks" required helperText="Provide details regarding your leave request" htmlFor="leave-reason">
                  <Textarea
                    id="leave-reason"
                    placeholder="e.g. Attending family wedding out of town..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    required
                  />
                </FormField>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  style={{ width: '100%', marginTop: 'var(--space-sm)' }}
                  leftIcon={<CalendarDays size={18} />}
                >
                  Submit Leave Request
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* My Leave Requests History */}
          <Card>
            <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <CardTitle>My Leave History</CardTitle>
                <CardDescription>Track status and comments for submitted requests</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => fetchMyRequests(myPage)} leftIcon={<RefreshCw size={14} />}>
                Refresh
              </Button>
            </CardHeader>

            <CardContent>
              {mineError && (
                <ErrorBanner variant="error" message={mineError} onRetry={() => fetchMyRequests(myPage)} />
              )}

              {isLoadingMine ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  <Skeleton height="70px" />
                  <Skeleton height="70px" />
                </div>
              ) : myRequests.length === 0 ? (
                <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', backgroundColor: 'var(--color-slate-50)', borderRadius: 'var(--radius-md)' }}>
                  <CalendarDays size={36} color="var(--color-slate-400)" style={{ margin: '0 auto var(--space-md)' }} />
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-slate-800)' }}>No leave requests yet</h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate-500)', marginTop: '0.25rem' }}>
                    Use the form on the left to submit your first leave application.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {myRequests.map((req) => (
                    <div
                      key={req.id}
                      style={{
                        padding: 'var(--space-md)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                          <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-slate-900)' }}>
                            {req.leaveType} Leave
                          </span>
                        </div>
                        <LeaveStatusBadge status={req.status} size="sm" />
                      </div>

                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate-500)', marginBottom: 'var(--space-xs)' }}>
                        📅 {req.startDate} to {req.endDate}
                      </div>

                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate-700)', marginBottom: 'var(--space-xs)' }}>
                        "{req.reason}"
                      </div>

                      {req.decisionComments && (
                        <div
                          style={{
                            marginTop: 'var(--space-xs)',
                            padding: 'var(--space-xs) var(--space-sm)',
                            backgroundColor: 'var(--color-slate-50)',
                            borderRadius: 'var(--radius-sm)',
                            borderLeft: '3px solid var(--color-primary-400)',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-slate-700)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                          }}
                        >
                          <MessageSquare size={14} color="var(--color-primary-500)" />
                          <span><strong>HR Note:</strong> {req.decisionComments}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!isLoadingMine && myRequests.length > 0 && (
                <Pagination page={myPage} pageSize={PAGE_SIZE} total={myTotal} onPageChange={fetchMyRequests} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
