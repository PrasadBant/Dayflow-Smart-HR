# Dayflow HRMS — Single Source of Truth & Architecture Contract

**Version:** 1.0 (Freeze)  
**Status:** Frozen  
**Target Branch:** `feat/foundation`  

This document serves as the binding single source of truth for the entire Dayflow HRMS team (Person A - Foundation, Person B - Backend, Person C - Frontend, Person D - Integration). All database schemas, backend services, API clients, and frontend UI components MUST strictly adhere to the contracts defined herein.

---

## 1. Roles & Permissions

Dayflow HRMS defines two primary user roles:

| Role | Description | Access Rights |
|---|---|---|
| `EMPLOYEE` | Standard organization employee | Own profile, check-in/out, apply for leave, view own payroll & documents |
| `HR` | Human Resources Administrator | All employee records, approve/reject leave, update profiles/payroll, employee switcher |

---

## 2. Database Resources & Schema Overview

The database layer consists of 8 normalized PostgreSQL tables:

1. **`users`**: System credentials, password hash, role (`EMPLOYEE` / `HR`), email verification status, and linked `employee_code`.
2. **`employees`**: Employee profile details (`user_id`, `employee_code`, `first_name`, `last_name`, `email`, `department_id`, `position`, `phone`, `address`, `profile_picture_url`, `hire_date`).
3. **`departments`**: Department definitions (`name`, `code`, `manager_id`).
4. **`attendance`**: Daily attendance records (`employee_id`, `att_date`, `check_in`, `check_out`, `status`). Unique on `(employee_id, att_date)`.
5. **`leave_requests`**: Leave applications (`employee_id`, `leave_type`, `start_date`, `end_date`, `reason`, `status`, `decided_by`, `decided_at`, `decision_comments`).
6. **`payroll`**: Payroll records (`employee_id`, `pay_period_start`, `pay_period_end`, `base_salary`, `bonuses`, `deductions`, `net_pay`, `currency`, `status`).
7. **`documents`**: Employee document metadata (`employee_id`, `title`, `document_type`, `file_url`, `uploaded_by`).
8. **`audit_log`**: Audit trail for sensitive administrative operations (`actor_id`, `action`, `target_resource`, `details`, `timestamp`).

---

## 3. Leave System & Attendance Enums

### Leave Types (`LeaveType`)
- `'Paid'`
- `'Sick'`
- `'Unpaid'`

### Leave Statuses (`LeaveStatus`)
- `'Pending'` (Default on creation)
- `'Approved'`
- `'Rejected'`

### Attendance Statuses (`AttendanceStatus`)
- `'Present'`
- `'Absent'`
- `'HalfDay'`
- `'Leave'`

---

## 4. Field Naming & Identifier Conventions

To prevent ambiguity across layers, identifiers follow these strict rules:

- **`id`**: Primary key of any entity (UUID string format).
- **`employeeCode`**: Unique human-readable code assigned to an employee (e.g. `"EMP001"`).
- **`employeeId`**: Foreign key reference pointing explicitly to `Employee.id`.
- **Casing**:
  - API requests/responses & TypeScript definitions: **`camelCase`**
  - PostgreSQL database columns & queries: **`snake_case`**

---

## 5. API Endpoint Specification

All endpoints are mounted under `/api`.

### Auth Endpoints
| Method | Path | Access | Request Body | Response Body |
|---|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | `SignupRequest` | `{ user: User }` |
| `POST` | `/api/auth/login` | Public | `LoginRequest` | `AuthResponse` |
| `POST` | `/api/auth/verify-email` | Public | `VerifyEmailRequest` | `{ message: string }` |
| `POST` | `/api/auth/resend-verification` | Public | `ResendVerificationRequest` | `{ message: string }` |

### Employee Endpoints
| Method | Path | Access | Request Body | Response Body |
|---|---|---|---|---|
| `GET` | `/api/employees/me` | Authenticated | None | `Employee` |
| `PATCH` | `/api/employees/me` | Authenticated | `UpdateProfileRequest` | `Employee` |
| `GET` | `/api/employees` | HR Only | Query params | `Paginated<Employee>` |
| `PATCH` | `/api/employees/:id` | HR Only | `UpdateProfileRequest` | `Employee` |
| `GET` | `/api/employees/recent-activity` | Authenticated | None | `ActivityItem[]` |
| `GET` | `/api/employees/switch-context/:id` | HR Only | None | `EmployeeContext` |

### Department Endpoints
| Method | Path | Access | Request Body | Response Body |
|---|---|---|---|---|
| `GET` | `/api/departments` | Authenticated | None | `Department[]` |

### Leave Request Endpoints
| Method | Path | Access | Request Body | Response Body |
|---|---|---|---|---|
| `POST` | `/api/leave-requests` | Authenticated | `CreateLeaveRequest` | `LeaveRequest` (201) |
| `GET` | `/api/leave-requests/me` | Authenticated | Query params | `Paginated<LeaveRequest>` |
| `GET` | `/api/leave-requests` | HR Only | Query params | `Paginated<LeaveRequest>` |
| `PATCH` | `/api/leave-requests/:id` | HR Only | `DecideLeaveRequest` | `LeaveRequest` |

### Attendance Endpoints
| Method | Path | Access | Request Body | Response Body |
|---|---|---|---|---|
| `POST` | `/api/attendance/check-in` | Authenticated | `CheckInRequest` | `Attendance` |
| `POST` | `/api/attendance/check-out` | Authenticated | `CheckOutRequest` | `Attendance` |
| `GET` | `/api/attendance/me` | Authenticated | Query params | `Paginated<Attendance>` |
| `GET` | `/api/attendance` | HR Only | Query params | `Paginated<Attendance>` |

