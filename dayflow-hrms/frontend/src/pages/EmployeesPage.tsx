import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Users, Search, Pencil, Save, BadgeDollarSign, Mail, Building2, Briefcase, UsersRound, X, Clock, CalendarCheck } from 'lucide-react';
import { PageHeader } from '../components/primitives/PageHeader';
import { Card } from '../components/primitives/Card';
import { FormField, Input, Select } from '../components/primitives/FormField';
import { Button } from '../components/primitives/Button';
import { Badge } from '../components/primitives/Badge';
import { LeaveStatusBadge } from '../components/primitives/LeaveStatusBadge';
import { Skeleton } from '../components/primitives/Skeleton';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import { EmptyState } from '../components/primitives/EmptyState';
import { Pagination } from '../components/primitives/Pagination';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/primitives/Table';
import { Avatar } from '../components/primitives/Avatar';
import { Drawer } from '../components/primitives/Drawer';
import { Tabs } from '../components/primitives/Tabs';
import { useToast } from '../components/primitives/Toast';
import type { Employee, Department, EmployeeContext, Paginated, UpdateProfileRequest, UpdatePayrollRequest } from '@shared/types';
import { getEmployees, switchEmployeeContext, updateEmployee } from '../api-client/employees';
import { getDepartments } from '../api-client/departments';
import { updatePayroll } from '../api-client/payroll';
import { parseApiError } from '../utils/apiHelper';

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Three at-a-glance lines built entirely from the EmployeeContext already
 * fetched for the drawer (no extra API calls) — so HR can read an
 * employee's cross-domain state before drilling into any one tab, per the
 * "employee workspace" goal. Every line is either a real status straight
 * from the data or an honest "none" — nothing here is invented.
 */
function employeeStatusSummary(context: EmployeeContext): { icon: React.ReactNode; text: string }[] {
  const today = new Date().toISOString().slice(0, 10);
  const todayRecord = context.attendance.find((a) => a.attDate === today);
  const attendanceText = todayRecord?.checkOut
    ? 'Checked out today'
    : todayRecord?.checkIn
    ? 'Checked in today'
    : 'Not checked in today';

  const pendingLeave = context.leaveRequests.filter((l) => l.status === 'Pending').length;
  const leaveText = pendingLeave > 0
    ? `${pendingLeave} leave request${pendingLeave === 1 ? '' : 's'} pending`
    : 'No pending leave';

  const payroll = context.payroll ?? [];
  const payrollText = payroll.length > 0 ? 'Payroll on file' : 'No payroll on file';

  return [
    { icon: <Clock size={13} color={todayRecord?.checkIn && !todayRecord?.checkOut ? 'var(--color-success-500)' : 'var(--text-tertiary-color)'} />, text: attendanceText },
    { icon: <CalendarCheck size={13} color={pendingLeave > 0 ? 'var(--color-warning-700)' : 'var(--text-tertiary-color)'} />, text: leaveText },
    { icon: <BadgeDollarSign size={13} color="var(--text-tertiary-color)" />, text: payrollText },
  ];
}

const PAGE_SIZE = 20;
type ContextTab = 'profile' | 'attendance' | 'leave' | 'payroll';

