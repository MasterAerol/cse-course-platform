# CSE Course Platform

Milestone 6+ foundation for a Civil Service Examination learning platform. The
repository combines a React single-page application, a Hono API, secure
server-managed sessions, a public course catalog, student enrollments, and
Cloudflare D1 in one Cloudflare Worker deployment.

The current platform includes curriculum navigation, a protected lesson
reader, lesson completion, sequential unlocking, topic quizzes, fixed practice
activities, generated practice activities, and a lightweight admin content
builder for course content review. It intentionally contains no payments,
certificates, mock exams, R2 media pipeline, or AI-generated question wording.

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
- Lesson reader APIs only return published course, subject, topic, lesson, and
  ordered block data after server-side access checks.
- Student progress is calculated from lesson-level rows, not stored as the
  single source of truth.
- Practice generation is backend-only. Generated practice attempts persist
  immutable D1 snapshots and score against those snapshots instead of
  regenerating questions.
- Admin content mutations go through authenticated admin APIs and write audit
  entries. Content authoring scripts should call those APIs rather than
  bypassing services with ad hoc SQL.

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
  curriculum summary with published lesson titles but without lesson block
  content.
- `GET /api/student/dashboard` requires authentication and returns the signed
  in student's enrollments, progress, and Continue Learning state.
- `GET /api/student/courses/:courseSlug/progress` requires authentication and
  active course access.
- `GET /api/student/courses/:courseSlug/curriculum` requires authentication
  and returns ordered published subjects, topics, and lessons with basic
  accessibility metadata.
- `GET /api/student/lessons/:lessonPublicId` requires authentication and
  returns the protected lesson reader payload, including ordered typed blocks
  plus previous and next published lessons.
- `POST /api/student/lessons/:lessonPublicId/complete` completes eligible
  reading lessons and updates unlock/progress state.
- `GET /api/student/lessons/:lessonPublicId/practice` returns the practice
  summary for a practice lesson.
- `POST /api/student/practice-sets/:practiceSetId/attempts` starts a fixed or
  generated practice attempt.
- `GET /api/student/practice-attempts/:attemptPublicId` returns the in-progress
  practice attempt snapshot without answer keys.
- `PUT /api/student/practice-attempts/:attemptPublicId/answers/:questionId`
  saves one practice answer.
- `POST /api/student/practice-attempts/:attemptPublicId/submit` scores a
  practice attempt on the Worker.
- `GET /api/student/practice-attempts/:attemptPublicId/results` returns a
  submitted practice result.
- Quiz endpoints under `/api/student/quizzes/*` and
  `/api/student/quiz-attempts/*` provide the Percentages Topic Quiz attempt,
  answer, submit, and result flow.
- Admin content builder endpoints under `/api/admin/*` allow administrators to
  review and draft courses, subjects, topics, lessons, lesson blocks, practice
  sets, quizzes, and audit log entries.

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
`Numerical Ability` subject, the `Percentages` topic, and published
Percentages lessons. Additional draft topics, such as `Fractions`, should be
created through the admin APIs or approved operational scripts so they remain
reviewable before publication.

Enrollment checks are always server-side. Student APIs bind the authenticated
session's internal user id and require:

- `enrollment_status = 'active'`
- `access_starts_at` at or before the current Worker/D1 time
- `access_expires_at` either unset or in the future

Expired, revoked, missing, or future-starting enrollments do not grant course
access. Dashboard progress is computed from completed required published
lessons divided by all required published lessons. Draft lessons, unpublished
subjects/topics, and preview-only lessons are excluded.

Continue Learning is calculated in the Worker and points to the next lesson
reader route when a lesson is available:

```text
/courses/<course-slug>/lessons/<lesson-public-id>
```

To enroll an existing user into `CSE Professional` remotely without hardcoding
an email into a migration, replace the placeholder email and run:

```bash
npx wrangler d1 execute DB --remote --command "INSERT INTO course_enrollments (user_id, course_id, enrollment_status, access_starts_at, access_expires_at, enrollment_source) SELECT users.id, courses.id, 'active', CURRENT_TIMESTAMP, NULL, 'admin' FROM users CROSS JOIN courses WHERE users.email = lower(trim('<student-email@example.com>')) AND courses.slug = 'cse-professional' ON CONFLICT(user_id, course_id) DO UPDATE SET enrollment_status = 'active', access_starts_at = CURRENT_TIMESTAMP, access_expires_at = NULL, completed_at = NULL, enrollment_source = 'admin';"
```

