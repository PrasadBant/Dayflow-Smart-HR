-- Dayflow HRMS Seed Data
-- Seed script for development, demonstration, and integration testing

-- Fixed UUIDs for reliable testing & demo referencing
-- HR User / Employee
-- User HR ID: 11111111-1111-1111-1111-111111111111
-- Employee HR ID: 11111111-1111-1111-1111-222222222222

-- Employee 1 (John Doe)
-- User ID: 22222222-2222-2222-2222-111111111111
-- Employee ID: 22222222-2222-2222-2222-222222222222

-- Employee 2 (Jane Smith)
-- User ID: 33333333-3333-3333-3333-111111111111
-- Employee ID: 33333333-3333-3333-3333-222222222222

-- Departments
-- Engineering ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- HR Dept ID: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb

----------------------------------------------------
-- 1. SEED DEPARTMENTS
----------------------------------------------------
INSERT INTO departments (id, name, code) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Engineering', 'DEPT-ENG'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Human Resources', 'DEPT-HR')
ON CONFLICT (id) DO NOTHING;

----------------------------------------------------
-- 2. SEED USERS
-- Passwords hashed with bcrypt (10 rounds): Password123!
-- Hash: $2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW
----------------------------------------------------
INSERT INTO users (id, email, password_hash, role, employee_code, email_verified) VALUES
('11111111-1111-1111-1111-111111111111', 'hr.admin@dayflow.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'HR', 'EMP001', TRUE),
('22222222-2222-2222-2222-111111111111', 'john.doe@dayflow.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'EMPLOYEE', 'EMP002', TRUE),
('33333333-3333-3333-3333-111111111111', 'jane.smith@dayflow.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'EMPLOYEE', 'EMP003', TRUE)
ON CONFLICT (id) DO NOTHING;

----------------------------------------------------
-- 3. SEED EMPLOYEES
----------------------------------------------------
INSERT INTO employees (id, user_id, employee_code, first_name, last_name, email, department_id, department_name, position, hire_date) VALUES
('11111111-1111-1111-1111-222222222222', '11111111-1111-1111-1111-111111111111', 'EMP001', 'Sarah', 'Connor', 'hr.admin@dayflow.com', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Human Resources', 'HR Manager', '2024-01-15'),
('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-111111111111', 'EMP002', 'John', 'Doe', 'john.doe@dayflow.com', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Engineering', 'Senior Software Engineer', '2024-03-01'),
('33333333-3333-3333-3333-222222222222', '33333333-3333-3333-3333-111111111111', 'EMP003', 'Jane', 'Smith', 'jane.smith@dayflow.com', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Engineering', 'Frontend Developer', '2024-04-10')
ON CONFLICT (id) DO NOTHING;

-- Update department managers
UPDATE departments SET manager_id = '11111111-1111-1111-1111-222222222222' WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
UPDATE departments SET manager_id = '22222222-2222-2222-2222-222222222222' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

----------------------------------------------------
-- 4. SEED PAYROLL ROWS
----------------------------------------------------
INSERT INTO payroll (id, employee_id, pay_period_start, pay_period_end, base_salary, bonuses, deductions, net_pay, currency, status) VALUES
('44444444-4444-4444-4444-111111111111', '22222222-2222-2222-2222-222222222222', '2026-08-01', '2026-08-31', 8500.00, 500.00, 1000.00, 8000.00, 'USD', 'Processed'),
('44444444-4444-4444-4444-222222222222', '33333333-3333-3333-3333-222222222222', '2026-08-01', '2026-08-31', 7500.00, 300.00, 900.00, 6900.00, 'USD', 'Processed')
ON CONFLICT (id) DO NOTHING;

----------------------------------------------------
-- 5. SEED ATTENDANCE ROWS
----------------------------------------------------
INSERT INTO attendance (id, employee_id, att_date, check_in, check_out, status) VALUES
('55555555-5555-5555-5555-111111111111', '22222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '1 day', (CURRENT_DATE - INTERVAL '1 day' + TIME '09:00:00'), (CURRENT_DATE - INTERVAL '1 day' + TIME '17:00:00'), 'Present'),
('55555555-5555-5555-5555-222222222222', '33333333-3333-3333-3333-222222222222', CURRENT_DATE - INTERVAL '1 day', (CURRENT_DATE - INTERVAL '1 day' + TIME '09:15:00'), (CURRENT_DATE - INTERVAL '1 day' + TIME '17:30:00'), 'Present')
ON CONFLICT (id) DO NOTHING;

----------------------------------------------------
-- 6. SEED PENDING LEAVE REQUEST (FOR HR APPROVAL DEMO)
----------------------------------------------------
INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, reason, status, decided_by, decided_at, decision_comments) VALUES
('66666666-6666-6666-6666-111111111111', '22222222-2222-2222-2222-222222222222', 'Paid', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '9 days', 'Annual family vacation', 'Pending', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
