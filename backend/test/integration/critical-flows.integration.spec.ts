/**
 * Integration tests (Nest TestingModule + supertest + PostgreSQL).
 *
 * Prerequisite: migrated database. Prefer a dedicated DB:
 *   set TEST_DATABASE_URL=postgresql://...   (overrides DATABASE_URL for this process)
 *
 * Run: npm run test:integration
 */

import * as fs from 'fs';
import * as path from 'path';

function loadBackendDotEnv() {
  try {
    const envPath = path.join(__dirname, '../../.env');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  } catch {
    /* ignore */
  }
}

loadBackendDotEnv();
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'integration-test-jwt-secret';
}

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
// supertest is CJS; default export interop varies with ts-jest
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ExamType, LeaveType, LeaveStatus } from '@prisma/client';
import { seedIntegrationData, IntegrationTestSeed } from './test-seed';

describe('Critical flows (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seed: IntegrationTestSeed;
  const http = () => app.getHttpServer();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);
    seed = await seedIntegrationData(prisma);
  });

  afterAll(async () => {
    if (prisma && seed) {
      await prisma.school.delete({ where: { id: seed.schoolId } }).catch(() => undefined);
    }
    await app?.close();
  });

  // —— 1. Auth ——
  describe('Auth (POST /api/auth/login)', () => {
    it('returns 200 and JWT for valid credentials', async () => {
      const res = await request(http())
        .post('/api/auth/login')
        .send({
          email: seed.adminEmail,
          password: seed.passwordPlain,
          schoolId: seed.schoolId,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.accessToken).toBeDefined();
      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.accessToken.length).toBeGreaterThan(20);
    });

    it('returns 401 for wrong password', async () => {
      const res = await request(http())
        .post('/api/auth/login')
        .send({
          email: seed.adminEmail,
          password: 'DefinitelyWrongPassword!',
          schoolId: seed.schoolId,
        });

      expect(res.status).toBe(401);
    });
  });

  // —— 2. Leave ——
  describe('Leave (create → approve → my)', () => {
    const fromDate = () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(12, 0, 0, 0);
      return d.toISOString().split('T')[0];
    };
    const toDate = () => {
      const d = new Date();
      d.setDate(d.getDate() + 4);
      d.setHours(12, 0, 0, 0);
      return d.toISOString().split('T')[0];
    };

    it('teacher creates leave (pending); admin approves; teacher my shows approved', async () => {
      const teacherToken = await login(seed.teacherEmail, seed.passwordPlain, seed.schoolId);
      const adminToken = await login(seed.adminEmail, seed.passwordPlain, seed.schoolId);

      const createRes = await request(http())
        .post('/api/school/leave')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          type: LeaveType.SICK,
          fromDate: fromDate(),
          toDate: toDate(),
          reason: 'Integration test leave',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.status).toBe(LeaveStatus.PENDING);
      const leaveId = createRes.body.id as string;

      const approveRes = await request(http())
        .patch(`/api/school/leave/${leaveId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.status).toBe(LeaveStatus.APPROVED);

      const myRes = await request(http())
        .get('/api/school/leave/my')
        .query({ page: 1, pageSize: 20 })
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(myRes.status).toBe(200);
      const rows = myRes.body.data as Array<{ id: string; status: string }>;
      const mine = rows.find((r) => r.id === leaveId);
      expect(mine).toBeDefined();
      expect(mine!.status).toBe(LeaveStatus.APPROVED);
    });
  });

  // —— 3. Exams ——
  describe('Exams (create → bulk results → GET results by studentId)', () => {
    it('creates exam, submits bulk results, GET results returns rows for student', async () => {
      const teacherToken = await login(seed.teacherEmail, seed.passwordPlain, seed.schoolId);

      const examRes = await request(http())
        .post('/api/school/exams')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          name: 'Integration Midterm',
          type: ExamType.MIDTERM,
          classId: seed.classId,
          sectionId: seed.sectionId,
          subjectId: seed.subjectId,
          date: '2026-06-15',
          totalMarks: 100,
        });

      expect(examRes.status).toBe(201);
      const examId = examRes.body.id as string;

      const bulkRes = await request(http())
        .post(`/api/school/exams/${examId}/results/bulk`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          results: [
            {
              studentId: seed.student1Id,
              obtainedMarks: 87,
              grade: 'A',
            },
          ],
        });

      expect(bulkRes.status).toBe(201);

      const resultsRes = await request(http())
        .get('/api/school/exams/results')
        .query({ studentId: seed.student1Id })
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(resultsRes.status).toBe(200);
      expect(resultsRes.body.student.id).toBe(seed.student1Id);
      const results = resultsRes.body.results as Array<{ obtainedMarks: number; examId?: string }>;
      expect(Array.isArray(results)).toBe(true);
      expect(results.some((r) => r.obtainedMarks === 87)).toBe(true);
    });
  });

  // —— 4. Parent my-children ——
  describe('Parent GET /school/students/my-children', () => {
    it('returns only that parent children, not other parents', async () => {
      const p1 = await login(seed.parent1Email, seed.passwordPlain, seed.schoolId);

      const res = await request(http())
        .get('/api/school/students/my-children')
        .set('Authorization', `Bearer ${p1}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const ids = (res.body as Array<{ id: string }>).map((s) => s.id).sort();
      expect(ids).toEqual([seed.student1Id, seed.student2Id].sort());
      expect(ids).not.toContain(seed.student3Id);
    });
  });

  // —— 5. Fees parent isolation ——
  describe('Fee invoices (parent own vs other child)', () => {
    it('parent gets 200 for own child invoice; 403 for another parent child invoice', async () => {
      const p1 = await login(seed.parent1Email, seed.passwordPlain, seed.schoolId);

      const ok = await request(http())
        .get(`/api/school/fees/invoices/${seed.invoiceOwnId}`)
        .set('Authorization', `Bearer ${p1}`);

      expect(ok.status).toBe(200);
      expect(ok.body.studentId).toBe(seed.student1Id);

      const forbidden = await request(http())
        .get(`/api/school/fees/invoices/${seed.invoiceOtherId}`)
        .set('Authorization', `Bearer ${p1}`);

      expect(forbidden.status).toBe(403);
    });
  });

  async function login(email: string, password: string, schoolId: string): Promise<string> {
    const res = await request(http())
      .post('/api/auth/login')
      .send({ email, password, schoolId });
    if (![200, 201].includes(res.status)) {
      throw new Error(`Login failed ${res.status}: ${JSON.stringify(res.body)}`);
    }
    return res.body.accessToken as string;
  }
});
