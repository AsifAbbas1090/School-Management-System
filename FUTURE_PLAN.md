# School Management System — implementation status

## Legend

✅ Done  ⚠️ Broken/partial  🔲 Not started  🚫 Deferred

---

## Phase 1 — Critical fixes [all ✅ after this sprint]

| ID | Item | Status |
|----|------|--------|
| **P1-A** | Fee invoices: TypeScript alignment (`findAll` / `findOne` service signatures vs controller) and parent-role scoping (requires `studentId` for parents; invoice detail checks `Student.parentId`) | ✅ |
| **P1-B** | Heavy list loads: students/fees/parents use pagination, counts, or slim payloads where appropriate | ✅ |
| **P1-C** | Dashboard analytics: parallel Prisma batch in `getDashboardData`; no sequential class-name round-trip after main query | ✅ |
| **P1-D** | Parents page: bulk parent–student updates; paginated parents list; student link picker via search (no full-school preload) | ✅ |

---

## Phase 2 — Role permissions

### PARENT

- **Fixed / in place:** Fee and invoice APIs scoped by child (`studentId` + ownership checks); `my-children` listing; fee payments parent guard patterns extended to invoices for consistency.
- **Outstanding:** None critical for current flows; confirm all parent-facing routes return consistent error messages when `studentId` is missing.

### TEACHER

- **Fixed / in place:** Student count via `/school/students/count` on dashboard; role-gated routes for attendance, exams, leave as implemented.
- **Outstanding:** Audit any remaining pages that still assume full student lists instead of scoped or counted data.

### SUPPORT_STAFF

- **Fixed / in place:** Role exists in schema and guards where wired.
- **Outstanding:** Dedicated SUPPORT_STAFF UX and route matrix not fully documented; align frontend navigation with backend `@Roles` for this role.

### SUPER_ADMIN

- **Fixed / in place:** School context selection for scoped dashboards; super-admin analytics overview path.
- **Outstanding:** Optional hardening of cross-school leakage tests in integration suite.

### STUDENT

- **Fixed / in place:** Schema/model presence for student users where applicable.
- **Outstanding:** No active student login or portal (deferred — see Phase 3-D and Known deferred).

---

## Phase 3 — Features

| Area | Status | Notes |
|------|--------|--------|
| **3-A** Notifications (email/SMS) | 🔲 | Roadmap item; no production wiring |
| **3-B** Advanced reporting / exports | ⚠️ | CSV and PDF in places; not unified |
| **3-C** Timetable (full CRUD + UI) | ⚠️ | Partial / varies by screen |
| **3-D** Student portal (grades, homework, profile) | 🚫 | Blocked on schema + product scope (see Known deferred) |
| **3-E** Mobile app | 🚫 | Not started |

---

## Phase 4 — Quality

| Topic | Status | Notes |
|-------|--------|--------|
| Integration test coverage | ⚠️ | `npm run test` in `backend/` — auth, leave, exams, parent scoping, fee scoping |
| E2E / Playwright | 🔲 | Not in repo baseline |
| Load / performance testing | 🔲 | Ad-hoc improvements only |
| Accessibility (a11y) audit | 🔲 | Not formalized |
| API versioning | 🔲 | Single version (`/api`) |

---

## Known deferred

- **Student portal** — Requires schema migration (student-facing aggregates, submissions, etc.) and a large UI lift; tracked as Phase 3-D.
- **Settings tabs: Notifications, Security, Backup** — No backend implementation yet; UI may show placeholders.
- **Real-time messaging** — No WebSocket layer; current messaging is request/response over REST.