For local development, use the same command with `--local` instead of
`--remote`.

## Lesson reader

The lesson reader uses the existing `lesson_blocks` table. Each block's
`content_json` is parsed with `JSON.parse`, validated with a block-specific Zod
schema, and returned as a typed API structure. The frontend renders typed data
only and does not render raw HTML from D1.

Supported block types:

- `heading`
- `paragraph`
- `callout`
- `formula`
- `example`
- `image`
- `video`
- `divider`
- `summary`

Malformed or unsupported lesson blocks are safely skipped by the Worker and
counted in `malformedBlockCount`. This keeps a bad content row from breaking
the whole lesson while making the content issue visible to the frontend.

The seed data includes polished sample blocks for `Introduction to
Percentages` and short placeholder blocks for `Understanding Percentages` and
`Fractions, Decimals and Percentages`.

## Practice and dynamic generators

The practice engine supports two question sources:

- `fixed` practice sets read seeded rows from `practice_questions` and
  `practice_question_choices`.
- `generated` practice sets create immutable rows in
  `generated_question_snapshots` and `generated_question_choices` at attempt
  start.

Dynamic generation currently exists only for these Percentages practice
lessons:

- Finding the Percentage (`finding-percentage` v1)
- Finding the Base (`finding-base` v1)
- Finding the Rate (`finding-rate` v1)

Draft Fractions generated practice can use these generator slugs:

- Equivalent Fractions (`equivalent-fractions` v1)
- Simplifying Fractions (`simplifying-fractions` v1)
- Comparing Fractions (`comparing-fractions` v1)
- Adding Fractions (`adding-fractions` v1)
- Subtracting Fractions (`subtracting-fractions` v1)
- Multiplying Fractions (`multiplying-fractions` v1)
- Dividing Fractions (`dividing-fractions` v1)

Each generated attempt creates five questions: two easy, two medium, and one
hard. The Worker creates a cryptographically random attempt seed with Web
Crypto, derives deterministic per-question seeds from the generator slug,
version, difficulty, position, and retry count, validates every generated
question, and retries bounded duplicate or invalid generations before saving.

Generated snapshots store the generator slug, version, seed, difficulty,
prompt, structured explanation JSON, private parameters JSON, and metadata.
The API never returns the raw seed, private parameters, correct choice, or
explanation before submission. On refresh, the Worker reloads saved snapshots;
it does not call the generator again. On submit and review, scoring and
explanations come from the saved snapshot rows so historical attempts remain
reviewable after future generator-code changes.

`Worked Examples`, `Guided Practice`, and the Fractions mixed application
lesson use fixed practice sets. Do not edit an existing generator version in a
way that changes generated question behavior materially; add a new generator
version and configuration instead.

## Admin content builder

Open the admin builder at:

```text
/admin/courses/<course-id>
```

Use it to review draft topics and lessons before publishing. Draft courses,
topics, lessons, practice sets, quizzes, questions, and choices are visible to
administrators but remain hidden from student APIs until their parent content
chain is published.

The admin mutation APIs require an authenticated admin session and the
same-origin CSRF header used by the React admin UI. Keep operational scripts
idempotent and do not hardcode credentials or student emails into migrations.

## Fractions draft content creation

The Fractions topic is intentionally created by a one-time admin API script
instead of a large content seed migration. This keeps draft authoring auditable
and avoids automatically publishing unreviewed lesson content.

Start the local development server, then run one of these with an admin
account:

```bash
CSE_FRACTIONS_ADMIN_PASSWORD="<password>" node scripts/create-fractions-topic.mjs --base-url http://127.0.0.1:5173 --email admin@example.com --confirm create-fractions-draft
```

or, if you already have a valid admin session cookie:

```bash
node scripts/create-fractions-topic.mjs --base-url http://127.0.0.1:5173 --cookie "cse_session=<cookie-value>" --confirm create-fractions-draft
```

For production, deploy the code first so the fraction generators and admin API
support are available, then run the same script against the production origin
with an admin-controlled credential or cookie. The script creates the
`Fractions` topic under `CSE Professional` → `Numerical Ability` as `draft`,
adds 12 draft lessons, configures seven generated practice lessons, creates a
fixed mixed-applications practice set, and creates a fixed 15-question topic
quiz.