### Payroll Endpoints
| Method | Path | Access | Request Body | Response Body |
|---|---|---|---|---|
| `GET` | `/api/payroll/me` | Authenticated | None | `Payroll[]` |
| `GET` | `/api/payroll/:employeeId` | HR Only | None | `Payroll[]` |
| `PATCH` | `/api/payroll/:employeeId` | HR Only | `UpdatePayrollRequest` | `Payroll` |

### Document Endpoints
| Method | Path | Access | Request Body | Response Body |
|---|---|---|---|---|
| `GET` | `/api/documents/me` | Authenticated | None | `Document[]` |
| `GET` | `/api/documents/:employeeId` | HR Only | None | `Document[]` |
| `POST` | `/api/documents` | Authenticated/HR | `CreateDocumentMetadataRequest` | `Document` |

---

## 6. Authentication & Security Rules

1. **Token Transport**: JWT passed via `Authorization: Bearer <token>` HTTP header.
2. **JWT Payload**: `{ userId: string, employeeId: string, role: Role }` with 8-hour expiry.
3. **Password Security**: Hashed via bcrypt (10 salt rounds). Passwords must be at least 8 characters long and contain both letters and numbers.
4. **Email Verification**: Unverified users (`emailVerified = false`) cannot log in and will receive `403 EMAIL_NOT_VERIFIED`.
5. **Signup Role Lock**: Public signup (`POST /api/auth/signup`) MUST NOT accept a `role` field in `SignupRequest`. The backend forces `role = 'EMPLOYEE'`. Self-registration as HR is strictly prohibited.
6. **Signup Department & Position Defaulting**: Self-registered employees (`POST /api/auth/signup`) provide personal details (`email`, `password`, `firstName`, `lastName`, optional `employeeCode`). Upon signup, the backend assigns the default department `Unassigned` (`DEFAULT_UNASSIGNED_DEPARTMENT`, `id: '00000000-0000-0000-0000-000000000000'`, `name: 'Unassigned'`) and default position `'Employee'`. HR administrators can subsequently update an employee's department and position via `PATCH /api/employees/:id`.


---

## 7. Authorization & Ownership Rules

1. **Middleware Hierarchy**:
   - `requireAuth`: Validates JWT token and attaches `req.user`.
   - `requireRole('HR')`: Restricts access to users with `role === 'HR'`.
   - `requireOwnership(param)`: Enforces that employees can only view/modify their own resource (`req.user.employeeId === param.employeeId`). HR role bypasses this check.
2. **IDOR Protection**: Attempting to access another employee's resource returns `403 FORBIDDEN`.
3. **Profile Edit Boundaries**:
   - Employee role: Can edit `address`, `phone`, `profilePictureUrl` ONLY.
   - HR role: Can edit all profile fields including department and position.

---

## 8. Core Business Rules (BR-1 to BR-7)

- **BR-1: Leave Overlap Prevention**: An employee cannot have two active (`Pending` or `Approved`) leave requests with overlapping date ranges (`startDate` to `endDate`). PostgreSQL enforces this via a `btree_gist` EXCLUDE constraint (`no_overlapping_active_leave`). Service catches DB error `23P01` and returns `409` with code `LEAVE_OVERLAP`.
- **BR-2: Public Signup Role Lock**: Signup API ignores any client attempt to set `role`. All self-registered users are created with `role = 'EMPLOYEE'`.
- **BR-3: Leave/Attendance Consistency**: Attendance status `'Leave'` requires a valid, approved leave request covering that date. DB check trigger enforces validation.
- **BR-4: Check-in / Check-out Rules**: Single active check-in per day per employee (`UNIQUE(employee_id, att_date)`). Duplicate check-in returns `409 ALREADY_CHECKED_IN`. Checking out without prior check-in returns `400 NOT_CHECKED_IN`. `checkOut` time must be after `checkIn` time.
- **BR-5: Ownership & IDOR Protection**: Strictly enforced across all endpoints.
- **BR-6: Non-negative Payroll**: Base salary, bonuses, deductions, and net pay must be non-negative values. Violation returns `400 VALIDATION_ERROR`.
- **BR-7: Password Strength**: Passwords must be 8+ characters, with at least 1 letter and 1 number.

---

## 9. Standardized API Error Shape

All API error responses use a standard envelope structure:

```json
{
  "error": {
    "code": "LEAVE_OVERLAP",
    "message": "Those dates overlap an existing request - pick different dates",
    "details": [
      {
        "field": "startDate",
        "message": "Date overlaps with request #123"
      }
    ]
  }
}
```

### Enumerated Error Codes (`ErrorCode`)
- `'UNAUTHORIZED'` (HTTP 401)
- `'FORBIDDEN'` (HTTP 403)
- `'NOT_FOUND'` (HTTP 404)
- `'CONFLICT'` (HTTP 409)
- `'VALIDATION_ERROR'` (HTTP 400)
- `'LEAVE_OVERLAP'` (HTTP 409)
- `'EMAIL_TAKEN'` (HTTP 409)
- `'EMAIL_NOT_VERIFIED'` (HTTP 403)
- `'ALREADY_CHECKED_IN'` (HTTP 409)
- `'NOT_CHECKED_IN'` (HTTP 400)
- `'INTERNAL_ERROR'` (HTTP 500)