export const EmployeesPage: React.FC = () => {
  const { showToast } = useToast();
  const location = useLocation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  // Deep-linkable from the Dashboard's "N employees have no department
  // assigned" attention item (location.state) — same pattern the Leave page
  // uses for its Dashboard-> Pending deep-link.
  const [departmentId, setDepartmentId] = useState(
    (location.state as { departmentId?: string } | null)?.departmentId ?? ''
  );
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [context, setContext] = useState<EmployeeContext | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [contextTab, setContextTab] = useState<ContextTab>('profile');

  // HR edit form — PATCH /api/employees/:id (full-profile update). Distinct
  // from ProfilePage's self-edit, restricted to phone/address/picture only.
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // HR payroll edit — PATCH /api/payroll/:employeeId. Always targets the
  // employee's most recent record (context.payroll[0], since the backend
  // returns payroll sorted by pay period descending) and recomputes netPay
  // server-side; there's no per-record id in the update contract, so
  // editing "the latest record" is the real, complete feature.
  const [isEditingPayroll, setIsEditingPayroll] = useState(false);
  const [editBaseSalary, setEditBaseSalary] = useState('');
  const [editBonuses, setEditBonuses] = useState('');
  const [editDeductions, setEditDeductions] = useState('');
  const [isSavingPayroll, setIsSavingPayroll] = useState(false);
  const [payrollEditError, setPayrollEditError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number, overrides?: { search?: string; departmentId?: string }) => {
    // Accepts explicit overrides rather than relying purely on `search`/
    // `departmentId` state: a "clear filter" click needs its fetch to use
    // the just-cleared value immediately, not whatever this callback's
    // closure captured before the state update takes effect.
    const effectiveSearch = overrides?.search !== undefined ? overrides.search : search;
    const effectiveDepartmentId = overrides?.departmentId !== undefined ? overrides.departmentId : departmentId;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [empRes, deptRes] = await Promise.all([
        getEmployees({ page: targetPage, limit: PAGE_SIZE, search: effectiveSearch || undefined, departmentId: effectiveDepartmentId || undefined }),
        departments.length ? Promise.resolve(departments) : getDepartments(),
      ]);
      const items: Employee[] = Array.isArray(empRes) ? empRes : (empRes as Paginated<Employee>).items;
      setEmployees(items);
      setTotal(Array.isArray(empRes) ? items.length : (empRes as Paginated<Employee>).total);
      setPage(targetPage);
      if (!departments.length) setDepartments(deptRes as Department[]);
    } catch (err) {
      setLoadError(parseApiError(err).message);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, departmentId]);

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    load(1);
  };

  const closeDrawer = () => {
    setContext(null);
    setContextError(null);
    setIsEditing(false);
    setIsEditingPayroll(false);
  };

  const handleView = async (id: string) => {
    setContextError(null);
    setIsLoadingContext(true);
    setContext(null);
    setIsEditing(false);
    setIsEditingPayroll(false);
    setContextTab('profile');
    try {
      const ctx = await switchEmployeeContext(id);
      // `payroll` is optional in EmployeeContext (CONTRACT.md) — normalize
      // to an array once here so the rest of this component can treat it
      // as always-present, matching what the backend actually sends today.
      setContext({ ...ctx, payroll: ctx.payroll ?? [] });
    } catch (err) {
      setContextError(parseApiError(err).message);
    } finally {
      setIsLoadingContext(false);
    }
  };

  const handleStartEdit = () => {
    if (!context) return;
    setEditFirstName(context.employee.firstName);
    setEditLastName(context.employee.lastName);
    setEditPosition(context.employee.position);
    setEditDepartmentId(context.employee.departmentId);
    setEditPhone(context.employee.phone || '');
    setEditError(null);
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context) return;
    setEditError(null);
    setIsSavingEdit(true);
    try {
      const payload: UpdateProfileRequest = {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        position: editPosition.trim(),
        departmentId: editDepartmentId,
        phone: editPhone.trim() || undefined,
      };
      const updated = await updateEmployee(context.employee.id, payload);
      setContext({ ...context, employee: updated });
      setIsEditing(false);
      showToast('Employee profile updated.', 'success');
      setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (err) {
      setEditError(parseApiError(err).message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleStartEditPayroll = () => {
    if (!context || !context.payroll || context.payroll.length === 0) return;
    const latest = context.payroll[0];
    setEditBaseSalary(String(latest.baseSalary));
    setEditBonuses(String(latest.bonuses));
    setEditDeductions(String(latest.deductions));
    setPayrollEditError(null);
    setIsEditingPayroll(true);
  };

  const handleSavePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context || !context.payroll || context.payroll.length === 0) return;
    setPayrollEditError(null);

    const baseSalary = Number(editBaseSalary);
    const bonuses = Number(editBonuses);
    const deductions = Number(editDeductions);
    if ([baseSalary, bonuses, deductions].some((v) => isNaN(v) || v < 0)) {
      setPayrollEditError('Base salary, bonuses, and deductions must all be non-negative numbers.');
      return;
    }
    if (baseSalary + bonuses - deductions < 0) {
      setPayrollEditError('Deductions cannot exceed base salary plus bonuses (net pay would be negative).');
      return;
    }

    setIsSavingPayroll(true);
    try {
      const payload: UpdatePayrollRequest = { baseSalary, bonuses, deductions };
      const updated = await updatePayroll(context.employee.id, payload);
      // Server-state reconciliation: replace the edited record (always
      // index 0 — the latest) with exactly what the server returned.
      setContext({ ...context, payroll: [updated, ...context.payroll.slice(1)] as typeof context.payroll });
      setIsEditingPayroll(false);
      showToast('Payroll updated.', 'success');
    } catch (err) {
      setPayrollEditError(parseApiError(err).message);
    } finally {
      setIsSavingPayroll(false);
    }
  };

  const payrollRecords = context?.payroll ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <PageHeader title="Employees" description="Search the directory and open an employee's record to review or edit it." icon={<Users size={20} color="var(--color-purple-700)" />} />

      <Card padding="none">
        <form onSubmit={handleFilterSubmit} style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'flex-end', padding: 'var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ flex: '1 1 240px' }}>
            <FormField label="Search employees" htmlFor="emp-search">
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled-color)' }} />
                <Input id="emp-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or employee code" style={{ paddingLeft: '34px' }} />
              </div>
            </FormField>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <FormField label="Department" htmlFor="emp-dept">
              <Select id="emp-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">All departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </FormField>
          </div>
          <Button type="submit" variant="primary" style={{ marginBottom: 'var(--space-md)' }}>Apply filters</Button>
        </form>

        {(search || departmentId) && !isLoading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', padding: 'var(--space-sm) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ font: 'var(--font-body-sm)', color: 'var(--text-tertiary-color)' }}>
              {total} {total === 1 ? 'result' : 'results'} ·
            </span>
            {search && (
              <button
                onClick={() => { setSearch(''); load(1, { search: '' }); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'var(--bg-sunken)', border: 'none', borderRadius: 'var(--radius-full)', padding: '0.125rem 0.625rem', font: 'var(--font-body-sm)', color: 'var(--text-secondary-color)', cursor: 'pointer' }}
              >
                Search: "{search}" <X size={12} />
              </button>
            )}
            {departmentId && (
              <button
                onClick={() => { setDepartmentId(''); load(1, { departmentId: '' }); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'var(--bg-sunken)', border: 'none', borderRadius: 'var(--radius-full)', padding: '0.125rem 0.625rem', font: 'var(--font-body-sm)', color: 'var(--text-secondary-color)', cursor: 'pointer' }}
              >
                Department: {departments.find((d) => d.id === departmentId)?.name ?? '…'} <X size={12} />
              </button>
            )}
            {search && departmentId && (
              <button
                onClick={() => { setSearch(''); setDepartmentId(''); load(1, { search: '', departmentId: '' }); }}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary-600)', font: 'var(--font-body-sm)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {loadError && <div style={{ padding: 'var(--space-lg) var(--space-lg) 0' }}><ErrorBanner variant="error" message={loadError} onRetry={() => load(page)} /></div>}

        {isLoading ? (
          <div style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <Skeleton height="48px" />
            <Skeleton height="48px" />
            <Skeleton height="48px" />
          </div>
        ) : employees.length === 0 ? (
          <EmptyState icon={<UsersRound size={22} />} title="No employees match this filter" description="Try a different search term or department." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Employee</Th>
                <Th>Department</Th>
                <Th>Position</Th>
                <Th>Code</Th>
                <Th aria-label="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {employees.map((emp) => (
                <Tr key={emp.id} interactive onClick={() => handleView(emp.id)}>
                  <Td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <Avatar name={`${emp.firstName} ${emp.lastName}`} size="sm" />
                      <div>
                        <div style={{ fontWeight: 600 }}>{emp.firstName} {emp.lastName}</div>
                        <div style={{ font: 'var(--font-body-sm)', color: 'var(--text-tertiary-color)' }}>{emp.email}</div>
                      </div>
                    </div>
                  </Td>
                  <Td label="Department">{emp.departmentName}</Td>
                  <Td label="Position">{emp.position}</Td>
                  <Td label="Code" className="font-numeric">{emp.employeeCode}</Td>
                  <Td label="" style={{ textAlign: 'right' }}>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleView(emp.id); }}>View</Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}

        {!isLoading && employees.length > 0 && (
          <div style={{ padding: '0 var(--space-lg) var(--space-lg)' }}>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={load} />
          </div>
        )}
      </Card>

      <Drawer
        isOpen={isLoadingContext || !!context || !!contextError}
        onClose={closeDrawer}
        header={
          context ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <Avatar name={`${context.employee.firstName} ${context.employee.lastName}`} />
                <div>
                  <div style={{ font: 'var(--font-section-title)' }}>{context.employee.firstName} {context.employee.lastName}</div>
                  <div style={{ font: 'var(--font-body-sm)', color: 'var(--text-tertiary-color)' }}>{context.employee.position} · {context.employee.departmentName}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: 'var(--space-sm)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border-subtle)' }}>
                {employeeStatusSummary(context).map((item, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3125rem', font: 'var(--font-body-sm)', color: 'var(--text-secondary-color)' }}>
                    {item.icon}{item.text}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ font: 'var(--font-section-title)' }}>Employee</div>
          )
        }
      >
        {contextError && <ErrorBanner variant="error" message={contextError} />}
        {isLoadingContext ? (
          <Skeleton height="200px" />
        ) : context ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <Tabs
              activeKey={contextTab}
              onChange={(k) => setContextTab(k as ContextTab)}
              items={[
                { key: 'profile', label: 'Profile' },
                { key: 'attendance', label: 'Attendance' },
                { key: 'leave', label: 'Leave' },
                { key: 'payroll', label: 'Payroll' },
              ]}
            />

            {contextTab === 'profile' && (
              isEditing ? (
                <form onSubmit={handleSaveEdit}>
                  {editError && <ErrorBanner variant="error" message={editError} />}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <FormField label="First name" required htmlFor="edit-first-name">
                      <Input id="edit-first-name" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} required />
                    </FormField>
                    <FormField label="Last name" required htmlFor="edit-last-name">
                      <Input id="edit-last-name" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} required />
                    </FormField>
                  </div>
                  <FormField label="Position" required htmlFor="edit-position">
                    <Input id="edit-position" value={editPosition} onChange={(e) => setEditPosition(e.target.value)} required />
                  </FormField>
                  <FormField label="Department" required htmlFor="edit-department">
                    <Select id="edit-department" value={editDepartmentId} onChange={(e) => setEditDepartmentId(e.target.value)} required>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Phone" htmlFor="edit-phone">
                    <Input id="edit-phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                  </FormField>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <Button type="submit" variant="primary" size="sm" isLoading={isSavingEdit} leftIcon={<Save size={14} />}>Save changes</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSavingEdit}>Cancel</Button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', font: 'var(--font-body)', color: 'var(--text-secondary-color)' }}>
                    <Mail size={15} color="var(--text-tertiary-color)" /> {context.employee.email}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', font: 'var(--font-body)', color: 'var(--text-secondary-color)' }}>
                    <Building2 size={15} color="var(--text-tertiary-color)" /> {context.employee.departmentName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', font: 'var(--font-body)', color: 'var(--text-secondary-color)' }}>
                    <Briefcase size={15} color="var(--text-tertiary-color)" /> {context.employee.position}
                  </div>
                  {context.employee.phone && (
                    <div style={{ font: 'var(--font-body)', color: 'var(--text-secondary-color)' }}>{context.employee.phone}</div>
                  )}
                  <Button variant="outline" size="sm" onClick={handleStartEdit} leftIcon={<Pencil size={14} />} style={{ alignSelf: 'flex-start', marginTop: 'var(--space-xs)' }}>
                    Edit profile
                  </Button>
                </div>
              )
            )}

            {contextTab === 'attendance' && (
              context.attendance.length === 0 ? (
                <EmptyState compact title="No attendance records" description="Nothing has been logged for this employee yet." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {context.attendance.map((a) => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span className="font-numeric" style={{ font: 'var(--font-body)' }}>{a.attDate}</span>
                      <Badge size="sm">{a.status}</Badge>
                    </div>
                  ))}
                </div>
              )
            )}

            {contextTab === 'leave' && (
              context.leaveRequests.length === 0 ? (
                <EmptyState compact title="No leave requests" description="This employee hasn't requested any leave." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {context.leaveRequests.map((l) => (
                    <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span className="font-numeric" style={{ font: 'var(--font-body)' }}>{l.leaveType}: {l.startDate} → {l.endDate}</span>
                      <LeaveStatusBadge status={l.status} size="sm" />
                    </div>
                  ))}
                </div>
              )
            )}

            {contextTab === 'payroll' && (
              payrollRecords.length === 0 ? (
                <EmptyState compact icon={<BadgeDollarSign size={20} />} title="No payroll records" description="Add a record to start tracking this employee's pay." />
              ) : isEditingPayroll ? (
                <form onSubmit={handleSavePayroll}>
                  {payrollEditError && <ErrorBanner variant="error" message={payrollEditError} />}
                  <div style={{ font: 'var(--font-body-sm)', color: 'var(--text-tertiary-color)', marginBottom: 'var(--space-sm)' }}>
                    Editing pay period {payrollRecords[0].payPeriodStart} — {payrollRecords[0].payPeriodEnd}
                  </div>
                  <FormField label="Base salary" required htmlFor="edit-base-salary">
                    <Input id="edit-base-salary" type="number" min="0" step="0.01" value={editBaseSalary} onChange={(e) => setEditBaseSalary(e.target.value)} required />
                  </FormField>
                  <FormField label="Bonuses" required htmlFor="edit-bonuses">
                    <Input id="edit-bonuses" type="number" min="0" step="0.01" value={editBonuses} onChange={(e) => setEditBonuses(e.target.value)} required />
                  </FormField>
                  <FormField label="Deductions" required htmlFor="edit-deductions">
                    <Input id="edit-deductions" type="number" min="0" step="0.01" value={editDeductions} onChange={(e) => setEditDeductions(e.target.value)} required />
                  </FormField>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <Button type="submit" variant="primary" size="sm" isLoading={isSavingPayroll} leftIcon={<Save size={14} />}>Save payroll</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingPayroll(false)} disabled={isSavingPayroll}>Cancel</Button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {payrollRecords.map((p, i) => (
                    <div key={p.id}>
                      <div className="font-numeric" style={{ font: 'var(--font-body-sm)', color: 'var(--text-tertiary-color)', marginBottom: '0.25rem' }}>{p.payPeriodStart} — {p.payPeriodEnd}</div>
                      <div className="font-numeric" style={{ font: 'var(--font-body)', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                        <span>Base {formatCurrency(p.baseSalary, p.currency)}</span>
                        <span>Bonuses {formatCurrency(p.bonuses, p.currency)}</span>
                        <span>Deductions −{formatCurrency(p.deductions, p.currency)}</span>
                        <span style={{ fontWeight: 700 }}>Net {formatCurrency(p.netPay, p.currency)}</span>
                      </div>
                      {i === 0 && (
                        <Button variant="outline" size="sm" onClick={handleStartEditPayroll} leftIcon={<Pencil size={14} />} style={{ marginTop: 'var(--space-sm)' }}>
                          Edit latest
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};
