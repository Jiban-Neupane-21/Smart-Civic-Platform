const BASE_URL = 'http://localhost:3000';

interface TestResult {
  id: string;
  name: string;
  method: string;
  endpoint: string;
  expectedStatus: number;
  actualStatus: number;
  latencyMs: number;
  status: 'PASS' | 'FAIL';
  notes: string;
}

const results: TestResult[] = [];

async function runTest(
  id: string,
  name: string,
  method: string,
  url: string,
  body?: any,
  headers: Record<string, string> = {},
  expectedStatus: number = 200
) {
  const start = Date.now();
  try {
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const res = await fetch(`${BASE_URL}${url}`, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
    });
    const latency = Date.now() - start;
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    const passed = res.status === expectedStatus;
    const r: TestResult = {
      id,
      name,
      method,
      endpoint: url,
      expectedStatus,
      actualStatus: res.status,
      latencyMs: latency,
      status: passed ? 'PASS' : 'FAIL',
      notes: passed
        ? 'OK'
        : `Got ${res.status}: ${JSON.stringify(data || {}).slice(0, 70)}`,
    };
    results.push(r);
    console.log(`[${r.status}] ${r.id} | ${r.method.padEnd(6)} ${r.endpoint.slice(0, 42).padEnd(44)} | Status: ${r.actualStatus}/${r.expectedStatus} | ${r.latencyMs}ms`);
    return { res, data };
  } catch (err: any) {
    const latency = Date.now() - start;
    const r: TestResult = {
      id,
      name,
      method,
      endpoint: url,
      expectedStatus,
      actualStatus: 0,
      latencyMs: latency,
      status: 'FAIL',
      notes: `Error/Timeout: ${err.message}`,
    };
    results.push(r);
    console.log(`[FAIL] ${r.id} | ${r.method.padEnd(6)} ${r.endpoint.slice(0, 42).padEnd(44)} | ERROR: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('=== MULTI-ROLE LIVE API TEST SUITE ===');

  // 1. Health
  await runTest('TC-L01', 'System Health Check', 'GET', '/health', undefined, {}, 200);

  // 2. Public Endpoints
  const prov = await runTest('TC-L02', 'Public Provinces', 'GET', '/api/public/provinces', undefined, {}, 200);
  const provId = prov?.data?.data?.[0]?.id || '917b730e-3199-44e0-b45e-a69e584483be';
  const dist = await runTest('TC-L03', 'Public Districts Filtered', 'GET', `/api/public/districts?province_id=${provId}`, undefined, {}, 200);
  const distId = dist?.data?.data?.[0]?.id || 'a0000000-0000-0000-0000-000000000001';
  await runTest('TC-L04', 'Public Municipalities Filtered', 'GET', `/api/public/municipalities?district_id=${distId}`, undefined, {}, 200);
  await runTest('TC-L05', 'Public Active Municipalities', 'GET', '/api/public/active-municipalities', undefined, {}, 200);
  await runTest('TC-L06', 'Public Complaint Track 404', 'GET', '/api/public/complaints/track/INVALID-TRACK-000', undefined, {}, 404);
  await runTest('TC-L07', 'Public Invite Validation 400', 'GET', '/api/public/invite/validate?token=invalid_token', undefined, {}, 400);

  // 3. Auth Validation & Negative
  await runTest('TC-L08', 'Login Missing Body (422)', 'POST', '/api/auth/login', {}, {}, 422);
  await runTest('TC-L09', 'Login Invalid Password (401)', 'POST', '/api/auth/login', { email: 'superadmin@civic.gov.np', password: 'WrongPassword!' }, {}, 401);

  // 4. Auth Logins
  const saRes = await runTest('TC-L10', 'Superadmin Login', 'POST', '/api/auth/login', {
    email: 'superadmin@civic.gov.np',
    password: 'SuperAdmin@123!',
  }, {}, 200);
  const saToken = saRes?.data?.data?.access_token;

  const citizenRes = await runTest('TC-L11', 'Citizen Login', 'POST', '/api/auth/login', {
    email: 'neupanejiban@gmail.com',
    password: '@Neupane212',
  }, {}, 200);
  const citizenToken = citizenRes?.data?.data?.access_token;

  // 5. Auth /me
  if (saToken) await runTest('TC-L12', 'Auth Me (Superadmin)', 'GET', '/api/auth/me', undefined, { Authorization: `Bearer ${saToken}` }, 200);
  if (citizenToken) await runTest('TC-L13', 'Auth Me (Citizen)', 'GET', '/api/auth/me', undefined, { Authorization: `Bearer ${citizenToken}` }, 200);

  // 6. Citizen Operations
  if (citizenToken) {
    await runTest('TC-L14', 'Citizen Dashboard', 'GET', '/api/citizen/dashboard', undefined, { Authorization: `Bearer ${citizenToken}` }, 200);
    await runTest('TC-L15', 'Citizen Complaints List', 'GET', '/api/citizen/complaints', undefined, { Authorization: `Bearer ${citizenToken}` }, 200);
    await runTest('TC-L16', 'Citizen Notifications Unread', 'GET', '/api/notifications/unread-count', undefined, { Authorization: `Bearer ${citizenToken}` }, 200);
    await runTest('TC-L17', 'Citizen Notifications List', 'GET', '/api/notifications', undefined, { Authorization: `Bearer ${citizenToken}` }, 200);
    await runTest('TC-L18', 'Citizen Mark All Read', 'PATCH', '/api/notifications/read-all', {}, { Authorization: `Bearer ${citizenToken}` }, 200);
  }

  // 7. Superadmin Operations (/api/v1/superadmin & /api/superadmin)
  if (saToken) {
    await runTest('TC-L19', 'Superadmin Macro Analytics', 'GET', '/api/v1/superadmin/analytics', undefined, { Authorization: `Bearer ${saToken}` }, 200);
    await runTest('TC-L20', 'Superadmin Audit Logs', 'GET', '/api/v1/superadmin/audit-logs', undefined, { Authorization: `Bearer ${saToken}` }, 200);
    await runTest('TC-L21', 'Superadmin Municipalities List', 'GET', '/api/v1/superadmin/municipalities', undefined, { Authorization: `Bearer ${saToken}` }, 200);
    await runTest('TC-L22', 'Superadmin Reference Provinces', 'GET', '/api/v1/superadmin/provinces', undefined, { Authorization: `Bearer ${saToken}` }, 200);
  }

  // 8. Strict RBAC Cross-Role Boundary Enforcements
  if (citizenToken) {
    await runTest('TC-L23', 'RBAC: Citizen Blocked from Superadmin Analytics', 'GET', '/api/v1/superadmin/analytics', undefined, { Authorization: `Bearer ${citizenToken}` }, 403);
    await runTest('TC-L24', 'RBAC: Citizen Blocked from Municipality Analytics', 'GET', '/api/municipality/analytics', undefined, { Authorization: `Bearer ${citizenToken}` }, 403);
    await runTest('TC-L25', 'RBAC: Citizen Blocked from Dept Queue', 'GET', '/api/department/queue', undefined, { Authorization: `Bearer ${citizenToken}` }, 403);
    await runTest('TC-L26', 'RBAC: Citizen Blocked from Staff KYC', 'GET', '/api/staff/kyc', undefined, { Authorization: `Bearer ${citizenToken}` }, 403);
    await runTest('TC-L27', 'RBAC: Citizen Blocked from Municipality KYC', 'GET', '/api/municipality/kyc-pending', undefined, { Authorization: `Bearer ${citizenToken}` }, 403);
  }

  // 9. Unauthenticated & Invalid Token Security Boundary
  await runTest('TC-L28', 'Sec: Unauthenticated Blocked from Notifications', 'GET', '/api/notifications', undefined, {}, 401);
  await runTest('TC-L29', 'Sec: Malformed Bearer Token', 'GET', '/api/auth/me', undefined, { Authorization: 'Bearer invalid_token' }, 401);
  await runTest('TC-L30', 'Sec: Non-existent Route 404', 'GET', '/api/nonexistent-route-path-xyz', undefined, {}, 404);

  // 10. Swagger Docs & OpenAPI Specification
  await runTest('TC-L31', 'OpenAPI 3.0 Spec JSON Served', 'GET', '/api/docs/swagger.json', undefined, {}, 200);

  console.log('\n=============================================');
  console.log('         LIVE TEST EXECUTION SUMMARY         ');
  console.log('=============================================');
  let passCount = 0;
  for (const r of results) {
    if (r.status === 'PASS') passCount++;
  }
  console.log(`Total Executed: ${results.length} | Passed: ${passCount} | Failed: ${results.length - passCount}`);
  console.log(`Pass Rate: ${((passCount / results.length) * 100).toFixed(1)}%`);
  console.log('=============================================');
}

main().catch(console.error);
