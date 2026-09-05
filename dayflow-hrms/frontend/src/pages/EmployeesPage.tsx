import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, RefreshCw, Eye, X, Pencil, Save, BadgeDollarSign } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/primitives/Card';
import { FormField, Input, Select } from '../components/primitives/FormField';
import { Button } from '../components/primitives/Button';
import { Badge } from '../components/primitives/Badge';
import { LeaveStatusBadge } from '../components/primitives/LeaveStatusBadge';
import { Skeleton } from '../components/primitives/Skeleton';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import { Pagination } from '../components/primitives/Pagination';
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

const PAGE_SIZE = 20;

export const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [context, setContext] = useState<EmployeeContext | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  // HR edit form — PATCH /api/employees/:id (full-profile update: name,
  // position, department, contact fields). Distinct from ProfilePage's
  // self-edit, which is restricted to phone/address/profilePictureUrl only.
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // HR payroll edit — PATCH /api/payroll/:employeeId. Per PayrollService.update,
  // this always targets the employee's most recent record (context.payroll[0],
  // since the backend returns payroll sorted by pay period descending) and
  // recomputes netPay server-side; there is no per-record id in the update
  // contract, so editing "the latest record" is the real, complete feature,
  // not a partial version of a richer one.
  const [isEditingPayroll, setIsEditingPayroll] = useState(false);
  const [editBaseSalary, setEditBaseSalary] = useState('');
  const [editBonuses, setEditBonuses] = useState('');
  const [editDeductions, setEditDeductions] = useState('');
  const [isSavingPayroll, setIsSavingPayroll] = useState(false);
  const [payrollEditError, setPayrollEditError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [empRes, deptRes] = await Promise.all([
        getEmployees({ page: targetPage, limit: PAGE_SIZE, search: search || undefined, departmentId: departmentId || undefined }),
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
    load(1); // filter changes always restart from page 1
  };

  const handleView = async (id: string) => {
    setContextError(null);
    setIsLoadingContext(true);
    setContext(null);
    setIsEditing(false);
    setIsEditingPayroll(false);
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
      // Keep the directory list in sync with the edit (name/department/position columns).
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
      // index 0 — the latest — per PayrollService.update) with exactly what
      // the server returned, including its server-computed netPay, rather
      // than trusting the locally-entered values.
      setContext({ ...context, payroll: [updated, ...context.payroll.slice(1)] as typeof context.payroll });
      setIsEditingPayroll(false);
    } catch (err) {
      setPayrollEditError(parseApiError(err).message);
    } finally {
      setIsSavingPayroll(false);
    }
  };

  // `payroll` is optional in EmployeeContext (CONTRACT.md) — normalized to
  // an array here so the JSX below can treat it as always-present, matching
  // what handleView already guarantees is really in `context` at runtime.
  const payrollRecords = context?.payroll ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <Card style={{ borderColor: 'var(--color-purple-500)' }}>
        <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={24} color="var(--color-purple-700)" />
            <div>
              <CardTitle style={{ color: 'var(--color-purple-900)' }}>Employee Directory</CardTitle>
              <CardDescription>Manage employee profiles and context switching</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => load(page)} leftIcon={<RefreshCw size={14} />}>Refresh</Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFilterSubmit} style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 'var(--space-lg)' }}>
            <div style={{ flex: '1 1 220px' }}>
              <FormField label="Search" htmlFor="emp-search">
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }} />
                  <Input
                    id="emp-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name or employee code"
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
              </FormField>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <FormField label="Department" htmlFor="emp-dept">
                <Select id="emp-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </FormField>
            </div>
            <Button type="submit" variant="primary" style={{ marginBottom: 'var(--space-md)' }}>Apply Filters</Button>
          </form>

          {loadError && <ErrorBanner variant="error" message={loadError} onRetry={() => load(page)} />}

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <Skeleton height="60px" />
              <Skeleton height="60px" />
              <Skeleton height="60px" />
            </div>
          ) : employees.length === 0 ? (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-slate-500)' }}>
              No employees match this filter.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--space-sm) var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    flexWrap: 'wrap',
                    gap: 'var(--space-sm)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{emp.firstName} {emp.lastName}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate-500)' }}>
                      {emp.employeeCode} · {emp.departmentName} · {emp.position}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleView(emp.id)} leftIcon={<Eye size={14} />}>
                    View
                  </Button>
                </div>
              ))}
            </div>
          )}
          {!isLoading && employees.length > 0 && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={load} />
          )}
        </CardContent>
      </Card>

      {(isLoadingContext || context || contextError) && (
        <Card>
          <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <CardTitle>Employee Context</CardTitle>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              {context && !isEditing && (
                <Button variant="outline" size="sm" onClick={handleStartEdit} leftIcon={<Pencil size={14} />}>Edit</Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setContext(null); setContextError(null); setIsEditing(false); }} leftIcon={<X size={14} />}>Close</Button>
            </div>
          </CardHeader>
          <CardContent>
            {contextError && <ErrorBanner variant="error" message={contextError} />}
            {isLoadingContext ? (
              <Skeleton height="120px" />
            ) : context ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {isEditing ? (
                  <form onSubmit={handleSaveEdit}>
                    {editError && <ErrorBanner variant="error" message={editError} />}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                      <FormField label="First Name" required htmlFor="edit-first-name">
                        <Input id="edit-first-name" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} required />
                      </FormField>
                      <FormField label="Last Name" required htmlFor="edit-last-name">
                        <Input id="edit-last-name" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} required />
                      </FormField>
                    </div>
                    <FormField label="Position" required htmlFor="edit-position">
                      <Input id="edit-position" value={editPosition} onChange={(e) => setEditPosition(e.target.value)} required />
                    </FormField>
                    <FormField label="Department" required htmlFor="edit-department">
                      <Select id="edit-department" value={editDepartmentId} onChange={(e) => setEditDepartmentId(e.target.value)} required>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Phone" htmlFor="edit-phone">
                      <Input id="edit-phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                    </FormField>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      <Button type="submit" variant="primary" size="sm" isLoading={isSavingEdit} leftIcon={<Save size={14} />}>Save Changes</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSavingEdit}>Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div style={{ fontWeight: 700 }}>{context.employee.firstName} {context.employee.lastName}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate-600)' }}>
                      {context.employee.email} · {context.employee.departmentName} · {context.employee.position}
                    </div>
                  </div>
                )}

                <div>
                  <h5 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Recent Attendance</h5>
                  {context.attendance.length === 0 ? (
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate-500)' }}>No records.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {context.attendance.map((a) => (
                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                          <span>{a.attDate}</span>
                          <Badge size="sm">{a.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h5 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Recent Leave Requests</h5>
                  {context.leaveRequests.length === 0 ? (
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate-500)' }}>No records.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {context.leaveRequests.map((l) => (
                        <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                          <span>{l.leaveType}: {l.startDate} to {l.endDate}</span>
                          <LeaveStatusBadge status={l.status} size="sm" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                    <h5 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <BadgeDollarSign size={14} /> Payroll
                    </h5>
                    {!isEditingPayroll && payrollRecords.length > 0 && (
                      <Button variant="outline" size="sm" onClick={handleStartEditPayroll} leftIcon={<Pencil size={14} />}>
                        Edit Latest
                      </Button>
                    )}
                  </div>
                  {payrollRecords.length === 0 ? (
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-slate-500)' }}>No payroll records.</div>
                  ) : isEditingPayroll ? (
                    <form onSubmit={handleSavePayroll}>
                      {payrollEditError && <ErrorBanner variant="error" message={payrollEditError} />}
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate-500)', marginBottom: 'var(--space-sm)' }}>
                        Editing pay period {payrollRecords[0].payPeriodStart} — {payrollRecords[0].payPeriodEnd}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)' }}>
                        <FormField label="Base Salary" required htmlFor="edit-base-salary">
                          <Input id="edit-base-salary" type="number" min="0" step="0.01" value={editBaseSalary} onChange={(e) => setEditBaseSalary(e.target.value)} required />
                        </FormField>
                        <FormField label="Bonuses" required htmlFor="edit-bonuses">
                          <Input id="edit-bonuses" type="number" min="0" step="0.01" value={editBonuses} onChange={(e) => setEditBonuses(e.target.value)} required />
                        </FormField>
                        <FormField label="Deductions" required htmlFor="edit-deductions">
                          <Input id="edit-deductions" type="number" min="0" step="0.01" value={editDeductions} onChange={(e) => setEditDeductions(e.target.value)} required />
                        </FormField>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                        <Button type="submit" variant="primary" size="sm" isLoading={isSavingPayroll} leftIcon={<Save size={14} />}>Save Payroll</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingPayroll(false)} disabled={isSavingPayroll}>Cancel</Button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {payrollRecords.map((p) => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                          <span>{p.payPeriodStart} — {p.payPeriodEnd}</span>
                          <span>
                            Base {formatCurrency(p.baseSalary, p.currency)} · Bonuses {formatCurrency(p.bonuses, p.currency)} · Deductions −{formatCurrency(p.deductions, p.currency)} ·{' '}
                            <strong>Net {formatCurrency(p.netPay, p.currency)}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
