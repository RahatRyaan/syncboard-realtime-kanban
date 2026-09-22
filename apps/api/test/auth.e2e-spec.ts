import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
const cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { EnvelopeInterceptor } from '../src/common/interceptors/envelope.interceptor';
import { createGlobalValidationPipe } from '../src/common/pipes/validation.pipe';

describe('AuthModule (E2E)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  const testUser = {
    email: `tester_${Date.now()}@syncboard.dev`,
    password: 'SecurePassword123!',
    name: 'SyncBoard Tester',
  };

  let accessToken: string;
  let refreshTokenCookie: string;

  describe('POST /api/v1/auth/register', () => {
    it('AC-AUTH-01/02/03: should register a new user and set sb_refresh cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.name).toBe(testUser.name);
      expect(res.body.data.user.password).toBeUndefined(); // Never return password
      expect(res.body.data.accessToken).toBeDefined();

      accessToken = res.body.data.accessToken;

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c: string) => c.startsWith('sb_refresh='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
      refreshTokenCookie = refreshCookie!;
    });

    it('AC-AUTH-04: should reject duplicate email registration with 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toContain('already registered');
    });

    it('AC-AUTH-05: should reject invalid payload (short password) with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid@example.com',
          password: '123', // < 8 chars
          name: 'Short Pwd',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('AC-AUTH-06/07: should login with correct credentials and issue new tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      accessToken = res.body.data.accessToken;

      const cookies = res.headers['set-cookie'] as unknown as string[];
      const refreshCookie = cookies.find((c: string) => c.startsWith('sb_refresh='));
      expect(refreshCookie).toBeDefined();
      refreshTokenCookie = refreshCookie!;
    });

    it('AC-AUTH-08: should reject wrong password with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword!',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('AC-AUTH-14: should return authenticated user profile with Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.name).toBe(testUser.name);
    });

    it('AC-AUTH-15: should reject request without token with 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh & Token Rotation', () => {
    let rotatedCookie: string;

    it('AC-AUTH-09: should rotate refresh token and return new access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', [refreshTokenCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      const cookies = res.headers['set-cookie'] as unknown as string[];
      const newRefreshCookie = cookies.find((c: string) => c.startsWith('sb_refresh='));
      expect(newRefreshCookie).toBeDefined();
      rotatedCookie = newRefreshCookie!;
    });

    it('AC-AUTH-11: Reuse Detection: using the old revoked refresh token revokes session', async () => {
      // Presenting the old invalidated refreshTokenCookie
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', [refreshTokenCookie])
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('reuse detected');

      // Now even the rotated token in that family is revoked!
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', [rotatedCookie])
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('AC-AUTH-12/13: should logout and clear cookie', async () => {
      // Re-login to get fresh session
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const cookies = loginRes.headers['set-cookie'] as unknown as string[];
      const freshCookie = cookies.find((c: string) => c.startsWith('sb_refresh='));

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', [freshCookie!])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('Logged out');
    });
  });
});
