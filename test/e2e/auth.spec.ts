import { test, expect } from '@playwright/test';

test.describe('Auth Feature (Playwright E2E)', () => {
  const testUser = {
    email: `pw_auth_${Date.now()}@syncboard.dev`,
    password: 'SecurePassword123!',
    name: 'Playwright Auth User',
  };

  let accessToken: string;
  let refreshCookieHeader: string;

  test('AC-AUTH-01/02/03: register new user with Argon2 and receive tokens + cookie', async ({ request }) => {
    const res = await request.post('/api/v1/auth/register', {
      data: testUser,
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe(testUser.email.toLowerCase());
    expect(body.data.user.password).toBeUndefined();
    expect(body.data.accessToken).toBeDefined();

    accessToken = body.data.accessToken;

    const setCookie = res.headers()['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain('sb_refresh');
    refreshCookieHeader = setCookie;
  });

  test('AC-AUTH-04: reject duplicate registration with 409', async ({ request }) => {
    const res = await request.post('/api/v1/auth/register', {
      data: testUser,
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('AC-AUTH-05: reject short password with 400 validation error', async ({ request }) => {
    const res = await request.post('/api/v1/auth/register', {
      data: {
        email: 'invalid_pwd@example.com',
        password: 'short',
        name: 'Invalid Pwd',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('AC-AUTH-06/07: login with valid credentials', async ({ request }) => {
    const res = await request.post('/api/v1/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.password,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
  });

  test('AC-AUTH-08: reject invalid password with 401', async ({ request }) => {
    const res = await request.post('/api/v1/auth/login', {
      data: {
        email: testUser.email,
        password: 'WrongPassword!',
      },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('AC-AUTH-14: access /auth/me with Bearer token', async ({ request }) => {
    const res = await request.get('/api/v1/auth/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.email).toBe(testUser.email.toLowerCase());
  });

  test('AC-AUTH-15: reject /auth/me without token with 401', async ({ request }) => {
    const res = await request.get('/api/v1/auth/me');
    expect(res.status()).toBe(401);
  });
});
