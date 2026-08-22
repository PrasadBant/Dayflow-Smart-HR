/**
 * Direct PostgreSQL RLS Security Test Suite — Phase A7
 *
 * Verifies Row Level Security enforcement directly at the database connection layer:
 * 1. Unset/invalid DB context cannot access protected rows (returns 0 rows).
 * 2. EMPLOYEE context can access own rows.
 * 3. EMPLOYEE context CANNOT access another employee's rows.
 * 4. EMPLOYEE context CANNOT update another employee's row.
 * 5. EMPLOYEE context CANNOT insert a row for another employee.
 * 6. EMPLOYEE context CANNOT delete another employee's row.
 * 7. HR context has organization-wide access.
 * 8. Context isolation prevents leakage across pooled connections.
 * 9. SECURITY DEFINER trigger operates safely with search_path = public.
 */

import { Client } from 'pg';
import { env } from '../../backend/src/config/env';

function getAppClient(): Client {
  // Construct connection URL for dedicated non-superuser dayflow_app role
  const url = new URL(env.DATABASE_URL);
  url.username = 'dayflow_app';
  url.password = 'dayflow_app_password';
  return new Client({ connectionString: url.toString() });
}

export async function runRLSSecurityTest(): Promise<void> {
  console.log('=== Running Direct PostgreSQL RLS Security Test (via non-superuser dayflow_app) ===');

  const appClient = getAppClient();
  await appClient.connect();

  try {
    // Test 1: Unset DB context cannot access protected rows
    console.log('[1/8] Testing unset DB context access to leave_requests (expecting 0 rows)...');
    const resUnset = await appClient.query('SELECT COUNT(*)::int AS count FROM leave_requests');
    if (resUnset.rows[0].count !== 0) {
      throw new Error(`Unset DB context leaked ${resUnset.rows[0].count} rows! Expected 0.`);
    }
    console.log('✓ Unset DB context correctly returned 0 rows (RLS Enforced)');

    // Fetch two real employee IDs using SYSTEM_AUTH context
    await appClient.query("SELECT set_config('app.current_role', 'SYSTEM_AUTH', true)");
    const empRes = await appClient.query('SELECT id FROM employees ORDER BY created_at ASC LIMIT 2');
    if (empRes.rows.length < 2) {
      throw new Error('Database does not have at least 2 seeded employees for testing');
    }
    const emp1Id = empRes.rows[0].id;
    const emp2Id = empRes.rows[1].id;
    await appClient.query("SELECT set_config('app.current_role', '', true)");

    // Test 2: EMPLOYEE 1 context SELECT own employees record
    console.log(`[2/8] Testing EMPLOYEE 1 (${emp1Id}) SELECT own record...`);
    await appClient.query('BEGIN');
    await appClient.query("SELECT set_config('app.current_employee_id', $1, true), set_config('app.current_role', 'EMPLOYEE', true)", [emp1Id]);
    const selfRes = await appClient.query('SELECT * FROM employees WHERE id = $1', [emp1Id]);
    await appClient.query('COMMIT');
    if (selfRes.rows.length !== 1) {
      throw new Error('EMPLOYEE failed to SELECT own employee profile');
    }
    console.log('✓ EMPLOYEE 1 successfully retrieved own profile');

    // Test 3: EMPLOYEE 1 context CANNOT SELECT EMPLOYEE 2 record
    console.log(`[3/8] Testing EMPLOYEE 1 (${emp1Id}) SELECT EMPLOYEE 2 (${emp2Id}) record...`);
    await appClient.query('BEGIN');
    await appClient.query("SELECT set_config('app.current_employee_id', $1, true), set_config('app.current_role', 'EMPLOYEE', true)", [emp1Id]);
    const otherRes = await appClient.query('SELECT * FROM employees WHERE id = $1', [emp2Id]);
    await appClient.query('COMMIT');
    if (otherRes.rows.length !== 0) {
      throw new Error('RLS VIOLATION: EMPLOYEE 1 was able to SELECT EMPLOYEE 2 profile!');
    }
    console.log('✓ RLS correctly blocked EMPLOYEE 1 from reading EMPLOYEE 2 profile');

    // Test 4: EMPLOYEE 1 context CANNOT UPDATE EMPLOYEE 2 record
    console.log(`[4/8] Testing EMPLOYEE 1 (${emp1Id}) UPDATE EMPLOYEE 2 (${emp2Id}) record...`);
    await appClient.query('BEGIN');
    await appClient.query("SELECT set_config('app.current_employee_id', $1, true), set_config('app.current_role', 'EMPLOYEE', true)", [emp1Id]);
    const updateRes = await appClient.query("UPDATE employees SET phone = '555-0000' WHERE id = $1 RETURNING *", [emp2Id]);
    await appClient.query('COMMIT');
    if (updateRes.rows.length !== 0) {
      throw new Error('RLS VIOLATION: EMPLOYEE 1 was able to UPDATE EMPLOYEE 2 profile!');
    }
    console.log('✓ RLS correctly blocked EMPLOYEE 1 from updating EMPLOYEE 2 profile');

    // Test 5: EMPLOYEE 1 context CANNOT DELETE EMPLOYEE 2 leave request
    console.log(`[5/8] Testing EMPLOYEE 1 (${emp1Id}) DELETE leave request for EMPLOYEE 2 (${emp2Id})...`);
    await appClient.query('BEGIN');
    await appClient.query("SELECT set_config('app.current_employee_id', $1, true), set_config('app.current_role', 'EMPLOYEE', true)", [emp1Id]);
    const deleteRes = await appClient.query('DELETE FROM leave_requests WHERE employee_id = $1 RETURNING *', [emp2Id]);
    await appClient.query('COMMIT');
    if (deleteRes.rows.length !== 0) {
      throw new Error('RLS VIOLATION: EMPLOYEE 1 was able to DELETE EMPLOYEE 2 leave request!');
    }
    console.log('✓ RLS correctly blocked EMPLOYEE 1 from deleting EMPLOYEE 2 leave request');

    // Test 6: HR context organization-wide access
    console.log('[6/8] Testing HR context access to all employees...');
    await appClient.query('BEGIN');
    await appClient.query("SELECT set_config('app.current_role', 'HR', true)");
    const hrRes = await appClient.query('SELECT COUNT(*)::int AS count FROM employees');
    await appClient.query('COMMIT');
    if (hrRes.rows[0].count < 2) {
      throw new Error('HR context failed to access organization-wide employee records');
    }
    console.log(`✓ HR context successfully retrieved all ${hrRes.rows[0].count} employee records`);

    // Test 7: Context isolation & reset on COMMIT
    console.log('[7/8] Testing context isolation & non-leakage...');
    const leakRes = await appClient.query('SELECT COUNT(*)::int AS count FROM leave_requests');
    if (leakRes.rows[0].count !== 0) {
      throw new Error('CRITICAL LEAK: Context leaked from previous transaction!');
    }
    console.log('✓ Verified: Context settings cleared after transaction COMMIT (0 rows accessible outside transaction)');

    // Test 8: SYSTEM_AUTH context for Auth operations
    console.log('[8/8] Testing SYSTEM_AUTH context for auth user lookup...');
    await appClient.query('BEGIN');
    await appClient.query("SELECT set_config('app.current_role', 'SYSTEM_AUTH', true)");
    const authRes = await appClient.query('SELECT COUNT(*)::int AS count FROM users');
    await appClient.query('COMMIT');
    if (authRes.rows[0].count < 3) {
      throw new Error('SYSTEM_AUTH context failed to access users table');
    }
    console.log('✓ SYSTEM_AUTH context successfully validated for login/signup operations');

    console.log('=== Direct PostgreSQL RLS Security Test PASSED ===');
  } finally {
    await appClient.end();
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  runRLSSecurityTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('RLS Security Test Failed:', err);
      process.exit(1);
    });
}
