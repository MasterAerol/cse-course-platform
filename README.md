# CSE Course Platform

Milestone 2 foundation for a Civil Service Examination learning platform. The
repository combines a React single-page application, a Hono API, secure
server-managed sessions, a public course catalog, student enrollments, and
Cloudflare D1 in one Cloudflare Worker deployment.

This milestone intentionally contains no full lesson reader, content
management editor, quiz execution, payments, or R2 integration. The admin area
contains operational checks and enrollment support only.

## Architecture

```text
Browser
  |-- React + TypeScript SPA
  `-- fetch /api/* with an HttpOnly session cookie
        `-- Hono Worker
              |-- validation and authentication middleware
              |-- services
              |-- prepared D1 repositories
              `-- Cloudflare D1 (DB binding)
```

- Vite and the Cloudflare Vite plugin run the frontend and Worker together.
- The plugin generates the production assets and deploys the Worker and SPA as
  one unit.
- `/api/*` requests run through Hono before the SPA asset fallback.
- SQL is isolated in repository modules and uses bound D1 prepared statements.
- `ENVIRONMENT` controls development-only routes and production cookie
  security.
- Passwords use versioned PBKDF2-HMAC-SHA-256 records with unique salts and a
  Cloudflare Workers-compatible work factor.
- Raw session tokens exist only in HttpOnly cookies; D1 stores SHA-256 token
  hashes and enforces expiration and revocation.
- Course APIs only return published courses and safe curriculum summaries.
- Student progress is calculated from lesson-level rows, not stored as the
  single source of truth.

## Prerequisites

- Node.js 20.19 or newer
- npm 10 or newer
- A Cloudflare account for remote D1 and deployment
- Wrangler authentication for remote commands

## Installation

```bash
git clone <repository-url>
cd cse-course-platform
npm install
npm run cf-typegen
```

The committed generated types are checked automatically by
`npm run typecheck`.

## Local development

Create the local Worker variable file:

PowerShell:

```powershell
Copy-Item .dev.vars.example .dev.vars
```

macOS or Linux:

```bash
cp .dev.vars.example .dev.vars
```

Apply the schema and start the integrated Vite/Workers server:

```bash
npm run db:migrate:local
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

To preview a production build in the local Workers runtime:

```bash
npm run preview
```

Local D1 state is stored under `.wrangler/` and is intentionally ignored by
Git.

## API endpoints

- `GET /api/health` returns the public health response.
- `GET /api/dev/database-check` checks D1 and returns 404 unless
  `ENVIRONMENT=development`.
- `POST /api/auth/register` creates a student account and session.
- `POST /api/auth/login` creates a session for valid active credentials.
- `POST /api/auth/logout` revokes the current session and clears its cookie.
- `GET /api/auth/me` returns the current public user or a 401 response.
- `GET /api/admin/auth-check` requires an authenticated administrator.
- `POST /api/admin/enrollments` requires an authenticated administrator and
  enrolls an existing user in a published course.
- `GET /api/courses` returns published courses. If a valid session cookie is
  present, it includes that user's enrollment state.
- `GET /api/courses/:courseSlug` returns published course details and a safe
  curriculum summary without lesson block content.
- `GET /api/student/dashboard` requires authentication and returns the signed
  in student's enrollments, progress, and Continue Learning state.
- `GET /api/student/courses/:courseSlug/progress` requires authentication and
  active course access.

## Authentication

Registration accepts `email`, `password`, `firstName`, and `lastName`. Email
addresses are trimmed and lowercased. Passwords must be 12 to 128 characters
and include an uppercase letter, lowercase letter, and number.

Password hashes use the format
`pbkdf2-sha256$v1$100000$<salt>$<hash>`. Cloudflare Workers rejects PBKDF2
iteration counts above 100,000, so hashing and verification use that runtime
maximum. Verification parses the algorithm, version, and work factor from the
record and rejects malformed, unknown, lower-cost, or excessive values before
deriving a hash. It never reinterprets an existing record at a weaker work
factor. Each password has a unique cryptographically secure salt, and derived
hashes are compared in constant time.

The earlier 600,000-iteration configuration failed before account creation in
the production runtime. Do not assume that unsupported records can be migrated
automatically: if a database audit ever finds one, review it manually and use a
controlled password-reset process.

The session cookie is HttpOnly, `SameSite=Lax`, scoped to `/`, and marked
`Secure` when `ENVIRONMENT=production`. Sessions expire on the server after
seven days. The frontend does not store authentication tokens in
`localStorage` or other JavaScript-readable storage.

Registration always creates the `student` role. There is deliberately no
public admin registration or role-selection input. To test the admin-only
route locally, register normally and then promote that known local account:

```bash
npx wrangler d1 execute DB --local --command "UPDATE users SET role = 'admin' WHERE email = 'normalized@example.com';"
```

Use a controlled operational process for production role changes. Do not add a
default administrator password or commit credentials.

## Course catalog and enrollments

The seed migration creates the published `CSE Professional` course with the
`Numerical Ability` subject, the `Percentages` topic, and 11 published lesson
stubs. The lesson rows contain placeholder summaries only; full lesson content
is intentionally out of scope for this milestone.

Enrollment checks are always server-side. Student APIs bind the authenticated
session's internal user id and require:

- `enrollment_status = 'active'`
- `access_starts_at` at or before the current Worker/D1 time
- `access_expires_at` either unset or in the future

Expired, revoked, missing, or future-starting enrollments do not grant course
access. Dashboard progress is computed from completed required published
lessons divided by all required published lessons. Draft lessons, unpublished
subjects/topics, and preview-only lessons are excluded.

To enroll an existing user into `CSE Professional` remotely without hardcoding
an email into a migration, replace the placeholder email and run:

```bash
npx wrangler d1 execute DB --remote --command "INSERT INTO course_enrollments (user_id, course_id, enrollment_status, access_starts_at, access_expires_at, enrollment_source) SELECT users.id, courses.id, 'active', CURRENT_TIMESTAMP, NULL, 'admin' FROM users CROSS JOIN courses WHERE users.email = lower(trim('<student-email@example.com>')) AND courses.slug = 'cse-professional' ON CONFLICT(user_id, course_id) DO UPDATE SET enrollment_status = 'active', access_starts_at = CURRENT_TIMESTAMP, access_expires_at = NULL, completed_at = NULL, enrollment_source = 'admin';"
```

For local development, use the same command with `--local` instead of
`--remote`.

## D1 setup and migrations

Authenticate and create the production database:

```bash
npx wrangler login
npx wrangler d1 create cse-course-platform
```

Set the `database_id` in `wrangler.jsonc` to the ID Wrangler returns. Keep the
binding name as `DB`.

Migration files live in `migrations/` and are applied in filename order:

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

Remote migrations require Wrangler authentication and the correct D1 database
ID. Review the output before confirming production changes. Add future
migrations instead of modifying one that has already been applied:

```bash
npx wrangler d1 migrations create DB descriptive_name
```

## Cloudflare binding types

Generate `worker-configuration.d.ts` after any binding or variable change:

```bash
npm run cf-typegen
npm run cf-typegen:check
```

The Worker derives D1 bindings from generated `Cloudflare.Env`; the focused
`Bindings` type widens only the non-secret `ENVIRONMENT` value needed locally.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Tests execute in the Cloudflare Workers runtime and apply all migrations to an
isolated local D1 database. The production build writes frontend and Worker
output beneath `dist/`.

## Deployment

Before deploying:

1. Log in with `npx wrangler login`.
2. Create or select the production D1 database.
3. Confirm the `database_id` in `wrangler.jsonc` targets that database.
4. Apply remote migrations with `npm run db:migrate:remote`.

Build and deploy:

```bash
npm run deploy
```

The production configuration sets `ENVIRONMENT=production`, which enables the
`Secure` cookie attribute and keeps the development database check unavailable.

## npm scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start React and the Worker in the integrated local runtime |
| `npm run build` | Type-check and create the production bundle |
| `npm run deploy` | Build and deploy with Wrangler |
| `npm run preview` | Build and preview in the local Workers runtime |
| `npm run typecheck` | Check generated bindings and strict TypeScript |
| `npm run lint` | Run ESLint |
| `npm test` | Run Workers-runtime Vitest integration tests with local D1 |
| `npm run cf-typegen` | Generate Cloudflare binding declarations |
| `npm run cf-typegen:check` | Fail if generated binding types are stale |
| `npm run db:migrate:local` | Apply pending migrations to local D1 |
| `npm run db:migrate:remote` | Apply pending migrations to remote D1 |

## API response conventions

Successful endpoints return:

```json
{
  "success": true,
  "data": {}
}
```

Errors return a safe request identifier without database errors or stack
traces:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred.",
    "requestId": "generated-request-id",
    "details": null
  }
}
```

Validation errors use the same envelope and may include allow-listed field
messages:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "requestId": "generated-request-id",
    "details": {
      "fieldErrors": {
        "email": ["Enter a valid email address."]
      }
    }
  }
}
```

## Official references

- [Cloudflare Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare React and Vite guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/)
- [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Cloudflare Workers Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)
- [Cloudflare Workers Vitest integration](https://developers.cloudflare.com/workers/testing/vitest-integration/)
- [Hono on Cloudflare Workers](https://hono.dev/docs/getting-started/cloudflare-workers)
