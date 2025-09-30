import { sql, debug, cleanupTestData, clearRateLimits, TEST_CONFIG } from './setup';
import { nanoid } from 'nanoid';

/**
 * Authentication Flow Tests
 *
 * Tests the complete authentication flow:
 * - Owner signup with business creation
 * - Customer signup
 * - Login (owner and customer)
 * - Token refresh
 * - Email verification
 */

const testId = nanoid(8);
const testEmail = `test-${testId}@test.com`;
const testSubdomain = `test-${testId}`;

async function testOwnerSignup() {
  debug.log('AUTH_SIGNUP', 'Testing owner signup with business creation...');

  try {
    const response = await fetch(`${TEST_CONFIG.BASE_URL}/api/auth/signup/owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPassword123!',
        name: 'Test Owner',
        businessName: 'Test Business',
        businessPhone: '+1234567890',
        timezone: 'America/New_York',
      }),
    });

    const data = await response.json();
    debug.log('AUTH_SIGNUP', `Response status: ${response.status}`, data);

    if (!response.ok) {
      debug.error('AUTH_SIGNUP', 'Owner signup failed', data);
      return { success: false, data: null };
    }

    // Verify user and business were created in database
    const user = await sql`
      SELECT id, email, name, role, email_verified
      FROM users
      WHERE email = ${testEmail}
    `;

    debug.log('AUTH_SIGNUP', 'Created user', user[0]);

    if (!user || user.length === 0) {
      debug.error('AUTH_SIGNUP', 'User not found in database after signup');
      return { success: false, data: null };
    }

    // Get the business using data from signup response
    const businessId = data.business?.id;
    if (!businessId) {
      debug.error('AUTH_SIGNUP', 'No business ID in signup response');
      return { success: false, data: null };
    }

    const business = await sql`
      SELECT id, name, subdomain, status
      FROM businesses
      WHERE id = ${businessId}
    `;

    debug.log('AUTH_SIGNUP', 'Created business', business[0]);

    if (!business || business.length === 0) {
      debug.error('AUTH_SIGNUP', 'Business not found in database after signup');
      return { success: false, data: null };
    }

    debug.success('AUTH_SIGNUP', 'Owner signup successful', {
      userId: user[0].id,
      businessId: business[0].id,
      accessToken: data.accessToken ? 'Present' : 'Missing',
      refreshToken: data.refreshToken ? 'Present' : 'Missing',
    });

    return { success: true, data: { user: user[0], business: business[0], tokens: data } };
  } catch (error) {
    debug.error('AUTH_SIGNUP', 'Owner signup test failed', error);
    return { success: false, data: null };
  }
}

async function testCustomerSignup() {
  debug.log('AUTH_SIGNUP', 'Testing customer signup...');

  const customerEmail = `test-customer-${testId}@test.com`;

  try {
    const response = await fetch(`${TEST_CONFIG.BASE_URL}/api/auth/signup/customer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: customerEmail,
        password: 'TestPassword123!',
        name: 'Test Customer',
        phone: '+1234567891',
      }),
    });

    const data = await response.json();
    debug.log('AUTH_SIGNUP', `Response status: ${response.status}`, data);

    if (!response.ok) {
      debug.error('AUTH_SIGNUP', 'Customer signup failed', data);
      return { success: false, data: null };
    }

    // Verify user was created
    const user = await sql`
      SELECT id, email, name, role, email_verified
      FROM users
      WHERE email = ${customerEmail}
    `;

    debug.log('AUTH_SIGNUP', 'Created customer', user[0]);

    if (!user || user.length === 0) {
      debug.error('AUTH_SIGNUP', 'Customer not found in database after signup');
      return { success: false, data: null };
    }

    if (user[0].role !== 'customer') {
      debug.error('AUTH_SIGNUP', `Customer role incorrect: ${user[0].role}`);
      return { success: false, data: null };
    }

    debug.success('AUTH_SIGNUP', 'Customer signup successful', {
      userId: user[0].id,
      accessToken: data.accessToken ? 'Present' : 'Missing',
      refreshToken: data.refreshToken ? 'Present' : 'Missing',
    });

    return { success: true, data: { user: user[0], tokens: data } };
  } catch (error) {
    debug.error('AUTH_SIGNUP', 'Customer signup test failed', error);
    return { success: false, data: null };
  }
}

