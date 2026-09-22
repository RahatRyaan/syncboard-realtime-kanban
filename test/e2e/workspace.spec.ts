import { test, expect } from '@playwright/test';

test.describe('Workspace & RBAC Feature (Playwright E2E)', () => {
  let ownerToken: string;
  let memberToken: string;
  let strangerToken: string;
  let workspaceId: string;
  let inviteToken: string;

  test.beforeAll(async ({ request }) => {
    // Register Owner
    const ownerRes = await request.post('/api/v1/auth/register', {
      data: {
        email: `pw_owner_${Date.now()}@syncboard.dev`,
        password: 'Password123!',
        name: 'PW Owner',
      },
    });
    const ownerBody = await ownerRes.json();
    ownerToken = ownerBody.data.accessToken;

    // Register Member
    const memberRes = await request.post('/api/v1/auth/register', {
      data: {
        email: `pw_member_${Date.now()}@syncboard.dev`,
        password: 'Password123!',
        name: 'PW Member',
      },
    });
    const memberBody = await memberRes.json();
    memberToken = memberBody.data.accessToken;

    // Register Stranger
    const strangerRes = await request.post('/api/v1/auth/register', {
      data: {
        email: `pw_stranger_${Date.now()}@syncboard.dev`,
        password: 'Password123!',
        name: 'PW Stranger',
      },
    });
    const strangerBody = await strangerRes.json();
    strangerToken = strangerBody.data.accessToken;
  });

  test('AC-WS-01/02/03: create workspace with auto-generated slug and owner role', async ({ request }) => {
    const res = await request.post('/api/v1/workspaces', {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: { name: 'Playwright Engineering' },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Playwright Engineering');
    expect(body.data.slug).toContain('playwright-engineering');
    expect(body.data.members).toHaveLength(1);
    expect(body.data.members[0].role).toBe('owner');

    workspaceId = body.data.id;
  });

  test('AC-WS-05: list only workspaces for members (tenant isolation)', async ({ request }) => {
    const ownerListRes = await request.get('/api/v1/workspaces', {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const ownerList = await ownerListRes.json();
    expect(ownerList.data.some((w: any) => w.id === workspaceId)).toBe(true);

    const strangerListRes = await request.get('/api/v1/workspaces', {
      headers: { Authorization: `Bearer ${strangerToken}` },
    });
    const strangerList = await strangerListRes.json();
    expect(strangerList.data.some((w: any) => w.id === workspaceId)).toBe(false);
  });

  test('AC-WS-06/07: get workspace by ID enforces membership access', async ({ request }) => {
    const memberAccess = await request.get(`/api/v1/workspaces/${workspaceId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(memberAccess.status()).toBe(200);

    const strangerAccess = await request.get(`/api/v1/workspaces/${workspaceId}`, {
      headers: { Authorization: `Bearer ${strangerToken}` },
    });
    expect(strangerAccess.status()).toBe(403);
  });

  test('AC-WS-10/11: invite member and accept invite', async ({ request }) => {
    const inviteRes = await request.post(`/api/v1/workspaces/${workspaceId}/invites`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: {
        email: 'invited@syncboard.dev',
        role: 'member',
      },
    });

    expect(inviteRes.status()).toBe(201);
    const inviteBody = await inviteRes.json();
    inviteToken = inviteBody.data.inviteToken;
    expect(inviteToken).toBeDefined();

    const acceptRes = await request.post(`/api/v1/workspaces/invites/${inviteToken}/accept`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    expect(acceptRes.status()).toBe(200);
    const acceptBody = await acceptRes.json();
    expect(acceptBody.data.members.some((m: any) => m.role === 'member')).toBe(true);
  });

  test('AC-WS-08/09: RolesGuard allows owner to update, rejects member with 403', async ({ request }) => {
    // Member attempt -> 403
    const memberAttempt = await request.patch(`/api/v1/workspaces/${workspaceId}`, {
      headers: { Authorization: `Bearer ${memberToken}` },
      data: { name: 'Member Update Attempt' },
    });
    expect(memberAttempt.status()).toBe(403);

    // Owner attempt -> 200
    const ownerAttempt = await request.patch(`/api/v1/workspaces/${workspaceId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: { name: 'Engineering Pro', plan: 'pro' },
    });
    expect(ownerAttempt.status()).toBe(200);
    const body = await ownerAttempt.json();
    expect(body.data.name).toBe('Engineering Pro');
    expect(body.data.plan).toBe('pro');
  });
});