After the script runs, review in the admin UI:

1. Open `/admin/courses/<course-id>`.
2. Select `Numerical Ability` → `Fractions`.
3. Review every lesson block, generated practice configuration, fixed practice
   question, and quiz question.
4. Publish from the outside in only after review: topic, lessons, practice
   sets/quizzes, and their questions/choices as appropriate.
5. Confirm the public course detail still hides draft Fractions content until
   publication.

## Ratio and Proportion automatic publication

The Ratio and Proportion topic is created through the authenticated admin API,
not a seed migration. The workflow is idempotent and creates the topic, 12
lessons, instructional blocks, eight generated practice configurations, an
eight-question fixed mixed practice, and a 15-question topic quiz as draft
content before publication.

Before any content mutation, the script runs the focused Workers-runtime test
that generates and validates 1,000 questions for each registered ratio
generator. It then validates the complete stored draft and publishes practice
sets, the quiz, lessons, and the topic in that order. If publication fails, it
restores only statuses changed during that run; content and audit records are
preserved.

Start the integrated development server and run:

```bash
CSE_RATIO_PROPORTION_ADMIN_PASSWORD="<password>" node scripts/create-and-publish-ratio-proportion-topic.mjs --base-url http://127.0.0.1:5173 --email admin@example.com --confirm create-validate-publish-ratio-proportion
```

An existing admin session may be used instead:

```bash
node scripts/create-and-publish-ratio-proportion-topic.mjs --base-url http://127.0.0.1:5173 --cookie "cse_session=<cookie-value>" --confirm create-validate-publish-ratio-proportion
```

For production, deploy the generator code first, use a checkout of the same
deployed revision, and point the same confirmed command at the production
origin. Credentials are supplied through the environment or a session cookie;
they are never stored in the script.

## Average automatic publication

The Average topic is created through the authenticated admin API rather than a
content migration. The idempotent workflow creates 12 lessons, instructional
blocks, eight generated practice configurations, an eight-question fixed
practice, and a 15-question topic quiz as draft content before publication.

Before any content mutation, the script runs 1,000 Workers-runtime generations
for each of the eight Average generators. It then validates the stored topic and
publishes practice sets, the quiz, lessons, and the topic in that order. A
publication failure restores only statuses changed during that run and keeps
content and audit records intact.

With the integrated local server running:

```bash
CSE_AVERAGE_ADMIN_PASSWORD="<password>" node scripts/create-and-publish-average-topic.mjs --base-url http://127.0.0.1:5173 --email admin@example.com --confirm create-validate-publish-average
```

An existing admin session cookie may be used instead:

```bash
node scripts/create-and-publish-average-topic.mjs --base-url http://127.0.0.1:5173 --cookie "cse_session=<cookie-value>" --confirm create-validate-publish-average
```

For production, deploy the same reviewed revision first, then run the confirmed
script against the live Worker URL using an environment-supplied password or an
admin-controlled session cookie. The script contains no credentials.

## Number Problems automatic publication

The Number Problems topic is created through the authenticated admin API and
the existing content tables, so it does not require a content migration. The
idempotent workflow creates 12 lessons, nine generated practice configurations,
an eight-question fixed practice, and a 15-question topic quiz as draft content.

Before mutating content, the script runs 1,000 Workers-runtime generations for
each of the nine Number Problems generators. Stored blocks, configurations, and
fixed assessments are then validated before practice sets, quiz, lessons, and
topic are published in that order. A publication failure restores only statuses
changed during that run and preserves content and audit records.

With the integrated local server running:

```bash
CSE_NUMBER_PROBLEMS_ADMIN_PASSWORD="<password>" node scripts/create-and-publish-number-problems-topic.mjs --base-url http://127.0.0.1:5173 --email admin@example.com --confirm create-validate-publish-number-problems
```

An existing admin session cookie may be used instead:

```bash
node scripts/create-and-publish-number-problems-topic.mjs --base-url http://127.0.0.1:5173 --cookie "cse_session=<cookie-value>" --confirm create-validate-publish-number-problems
```

For production, deploy the reviewed generator revision first and run the same
confirmed command against the live Worker origin. Supply credentials through
the environment or an administrator-controlled session cookie; the script does
not contain credentials.

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
