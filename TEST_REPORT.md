# Autonomous Test Run Report
Date: 2026-04-19T00:52 UTC

## Summary
Total tests run: 74  
Passed: 74  
Failed before fix: 13 (first script run)  
Fixed during run: yes (see below)  
Final failures: 0  

## Fixes Applied
| Module | Endpoint / area | Issue | Fix Applied |
|--------|-----------------|-------|-------------|
| Auth | RolesGuard | Class-level `@Roles()` was ignored; only handler metadata was read, so many routes allowed any authenticated user | `roles.guard.ts`: use `Reflector.getAllAndOverride('roles', [handler, class])` |
| Messaging | POST /school/messages | 500 — `Message` model requires `id` and `updatedAt` | `messaging.service.ts`: set `id: randomUUID()` and `updatedAt` on create |
| Users | GET /school/users/:id | Missing endpoint for test plan | `users.controller.ts` + `users.service.ts`: added `findOne` + `GET :id` |
| Students | GET /school/students/:id | 500 — invalid Prisma include `Section.classTeacher` | `students.service.ts` `findOne`: use `Section.User` (correct relation name) |
| Students | CSV bulk import | `admissionDate` treated as required | `mapCsvRowToCreateDtoFromCache`: only parse/set `admissionDate` when column present |
| Tests | — | PowerShell `$TEACHER` / token issues; idempotent collisions; CSV columns | `run-autonomous-api-tests.ps1`: unique `runId`, curl multipart, address/DOB/parentId in CSV, future leave dates |
| Env | JWT | `.env` lacked explicit JWT secrets | Appended `JWT_SECRET` + expiry vars to `backend/.env` (dev) |

## Performance Results
Cold requests via `Invoke-RestMethod` (local network; first hit after idle may include pool warm-up):

| Endpoint | Response Time (ms) | Status |
|----------|---------------------|--------|
| GET /school/students?page=1&pageSize=50 | ~3297 | SLOW (>500ms) |
| GET /school/users/parents?page=1&limit=25 | ~3342 | SLOW |
| GET /school/classes | ~2065 | SLOW |
| GET /school/expenses | ~2434 | SLOW |
| GET /school/analytics/dashboard?role=ADMIN | ~4122 | SLOW |

Further optimization would be a separate pass (select narrowing, caching, DB indexes); not changed in this run beyond correctness fixes.

## Prisma / migrations
- `npx prisma migrate deploy` reports **P3005** (database not empty / not baselined for migration history). Schema was already aligned via `npx prisma db push` during setup.
- `npx prisma migrate status` shows pending migration file `20260419000000_add_student_pending_dues_and_indexes` not applied via deploy in this environment — baseline/migrate resolution is a DBA follow-up.

## Remaining Issues
- `npx prisma generate` intermittently hit **EPERM** renaming `query_engine-windows.dll.node` (Windows file lock). Client was already present; `tsc --noEmit` passed.
- Performance targets (&lt;500ms) not met on several list endpoints under current data/network; documented above.

## Backend Error Log (final state)
No `backend_errors.txt` was produced in this session (backend was already running; Phase 1 `Start-Process` log capture was skipped after confirming `http://localhost:3001/api` responds). No new unhandled exceptions observed during the 74-test PowerShell run.

## Phase 0 Git
- Pushed once: `main -> main` (commit: pre-test snapshot). **No further pushes** after Phase 0.

## Seed / test data
- `backend/prisma/autonomous-test-seed.ts` + `backend/autonomous-test-ids.json` for school `test-school-1` and users `superadmin@test.com`, `admin@test.com`, etc. (`Test@1234`).
