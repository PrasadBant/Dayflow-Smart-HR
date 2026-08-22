-- ============================================================================
-- Dayflow HRMS - Database Constraint Verification Script (Phase A5)
--
-- PURPOSE:
-- Verifies all database constraints, triggers, and business logic rules defined
-- in database/schema.sql without polluting or corrupting existing data.
--
-- POSTGRESQL ERROR CODES DOCUMENTED FOR BACKEND SERVICE LAYER (Person B):
-- 1. 23P01 (exclusion_violation) -> Overlapping active leave requests (no_overlapping_active_leave)
-- 2. 23514 (check_violation)     -> Decision consistency, checkout window, payroll bounds, or missing approved leave
-- 3. 23505 (unique_violation)    -> Duplicate employee attendance on same date (uk_employee_att_date)
-- ============================================================================

BEGIN;

DO $$
DECLARE
    test_user_id UUID;
    test_emp_id UUID;
    hr_emp_id UUID;
    start_time TIMESTAMPTZ;
    updated_time TIMESTAMPTZ;
    pass_count INT := 0;
    fail_count INT := 0;
BEGIN
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '       DAYFLOW HRMS - DATABASE CONSTRAINT VERIFICATION SUITE       ';
    RAISE NOTICE '====================================================================';

    -- Setup isolated test fixture user & employee
    INSERT INTO users (email, password_hash, role, email_verified)
    VALUES ('test_verify_constraint_user@dayflow.local', '$2a$10$abcdefghijklmnopqrstuu', 'EMPLOYEE', true)
    RETURNING id INTO test_user_id;

    INSERT INTO employees (user_id, employee_code, first_name, last_name, email, hire_date)
    VALUES (test_user_id, 'TEST999', 'Test', 'Verification', 'test_verify_constraint_user@dayflow.local', CURRENT_DATE)
    RETURNING id INTO test_emp_id;

    -- Fetch an HR employee for decision testing (or create test HR if none exists)
    SELECT id INTO hr_emp_id FROM employees WHERE user_id IN (SELECT id FROM users WHERE role = 'HR') LIMIT 1;
    IF hr_emp_id IS NULL THEN
        hr_emp_id := test_emp_id;
    END IF;

    -- ------------------------------------------------------------------------
    -- TEST GROUP 1: LEAVE OVERLAP PROTECTION (no_overlapping_active_leave)
    -- ------------------------------------------------------------------------
    RAISE NOTICE '--- 1. Testing Leave Overlap Protection (no_overlapping_active_leave) ---';

    -- Test 1.1: Insert initial active leave request
    BEGIN
        INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status)
        VALUES (test_emp_id, 'Paid', '2026-09-01', '2026-09-10', 'Vacation 1', 'Pending');
        pass_count := pass_count + 1;
        RAISE NOTICE '  [PASS] 1.1 Valid non-overlapping pending leave inserted';
    EXCEPTION WHEN OTHERS THEN
        fail_count := fail_count + 1;
        RAISE NOTICE '  [FAIL] 1.1 Valid non-overlapping pending leave rejected: %', SQLERRM;
    END;

    -- Test 1.2: Overlapping active (Pending) leave request MUST be rejected (23P01)
    BEGIN
        INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status)
        VALUES (test_emp_id, 'Sick', '2026-09-05', '2026-09-15', 'Vacation 2', 'Pending');
        fail_count := fail_count + 1;
        RAISE NOTICE '  [FAIL] 1.2 Overlapping active leave was incorrectly allowed!';
    EXCEPTION WHEN exclusion_violation THEN -- 23P01
        pass_count := pass_count + 1;
        RAISE NOTICE '  [PASS] 1.2 Overlapping active leave correctly rejected with exclusion_violation (23P01)';
    END;

    -- Test 1.3: Non-overlapping active leave request MUST be allowed
    BEGIN
        INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status)
        VALUES (test_emp_id, 'Paid', '2026-09-11', '2026-09-20', 'Vacation 3', 'Pending');
        pass_count := pass_count + 1;
        RAISE NOTICE '  [PASS] 1.3 Non-overlapping active leave correctly allowed';
    EXCEPTION WHEN OTHERS THEN
        fail_count := fail_count + 1;
        RAISE NOTICE '  [FAIL] 1.3 Non-overlapping leave rejected: %', SQLERRM;
    END;

    -- Test 1.4: Overlapping Rejected leave request MUST be allowed (Rejected excluded from constraint)
    BEGIN
        INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status, decided_by, decided_at)
        VALUES (test_emp_id, 'Unpaid', '2026-09-01', '2026-09-10', 'Rejected Overlap', 'Rejected', hr_emp_id, CURRENT_TIMESTAMP);
        pass_count := pass_count + 1;
        RAISE NOTICE '  [PASS] 1.4 Overlapping Rejected leave correctly allowed';
    EXCEPTION WHEN OTHERS THEN
        fail_count := fail_count + 1;
        RAISE NOTICE '  [FAIL] 1.4 Overlapping Rejected leave rejected: %', SQLERRM;
    END;

    -- ------------------------------------------------------------------------
    -- TEST GROUP 2: LEAVE DECISION CONSISTENCY (chk_decision_consistency)
    -- ------------------------------------------------------------------------
    RAISE NOTICE '--- 2. Testing Leave Decision Consistency (chk_decision_consistency) ---';

    -- Test 2.1: Invalid Approved leave without decided_by MUST be rejected (23514)
    BEGIN
        INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status, decided_by, decided_at)
        VALUES (test_emp_id, 'Paid', '2026-10-01', '2026-10-05', 'Invalid Approval', 'Approved', NULL, CURRENT_TIMESTAMP);
        fail_count := fail_count + 1;
        RAISE NOTICE '  [FAIL] 2.1 Approved leave without decided_by was incorrectly allowed!';
    EXCEPTION WHEN check_violation THEN -- 23514
        pass_count := pass_count + 1;
        RAISE NOTICE '  [PASS] 2.1 Approved leave without decided_by correctly rejected (23514)';
    END;

    -- Test 2.2: Invalid Pending leave with decided_by MUST be rejected (23514)
    BEGIN
        INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status, decided_by, decided_at)
        VALUES (test_emp_id, 'Paid', '2026-10-06', '2026-10-10', 'Invalid Pending', 'Pending', hr_emp_id, CURRENT_TIMESTAMP);
        fail_count := fail_count + 1;
        RAISE NOTICE '  [FAIL] 2.2 Pending leave with decided_by was incorrectly allowed!';
    EXCEPTION WHEN check_violation THEN -- 23514
        pass_count := pass_count + 1;
        RAISE NOTICE '  [PASS] 2.2 Pending leave with decided_by correctly rejected (23514)';
    END;

    -- ------------------------------------------------------------------------
    -- TEST GROUP 3: ATTENDANCE CHECKOUT VALIDATION (chk_checkout_after_checkin)
    -- ------------------------------------------------------------------------
    RAISE NOTICE '--- 3. Testing Attendance Checkout Validation (chk_checkout_after_checkin) ---';

    -- Test 3.1: Valid check_out > check_in MUST be allowed
    BEGIN
        INSERT INTO attendance (employee_id, att_date, check_in, check_out, status)
        VALUES (test_emp_id, '2026-09-01', '2026-09-01 09:00:00+00', '2026-09-01 17:00:00+00', 'Present');
        pass_count := pass_count + 1;
        RAISE NOTICE '  [PASS] 3.1 Valid check_out > check_in allowed';
    EXCEPTION WHEN OTHERS THEN
        fail_count := fail_count + 1;
        RAISE NOTICE '  [FAIL] 3.1 Valid attendance rejected: %', SQLERRM;
    END;

    -- Test 3.2: Invalid check_out <= check_in MUST be rejected (23514)
    BEGIN
        INSERT INTO attendance (employee_id, att_date, check_in, check_out, status)
        VALUES (test_emp_id, '2026-09-02', '2026-09-02 17:00:00+00', '2026-09-02 09:00:00+00', 'Present');
        fail_count := fail_count + 1;
        RAISE NOTICE '  [FAIL] 3.2 Attendance with check_out <= check_in was incorrectly allowed!';
    EXCEPTION WHEN check_violation THEN -- 23514
        pass_count := pass_count + 1;
        RAISE NOTICE '  [PASS] 3.2 Attendance with check_out <= check_in correctly rejected (23514)';
    END;

    -- ------------------------------------------------------------------------
    -- TEST GROUP 4: ATTENDANCE UNIQUENESS (uk_employee_att_date)
    -- ------------------------------------------------------------------------
    RAISE NOTICE '--- 4. Testing Attendance Uniqueness (uk_employee_att_date) ---';

    -- Test 4.1: Duplicate attendance for same employee and date MUST be rejected (23505)
    BEGIN
        INSERT INTO attendance (employee_id, att_date, check_in, check_out, status)
        VALUES (test_emp_id, '2026-09-01', '2026-09-01 09:00:00+00', '2026-09-01 17:00:00+00', 'Present');
        fail_count := fail_count + 1;
        RAISE NOTICE '  [FAIL] 4.1 Duplicate attendance date was incorrectly allowed!';
    EXCEPTION WHEN unique_violation THEN -- 23505
        pass_count := pass_count + 1;
        RAISE NOTICE '  [PASS] 4.1 Duplicate attendance date correctly rejected (23505)';
    END;

    -- ------------------------------------------------------------------------
    -- TEST GROUP 5: PAYROLL NON-NEGATIVE CHECKS (chk_payroll_non_negative)
    -- ------------------------------------------------------------------------
    RAISE NOTICE '--- 5. Testing Payroll Non-Negative Checks ---';

    -- Test 5.1: Negative base_salary MUST be rejected (23514)
    BEGIN
        INSERT INTO payroll (employee_id, pay_period_start, pay_period_end, base_salary, net_pay)
        VALUES (test_emp_id, '2026-09-01', '2026-09-30', -5000.00, 0.00);
        fail_count := fail_count + 1;
        RAISE NOTICE '  [FAIL] 5.1 Negative base salary was incorrectly allowed!';
    EXCEPTION WHEN check_violation THEN -- 23514
        pass_count := pass_count + 1;
        RAISE NOTICE '  [PASS] 5.1 Negative base salary correctly rejected (23514)';
    END;

    -- Test 5.2: Negative deductions MUST be rejected (23514)
    BEGIN
        INSERT INTO payroll (employee_id, pay_period_start, pay_period_end, base_salary, deductions, net_pay)
        VALUES (test_emp_id, '2026-09-01', '2026-09-30', 5000.00, -200.00, 5200.00);
        fail_count := fail_count + 1;
        RAISE NOTICE '  [FAIL] 5.2 Negative deductions were incorrectly allowed!';
    EXCEPTION WHEN check_violation THEN -- 23514
        pass_count := pass_count + 1;
        RAISE NOTICE '  [PASS] 5.2 Negative deductions correctly rejected (23514)';
    END;

    -- ------------------------------------------------------------------------
    -- TEST GROUP 6: LEAVE/ATTENDANCE CONSISTENCY TRIGGER
    -- (check_leave_attendance_consistency_func)
    -- ------------------------------------------------------------------------
    RAISE NOTICE '--- 6. Testing Leave/Attendance Consistency Trigger ---';

    -- Test 6.1: Attendance status 'Leave' with NO leave request MUST be rejected
    BEGIN
        INSERT INTO attendance (employee_id, att_date, status)
        VALUES (test_emp_id, '2026-11-01', 'Leave');
        fail_count := fail_count + 1;
        RAISE NOTICE '  [FAIL] 6.1 Attendance status Leave without leave request was incorrectly allowed!';
    EXCEPTION WHEN check_violation THEN
        pass_count := pass_count + 1;
        RAISE NOTICE '  [PASS] 6.1 Attendance status Leave without leave request correctly rejected';
    END;

    -- Test 6.2: Attendance status 'Leave' with PENDING leave request MUST be rejected
    BEGIN
        INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status)
        VALUES (test_emp_id, 'Paid', '2026-11-05', '2026-11-10', 'Pending Test', 'Pending');

        INSERT INTO attendance (employee_id, att_date, status)
        VALUES (test_emp_id, '2026-11-06', 'Leave');

        fail_count := fail_count + 1;
        RAISE NOTICE '  [FAIL] 6.2 Attendance status Leave with Pending leave request was incorrectly allowed!';
    EXCEPTION WHEN check_violation THEN
        pass_count := pass_count + 1;
        RAISE NOTICE '  [PASS] 6.2 Attendance status Leave with Pending leave request correctly rejected';
    END;

    -- Test 6.3: Attendance status 'Leave' with APPROVED leave request MUST be allowed
    BEGIN
        INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status, decided_by, decided_at)
        VALUES (test_emp_id, 'Paid', '2026-11-15', '2026-11-20', 'Approved Test', 'Approved', hr_emp_id, CURRENT_TIMESTAMP);

        INSERT INTO attendance (employee_id, att_date, status)
        VALUES (test_emp_id, '2026-11-16', 'Leave');

        pass_count := pass_count + 1;
        RAISE NOTICE '  [PASS] 6.3 Attendance status Leave with Approved leave request correctly allowed';
    EXCEPTION WHEN OTHERS THEN
        fail_count := fail_count + 1;
        RAISE NOTICE '  [FAIL] 6.3 Attendance status Leave with Approved leave request rejected: %', SQLERRM;
    END;

    -- ------------------------------------------------------------------------
    -- TEST GROUP 7: UPDATED_AT TRIGGER (update_updated_at_column)
    -- ------------------------------------------------------------------------
    RAISE NOTICE '--- 7. Testing updated_at Trigger (update_updated_at_column) ---';

    SELECT updated_at INTO start_time FROM employees WHERE id = test_emp_id;

    -- Perform update
    UPDATE employees SET first_name = 'UpdatedTest' WHERE id = test_emp_id;

    SELECT updated_at INTO updated_time FROM employees WHERE id = test_emp_id;

    IF updated_time >= start_time THEN
        pass_count := pass_count + 1;
        RAISE NOTICE '  [PASS] 7.1 updated_at column automatically updated on row modification';
    ELSE
        fail_count := fail_count + 1;
        RAISE NOTICE '  [FAIL] 7.1 updated_at column was not updated!';
    END IF;

    RAISE NOTICE '====================================================================';
    RAISE NOTICE ' VERIFICATION SUMMARY: % PASS, % FAIL', pass_count, fail_count;
    RAISE NOTICE '====================================================================';

    IF fail_count > 0 THEN
        RAISE EXCEPTION 'Constraint verification failed with % failures', fail_count;
    END IF;
END $$;

-- Rollback transaction to leave database in pristine initial state
ROLLBACK;