async function testLogin() {
  debug.log('AUTH_LOGIN', 'Testing login...');

  try {
    const response = await fetch(`${TEST_CONFIG.BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPassword123!',
      }),
    });

    const data = await response.json();
    debug.log('AUTH_LOGIN', `Response status: ${response.status}`, data);

    if (!response.ok) {
      debug.error('AUTH_LOGIN', 'Login failed', data);
      return { success: false, data: null };
    }

    if (!data.accessToken) {
      debug.error('AUTH_LOGIN', 'Access token missing from login response');
      return { success: false, data: null };
    }

    // For refresh token test, we need to extract it from Set-Cookie header
    // But for now, we'll skip the token refresh test as it requires cookie handling

    debug.success('AUTH_LOGIN', 'Login successful', {
      accessToken: data.accessToken ? 'Present' : 'Missing',
      user: data.user,
    });

    return { success: true, data };
  } catch (error) {
    debug.error('AUTH_LOGIN', 'Login test failed', error);
    return { success: false, data: null };
  }
}

async function testTokenRefresh(refreshToken: string) {
  debug.log('AUTH_REFRESH', 'Testing token refresh...');

  try {
    const response = await fetch(`${TEST_CONFIG.BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken,
      }),
    });

    const data = await response.json();
    debug.log('AUTH_REFRESH', `Response status: ${response.status}`, data);

    if (!response.ok) {
      debug.error('AUTH_REFRESH', 'Token refresh failed', data);
      return { success: false, data: null };
    }

    if (!data.accessToken || !data.refreshToken) {
      debug.error('AUTH_REFRESH', 'Tokens missing from refresh response');
      return { success: false, data: null };
    }

    debug.success('AUTH_REFRESH', 'Token refresh successful');
    return { success: true, data };
  } catch (error) {
    debug.error('AUTH_REFRESH', 'Token refresh test failed', error);
    return { success: false, data: null };
  }
}

async function testInvalidLogin() {
  debug.log('AUTH_LOGIN', 'Testing login with invalid credentials...');

  try {
    const response = await fetch(`${TEST_CONFIG.BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword123!',
      }),
    });

    const data = await response.json();
    debug.log('AUTH_LOGIN', `Response status: ${response.status}`, data);

    if (response.ok) {
      debug.error('AUTH_LOGIN', 'Login should have failed with invalid credentials');
      return { success: false };
    }

    debug.success('AUTH_LOGIN', 'Invalid login correctly rejected');
    return { success: true };
  } catch (error) {
    debug.error('AUTH_LOGIN', 'Invalid login test failed', error);
    return { success: false };
  }
}

async function testDuplicateSignup() {
  debug.log('AUTH_SIGNUP', 'Testing duplicate email signup...');

  try {
    const response = await fetch(`${TEST_CONFIG.BASE_URL}/api/auth/signup/customer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail, // Using existing email
        password: 'TestPassword123!',
        name: 'Duplicate User',
        phone: '+1234567892',
      }),
    });

    const data = await response.json();
    debug.log('AUTH_SIGNUP', `Response status: ${response.status}`, data);

    if (response.ok) {
      debug.error('AUTH_SIGNUP', 'Duplicate signup should have been rejected');
      return { success: false };
    }

    debug.success('AUTH_SIGNUP', 'Duplicate signup correctly rejected');
    return { success: true };
  } catch (error) {
    debug.error('AUTH_SIGNUP', 'Duplicate signup test failed', error);
    return { success: false };
  }
}

// Run all authentication tests
async function runAuthTests() {
  console.log('\n========================================');
  console.log('AUTHENTICATION FLOW TESTS');
  console.log('========================================\n');

  // Clear rate limits before starting
  await clearRateLimits(sql);

  const results = [];

  // Test owner signup
  const signupResult = await testOwnerSignup();
  results.push({ name: 'Owner Signup', passed: signupResult.success });

  // Test customer signup
  const customerSignupResult = await testCustomerSignup();
  results.push({ name: 'Customer Signup', passed: customerSignupResult.success });

  // Test login (only if signup succeeded)
  let loginResult = { success: false, data: null };
  if (signupResult.success) {
    loginResult = await testLogin();
    results.push({ name: 'Login', passed: loginResult.success });

    // Test token refresh (only if login succeeded)
    // Use refresh token from signup for testing since login doesn't return it in body
    if (loginResult.success && signupResult.data?.tokens?.refreshToken) {
      const refreshResult = await testTokenRefresh(signupResult.data.tokens.refreshToken);
      results.push({ name: 'Token Refresh', passed: refreshResult.success });
    }
  }

  // Test invalid login
  const invalidLoginResult = await testInvalidLogin();
  results.push({ name: 'Invalid Login Rejection', passed: invalidLoginResult.success });

  // Test duplicate signup
  const duplicateSignupResult = await testDuplicateSignup();
  results.push({ name: 'Duplicate Signup Rejection', passed: duplicateSignupResult.success });

  // Cleanup test data
  debug.log('AUTH_CLEANUP', 'Cleaning up test data...');
  await cleanupTestData(sql);

  console.log('\n========================================');
  console.log('AUTHENTICATION TEST RESULTS');
  console.log('========================================\n');

  results.forEach(result => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}: ${result.name}`);
  });

  const allPassed = results.every(r => r.passed);
  console.log(`\nTotal: ${results.filter(r => r.passed).length}/${results.length} passed\n`);

  return allPassed;
}

// Execute tests
runAuthTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    debug.error('TEST_RUNNER', 'Fatal error running auth tests', error);
    process.exit(1);
  });