-- Dayflow HRMS Phase A7 — PostgreSQL Row Level Security (RLS) & Helper Functions

----------------------------------------------------
-- 1. CONTEXT HELPER & SECURITY DEFINER FUNCTIONS
----------------------------------------------------

-- Function: Set session application context
CREATE OR REPLACE FUNCTION set_app_context(p_employee_id TEXT, p_role TEXT)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_employee_id', COALESCE(p_employee_id, ''), true);
    PERFORM set_config('app.current_role', COALESCE(p_role, ''), true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update trigger function to SECURITY DEFINER with safe search_path
CREATE OR REPLACE FUNCTION check_leave_attendance_consistency_func()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Leave' THEN
        IF NOT EXISTS (
            SELECT 1 FROM leave_requests
            WHERE employee_id = NEW.employee_id
              AND status = 'Approved'
              AND NEW.att_date BETWEEN start_date AND end_date
        ) THEN
            RAISE EXCEPTION 'Attendance status Leave requires an approved leave request covering date %', NEW.att_date
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

----------------------------------------------------
-- 2. DEDICATED APPLICATION ROLE SETUP (dayflow_app)
----------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dayflow_app') THEN
        CREATE ROLE dayflow_app WITH LOGIN PASSWORD 'dayflow_app_password';
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO dayflow_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dayflow_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO dayflow_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dayflow_app;

----------------------------------------------------
-- 3. ENABLE AND FORCE RLS ON TARGET TABLES
----------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE ROW LEVEL SECURITY;

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance FORCE ROW LEVEL SECURITY;

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests FORCE ROW LEVEL SECURITY;

ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll FORCE ROW LEVEL SECURITY;

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

----------------------------------------------------
-- 4. POLICIES FOR USERS TABLE (NO EMPTY-ROLE BYPASS)
----------------------------------------------------
DROP POLICY IF EXISTS users_policy ON users;
CREATE POLICY users_policy ON users
    FOR ALL
    USING (
        current_setting('app.current_role', true) IN ('HR', 'SYSTEM', 'SYSTEM_AUTH') OR
        id::text = current_setting('app.current_user_id', true)
    );

----------------------------------------------------
-- 5. POLICIES FOR EMPLOYEES TABLE (NO EMPTY-ROLE BYPASS)
----------------------------------------------------
DROP POLICY IF EXISTS employees_policy ON employees;
CREATE POLICY employees_policy ON employees
    FOR ALL
    USING (
        current_setting('app.current_role', true) IN ('HR', 'SYSTEM', 'SYSTEM_AUTH') OR
        id::text = current_setting('app.current_employee_id', true) OR
        user_id::text = current_setting('app.current_user_id', true)
    );

----------------------------------------------------
-- 6. POLICIES FOR ATTENDANCE TABLE (NO EMPTY-ROLE BYPASS)
----------------------------------------------------
DROP POLICY IF EXISTS attendance_policy ON attendance;
CREATE POLICY attendance_policy ON attendance
    FOR ALL
    USING (
        current_setting('app.current_role', true) IN ('HR', 'SYSTEM') OR
        (current_setting('app.current_role', true) = 'EMPLOYEE' AND employee_id::text = current_setting('app.current_employee_id', true))
    );

----------------------------------------------------
-- 7. POLICIES FOR LEAVE_REQUESTS TABLE (NO EMPTY-ROLE BYPASS)
----------------------------------------------------
DROP POLICY IF EXISTS leave_requests_policy ON leave_requests;
CREATE POLICY leave_requests_policy ON leave_requests
    FOR ALL
    USING (
        current_setting('app.current_role', true) IN ('HR', 'SYSTEM') OR
        (current_setting('app.current_role', true) = 'EMPLOYEE' AND employee_id::text = current_setting('app.current_employee_id', true))
    );

----------------------------------------------------
-- 8. POLICIES FOR PAYROLL TABLE (NO EMPTY-ROLE BYPASS)
----------------------------------------------------
DROP POLICY IF EXISTS payroll_policy ON payroll;
CREATE POLICY payroll_policy ON payroll
    FOR ALL
    USING (
        current_setting('app.current_role', true) IN ('HR', 'SYSTEM') OR
        (current_setting('app.current_role', true) = 'EMPLOYEE' AND employee_id::text = current_setting('app.current_employee_id', true))
    );

----------------------------------------------------
-- 9. POLICIES FOR DOCUMENTS TABLE (NO EMPTY-ROLE BYPASS)
----------------------------------------------------
DROP POLICY IF EXISTS documents_policy ON documents;
CREATE POLICY documents_policy ON documents
    FOR ALL
    USING (
        current_setting('app.current_role', true) IN ('HR', 'SYSTEM') OR
        (current_setting('app.current_role', true) = 'EMPLOYEE' AND employee_id::text = current_setting('app.current_employee_id', true))
    );
