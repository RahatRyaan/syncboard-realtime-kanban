import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
const cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { EnvelopeInterceptor } from '../src/common/interceptors/envelope.interceptor';
import { createGlobalValidationPipe } from '../src/common/pipes/validation.pipe';

describe('Workspace & RBAC Module (E2E)', () => {
  let app: INestApplication;

  let ownerToken: string;
  let memberToken: string;
  let strangerToken: string;

  let ownerId: string;
  let memberId: string;
  let strangerId: string;

  let workspaceId: string;
  let inviteToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(createGlobalValidationPipe());
    app.useGlobalInterceptors(new EnvelopeInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    // Create Owner User
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `ws_owner_${Date.now()}@syncboard.dev`,
        password: 'Password123!',
        name: 'Workspace Owner',
      })
      .expect(201);
    ownerToken = ownerRes.body.data.accessToken;
    ownerId = ownerRes.body.data.user.id;

    // Create Member User (to be invited)
    const memberRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `ws_member_${Date.now()}@syncboard.dev`,
        password: 'Password123!',
        name: 'Workspace Member',
      })
      .expect(201);
    memberToken = memberRes.body.data.accessToken;
    memberId = memberRes.body.data.user.id;

    // Create Stranger User (not a member)
    const strangerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `ws_stranger_${Date.now()}@syncboard.dev`,
        password: 'Password123!',
        name: 'Stranger User',
      })
      .expect(201);
    strangerToken = strangerRes.body.data.accessToken;
    strangerId = strangerRes.body.data.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/workspaces', () => {
    it('AC-WS-01/02/03: should create a workspace and set creator as owner in members', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Acme Corp Collaboration' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Acme Corp Collaboration');
      expect(res.body.data.slug).toContain('acme-corp-collaboration');
      expect(res.body.data.members).toHaveLength(1);
      expect(res.body.data.members[0].userId).toBe(ownerId);
      expect(res.body.data.members[0].role).toBe('owner');

      workspaceId = res.body.data.id;
    });

    it('AC-WS-04: should reject invalid workspace name with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: '' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/workspaces & GET /api/v1/workspaces/:id', () => {
    it('AC-WS-05: list should return workspaces only for members (tenant boundary)', async () => {
      // Owner should see the workspace
      const ownerList = await request(app.getHttpServer())
        .get('/api/v1/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(ownerList.body.data.length).toBeGreaterThanOrEqual(1);
      expect(ownerList.body.data.some((w: any) => w.id === workspaceId)).toBe(true);

      // Stranger should see empty list
      const strangerList = await request(app.getHttpServer())
        .get('/api/v1/workspaces')
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(200);

      expect(strangerList.body.data.some((w: any) => w.id === workspaceId)).toBe(false);
    });

    it('AC-WS-06: member can fetch workspace by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(workspaceId);
      expect(res.body.data.name).toBe('Acme Corp Collaboration');
    });

    it('AC-WS-07: non-member gets 403 Forbidden when fetching workspace by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/v1/workspaces/:id/invites & Acceptance Flow', () => {
    it('AC-WS-10: owner can create invite token for a new member', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceId}/invites`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'member@syncboard.dev',
          role: 'member',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.inviteToken).toBeDefined();
      expect(res.body.data.role).toBe('member');

      inviteToken = res.body.data.inviteToken;
    });

    it('AC-WS-11: invited user can accept invite and joins workspace', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/workspaces/invites/${inviteToken}/accept`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.members.some((m: any) => m.userId === memberId && m.role === 'member')).toBe(true);

      // Now member can access workspace directly
      await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
    });

    it('AC-WS-12: accepting already-accepted invite returns 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/workspaces/invites/${inviteToken}/accept`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already been accepted');
    });
  });

  describe('PATCH /api/v1/workspaces/:id & RBAC Guard', () => {
    it('AC-WS-08: owner can update workspace name and plan', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Acme Corp Updated', plan: 'pro' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Acme Corp Updated');
      expect(res.body.data.plan).toBe('pro');
    });

    it('AC-WS-09: member with role=member is rejected by RolesGuard with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Hacked Workspace Name' })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
