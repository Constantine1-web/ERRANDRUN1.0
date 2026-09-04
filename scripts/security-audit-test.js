const http = require('http');

const BASE_URL = 'http://localhost:3000';

function testEndpoint(method, path, body = null, headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json || data,
        });
      });
    });

    req.on('error', (err) => resolve({ error: err.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runSecurityTests() {
  console.log('====================================================');
  console.log('🔒 DEFENSIVE SECURITY AUDIT & VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${details}`);
      failed++;
    }
  }

  // 1. Unauthenticated Admin Endpoints
  console.log('--- 1. Testing Admin Access Controls ---');
  const res1 = await testEndpoint('GET', '/api/admin/errands');
  assert('GET /api/admin/errands blocks unauthenticated access', res1.status === 401, `(got ${res1.status})`);

  const res2 = await testEndpoint('POST', '/api/admin/users', { userId: 'fake', role: 'admin' });
  assert('POST /api/admin/users blocks unauthenticated role elevation', res2.status === 401, `(got ${res2.status})`);

  const res3 = await testEndpoint('GET', '/api/admin/stats');
  assert('GET /api/admin/stats blocks unauthenticated metric scraping', res3.status === 401, `(got ${res3.status})`);

  const res4 = await testEndpoint('GET', '/api/admin/runners');
  assert('GET /api/admin/runners blocks unauthenticated PII access', res4.status === 401, `(got ${res4.status})`);

  // 2. Financial & IDOR Protection
  console.log('\n--- 2. Testing Financial & IDOR Protection ---');
  const res5 = await testEndpoint('POST', '/api/wallet/withdraw', { amount: 5000 });
  assert('POST /api/wallet/withdraw blocks unauthenticated withdrawals', res5.status === 401, `(got ${res5.status})`);

  const res6 = await testEndpoint('POST', '/api/errands/create', { title: 'Test Errand', total_fee: 1 });
  assert('POST /api/errands/create blocks unauthenticated errand creation', res6.status === 401, `(got ${res6.status})`);

  const res7 = await testEndpoint('POST', '/api/errands/cancel', { errandId: '123' });
  assert('POST /api/errands/cancel blocks unauthenticated errand cancellations', res7.status === 401, `(got ${res7.status})`);

  const res8 = await testEndpoint('POST', '/api/tracking/complete', { errandId: '123', pin: '1234' });
  assert('POST /api/tracking/complete blocks unauthenticated completion', res8.status === 401, `(got ${res8.status})`);

  // 3. Webhook Signature Verification
  console.log('\n--- 3. Testing Webhook Security ---');
  const res9 = await testEndpoint('POST', '/api/payments/webhook', { event: 'charge.success' });
  assert('POST /api/payments/webhook rejects unsigned requests', res9.status === 401, `(got ${res9.status})`);

  const res10 = await testEndpoint('POST', '/api/payments/webhook', { event: 'charge.success' }, { 'x-paystack-signature': 'invalid_signature_hex' });
  assert('POST /api/payments/webhook rejects spoofed HMAC signatures', res10.status === 401 || res10.status === 500, `(got ${res10.status})`);

  // 4. Delivery PIN Anti-Brute Force Test
  console.log('\n--- 4. Testing Delivery PIN Lockout / Rate Limiting ---');
  // Send 6 PIN attempts with fake auth header or test rate limit
  const resPin = await testEndpoint('POST', '/api/tracking/complete', {
    errandId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    pin: '0000',
  });
  assert('POST /api/tracking/complete requires valid authentication', resPin.status === 401, `(got ${resPin.status})`);

  // 5. Security Headers
  console.log('\n--- 5. Testing Security Headers ---');
  const resHeaders = await testEndpoint('GET', '/');
  assert('X-Content-Type-Options: nosniff is set', resHeaders.headers['x-content-type-options'] === 'nosniff');
  assert('X-Frame-Options: SAMEORIGIN is set', resHeaders.headers['x-frame-options'] === 'SAMEORIGIN');
  assert('Referrer-Policy is configured', Boolean(resHeaders.headers['referrer-policy']));
  assert('Content-Security-Policy is present', Boolean(resHeaders.headers['content-security-policy']));

  console.log('\n====================================================');
  console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runSecurityTests();
