# Production Security Hardening and Private Beta Readiness Audit

Audit date: 2026-08-05 (Asia/Singapore)  
Production origin: `https://cse-course-platform.master-course.workers.dev`  
D1 binding: `DB`  
Decision: **NO-GO until the “Must pass before beta” items are completed**

No production data, account, publisher, migration, dashboard setting, or deployment was modified by this audit. Production access was limited to HTTP GET requests and aggregate/read-only D1 queries.

## Migration-free implementation update

The follow-up implementation now closes production registration by default, exposes a safe public registration-policy flag to the frontend, removes self-signup advertising in closed mode, adds six Cloudflare Rate Limiting bindings with route enforcement and safe 429/503 behavior, removes leftover test-route/administrator-email presentation, and adds focused API/UI regressions. The earlier local header, origin, body-size, URL, cookie, error-boundary, and logging fixes remain intact.

These controls are local and undeployed. `PRIVATE_BETA_SECURITY_RUNBOOK.md` is the authoritative operational handoff for Cloudflare edge rules, observability, D1 backup, production variables, and deployment. The decision remains **NO-GO** until the code is reviewed/deployed, dashboard controls are configured, and the administrator password/session remediation is completed. No safe operator-facing password-change or revoke-all-sessions capability exists; per the stop condition, this pass documented that required implementation and did not create or execute it. Invitation, password-reset, and email-verification tokens remain migration-deferred.

## Executive summary

The academic and ownership foundations are strong: authentication and roles are enforced in the Worker, student object access is tied to the session's D1 user id, pre-submission payloads omit answer keys, scoring is server-authoritative, immutable snapshot triggers exist, duplicate submission is idempotent, and timed mock deadlines are enforced server-side. Focused security/lifecycle tests passed.

Production is not yet ready for real learners because registration and login have no rate limit, registration is open rather than invite-controlled, the known preview administrator fixture remains active with 40 active sessions, password recovery does not exist, and production does not yet contain the local security-header/origin/body-limit fixes. These are operational and abuse risks, not academic-scoring defects.

## Authentication, session, and role models

- Authentication uses an `HttpOnly` cookie named `cse_session`; there are no bearer or signed JWT tokens.
- Registration and login create a cryptographically random 32-byte token using `crypto.getRandomValues`. Only its SHA-256 hash is stored in `user_sessions`.
- Sessions are server-side D1 records, expire after seven days, and are checked on every authenticated request. The user row is joined on each check, so suspension/deletion and role changes take effect without trusting frontend state.
- Login always creates a fresh token, preventing fixation. Logout hashes the supplied cookie, revokes the matching D1 session, and clears the browser cookie.
- Passwords use per-password 16-byte random salts and PBKDF2-SHA-256 with 100,000 iterations, a 32-byte result, a versioned record format, and `crypto.subtle.timingSafeEqual`. The repository documents that production Workers rejected a higher work factor. No plaintext password is stored or returned.
- Registration accepts only `email`, `password`, `firstName`, and `lastName`; its strict schema prevents client-selected roles. Email is trimmed and lowercased, while D1 also enforces `COLLATE NOCASE UNIQUE`.
- Roles are `student` and `admin`. Every `/api/admin/*` route has Worker-side authentication, current D1 role verification, and admin CSRF middleware.

Session lifecycle: register/login -> random raw cookie sent once -> token hash stored with IP/user agent and expiry -> each request hashes cookie and loads current user/role/status -> logout or suspension sets `revoked_at` -> expired/revoked/deleted-user sessions fail authentication.

## Production attack surface

Legend: `RL` is the beta rate-limit requirement. “Owner” means the service checks the authenticated learner against the record and validates child question/choice membership. All local mutation routes now also have a 256 KiB actual JSON limit and browser same-origin enforcement; these controls require deployment before they affect production.

### Public and authentication API

| Method | Path | Access | Validation | Owner | Sensitive response | RL | Beta disposition |
|---|---|---|---|---|---|---|---|
| GET | `/api/health` | Public | N/A | N/A | No | Basic edge limit | Keep public; minimal status only |
| POST | `/api/auth/register` | Public | Strict registration body | N/A | Basic user PII + cookie | **Required: 3/IP/hour plus invite control** | Do not keep openly usable |
| POST | `/api/auth/login` | Public | Strict login body | N/A | Basic user PII + cookie | **Required: 10/IP/minute and 5/email/10 minutes** | Keep public behind limits |
| POST | `/api/auth/logout` | Public/optional session | No body | Session token only | No | 30/IP/minute | Keep public |
| GET | `/api/auth/me` | Authenticated | N/A | Session user | Name/email/role | 120/session/minute | Keep authenticated |
| GET | `/api/courses` | Public, optional auth | N/A | N/A | Published catalog/enrollment state | Basic edge limit | Keep public |
| GET | `/api/courses/:courseSlug` | Public, optional auth | Strict slug | N/A | Published catalog/curriculum | Basic edge limit | Keep public |
| GET | `/api/dev/database-check` | Development only; production returns 404 | N/A | N/A | DB metadata in development | N/A | Keep hidden in production |

There is no password-reset, verification, publisher, preview, test, debug, or error mutation endpoint.

### Authenticated learner API

All routes below require a current server-side session. No route accepts a user id from the client.

| Method | Path | Validation | Owner/access check | Sensitive response | RL |
|---|---|---|---|---|---|
| GET | `/api/student/dashboard` | N/A | Session user + enrollments | Progress/history | 120/user/min |
| GET | `/api/student/courses/:courseSlug/curriculum` | Strict slug | Session user + enrollment | Progress | 120/user/min |
| GET | `/api/student/courses/:courseSlug/progress` | Strict slug | Session user + enrollment | Progress | 120/user/min |
| GET | `/api/student/lessons/:lessonPublicId` | Strict public id | Enrollment/prerequisite | Lesson/progress | 120/user/min |
| POST | `/api/student/lessons/:lessonPublicId/start` | Strict public id | Session user + lesson access | Progress | 30/user/min |
| POST | `/api/student/lessons/:lessonPublicId/complete` | Strict public id | Session user + completion rules | Progress | 30/user/min |
| GET | `/api/student/lessons/:lessonPublicId/practice` | Strict public id | Enrollment/lesson access | Practice history | 120/user/min |
| POST | `/api/student/practice-sets/:practiceSetId/attempts` | Positive integer id | Session user + access/max attempts | Safe attempt, no key | 10/user/10 min |
| GET | `/api/student/practice-attempts/:attemptPublicId` | Strict attempt UUID form | Owner | Safe attempt, no key | 120/user/min |
| PUT | `/api/student/practice-attempts/:attemptPublicId/answers/:questionId` | Strict ids/body | Owner + active + matching question/choice | Save state | 120/user/min, burst 20/10 sec |
| POST | `/api/student/practice-attempts/:attemptPublicId/submit` | Strict attempt id | Owner + active; idempotent | Score/key after submit | 10/user/min |
| GET | `/api/student/practice-attempts/:attemptPublicId/results` | Strict attempt id | Owner + submitted | Score/key/explanations | 120/user/min |
| GET | `/api/student/lessons/:lessonPublicId/quiz` | Strict public id | Enrollment/lesson access | Quiz history | 120/user/min |
| POST | `/api/student/quizzes/:quizId/attempts` | Positive integer id | Session user + access/max attempts | Safe attempt, no key | 10/user/10 min |
| GET | `/api/student/quiz-attempts/:attemptPublicId` | Strict public id | Owner | Safe attempt, no key | 120/user/min |
| PUT | `/api/student/quiz-attempts/:attemptPublicId/answers/:questionId` | Strict ids/body | Owner + active + matching question/choice | Save state | 120/user/min, burst 20/10 sec |
| POST | `/api/student/quiz-attempts/:attemptPublicId/submit` | Strict attempt id | Owner + active; idempotent | Score/key after submit | 10/user/min |
| GET | `/api/student/quiz-attempts/:attemptPublicId/results` | Strict attempt id | Owner + submitted | Score/key/explanations | 120/user/min |
| GET | `/api/student/subject-assessments/:assessmentSlug` | Strict slug | Enrollment + published prerequisites | Assessment history | 120/user/min |
| POST | `/api/student/subject-assessments/:assessmentSlug/attempts` | Strict slug | Session user + enrollment/max attempts | Safe snapshots, no key | 5/user/10 min |
| GET | `/api/student/subject-assessment-attempts/:attemptPublicId` | Strict public id | Owner | Safe snapshots, no key | 120/user/min |
| PUT | `/api/student/subject-assessment-attempts/:attemptPublicId/answers/:snapshotPublicId` | Strict ids/body | Owner + active + matching snapshot/choice | Save state | 120/user/min, burst 20/10 sec |
| POST | `/api/student/subject-assessment-attempts/:attemptPublicId/submit` | Strict attempt id | Owner + active; idempotent | Score/key after submit | 10/user/min |
| GET | `/api/student/subject-assessment-attempts/:attemptPublicId/results` | Strict attempt id | Owner + submitted | Score/breakdown | 120/user/min |
| GET | `/api/student/subject-assessment-attempts/:attemptPublicId/review` | Strict attempt id | Owner + submitted | Key/explanations | 120/user/min |
| GET | `/api/student/mock-examinations/:mockExamSlug` | Strict slug | Enrollment + published prerequisites | Mock history | 120/user/min |
| POST | `/api/student/mock-examinations/:mockExamSlug/attempts` | Strict slug/mode | Session user + enrollment/max attempts; one-active unique index | Safe 150-question snapshot, no key | 3/user/10 min |
| GET | `/api/student/mock-exam-attempts/:attemptPublicId` | Strict public id | Owner; deadline enforced | Safe attempt, no key | 120/user/min |
| POST | `/api/student/mock-exam-attempts/:attemptPublicId/start` | Strict public id | Owner; one authoritative deadline | Safe attempt, no key | 10/user/min |
| PUT | `/api/student/mock-exam-attempts/:attemptPublicId/answers/:snapshotPublicId` | Strict ids/body | Owner + active/not expired + matching snapshot/choice | Save state | 180/user/min, burst 30/10 sec |
| PUT | `/api/student/mock-exam-attempts/:attemptPublicId/review-flags/:snapshotPublicId` | Strict ids/boolean | Owner + active/not expired + matching snapshot | Mark state | 180/user/min, burst 30/10 sec |
| GET | `/api/student/mock-exam-attempts/:attemptPublicId/submission-review` | Strict public id | Owner + active/deadline | Answered/marked positions | 120/user/min |
| POST | `/api/student/mock-exam-attempts/:attemptPublicId/submit` | Strict public id | Owner + active/deadline; idempotent | Score/breakdown | 10/user/min |
| GET | `/api/student/mock-exam-attempts/:attemptPublicId/results` | Strict public id | Owner + submitted/expired | Score/breakdown | 120/user/min |
| GET | `/api/student/mock-exam-attempts/:attemptPublicId/review` | Strict public id | Owner + submitted/expired | Key/explanations | 120/user/min |

### Administrator API

Every route below requires authentication plus the current D1 `admin` role. Every mutation also requires the admin CSRF header and the new browser origin check. Admin reads intentionally expose draft content and answer keys. Numeric ids are validated as positive integers; write bodies are strict Zod schemas. Ownership is N/A because these are global content/operations routes.

| Method | Path | Operation | RL |
|---|---|---|---|
| GET | `/api/admin/auth-check` | Current admin identity | 120/admin/min |
| POST | `/api/admin/enrollments` | Idempotent server-authoritative enrollment by normalized email/course | 30/admin/min |
| GET | `/api/admin/dashboard` | Admin counts/course summary | 120/admin/min |
| GET | `/api/admin/courses` | List all course states | 120/admin/min |
| POST | `/api/admin/courses` | Create course | 60/admin/min |
| GET | `/api/admin/courses/:courseId` | Full draft/published curriculum | 120/admin/min |
| PATCH | `/api/admin/courses/:courseId` | Update with stale-write protection | 60/admin/min |
| POST | `/api/admin/courses/:courseId/subjects` | Create subject | 60/admin/min |
| PATCH | `/api/admin/subjects/:subjectId` | Update subject | 60/admin/min |
| POST | `/api/admin/subjects/:subjectId/move-up` | Reorder subject | 120/admin/min |
| POST | `/api/admin/subjects/:subjectId/move-down` | Reorder subject | 120/admin/min |
| POST | `/api/admin/subjects/:subjectId/topics` | Create topic | 60/admin/min |
| PATCH | `/api/admin/topics/:topicId` | Update topic | 60/admin/min |
| POST | `/api/admin/topics/:topicId/move-up` | Reorder topic | 120/admin/min |
| POST | `/api/admin/topics/:topicId/move-down` | Reorder topic | 120/admin/min |
| POST | `/api/admin/topics/:topicId/lessons` | Create lesson | 60/admin/min |
| PATCH | `/api/admin/lessons/:lessonId` | Update/publish lesson | 60/admin/min |
| POST | `/api/admin/lessons/:lessonId/move-up` | Reorder lesson | 120/admin/min |
| POST | `/api/admin/lessons/:lessonId/move-down` | Reorder lesson | 120/admin/min |
| GET | `/api/admin/lessons/:lessonId/blocks` | Read lesson blocks | 120/admin/min |
| POST | `/api/admin/lessons/:lessonId/blocks` | Create validated block | 60/admin/min |
| PATCH | `/api/admin/lesson-blocks/:blockId` | Update validated block | 60/admin/min |
| DELETE | `/api/admin/lesson-blocks/:blockId` | Delete block | 30/admin/min |
| POST | `/api/admin/lesson-blocks/:blockId/move-up` | Reorder block | 120/admin/min |
| POST | `/api/admin/lesson-blocks/:blockId/move-down` | Reorder block | 120/admin/min |
| GET | `/api/admin/practice-generators` | Registered generator metadata | 120/admin/min |
| GET | `/api/admin/lessons/:lessonId/practice-set` | Read set and fixed answer keys | 120/admin/min |
| PUT | `/api/admin/lessons/:lessonId/practice-set` | Save set/config | 60/admin/min |
| POST | `/api/admin/practice-sets/:practiceSetId/questions` | Create fixed question/key | 60/admin/min |
| PATCH | `/api/admin/practice-questions/:practiceQuestionId` | Update fixed question/key | 60/admin/min |
| POST | `/api/admin/practice-questions/:practiceQuestionId/move-up` | Reorder question | 120/admin/min |
| POST | `/api/admin/practice-questions/:practiceQuestionId/move-down` | Reorder question | 120/admin/min |
| GET | `/api/admin/lessons/:lessonId/quiz` | Read quiz and answer keys | 120/admin/min |
| PUT | `/api/admin/lessons/:lessonId/quiz` | Save quiz | 60/admin/min |
| POST | `/api/admin/quizzes/:quizId/questions` | Create quiz question/key | 60/admin/min |
| PATCH | `/api/admin/questions/:questionId` | Update quiz question/key | 60/admin/min |
| POST | `/api/admin/questions/:questionId/move-up` | Reorder quiz question | 120/admin/min |
| POST | `/api/admin/questions/:questionId/move-down` | Reorder quiz question | 120/admin/min |
| GET | `/api/admin/audit-logs` | Paginated audit log (max 100) | 120/admin/min |
| GET | `/api/admin/subject-assessments/:assessmentSlug` | Read assessment/blueprint | 120/admin/min |
| PUT | `/api/admin/subject-assessments/:assessmentSlug` | Save/publish assessment | 30/admin/min |
| POST | `/api/admin/subject-assessments/:assessmentSlug/validate` | Expensive validation | 10/admin/min |
| GET | `/api/admin/mock-examinations/:mockExamSlug` | Read mock/blueprint | 120/admin/min |
| PUT | `/api/admin/mock-examinations/:mockExamSlug` | Save/publish exact v1 mock | 15/admin/min |
| POST | `/api/admin/mock-examinations/:mockExamSlug/validate` | Expensive validation | 10/admin/min |

Publishers have no separate externally reachable endpoint. All 36 publisher scripts log in and call the administrator routes above. This is good for authorization consistency but means rate limits must accommodate a reviewed publisher run without weakening login controls.

### Static frontend routes

The SPA shell is publicly reachable for `/`, `/courses`, `/courses/:courseSlug`, `/login`, `/register`, `/dashboard`, the four subject-assessment routes, the four mock routes, the lesson route, two practice routes, two quiz routes, `/admin`, `/admin/courses`, `/admin/courses/:courseId`, `/admin/students`, `/admin/audit-log`, and the catch-all. Protected/admin React guards are usability controls only; the API remains the authority. No protected data is embedded in the static bundle.

## Findings

### Blocker

No direct admin bypass, cross-user data disclosure, pre-submit answer-key leak, plaintext credential, or scoring compromise was found.

### High

1. **No abuse-rate controls are configured or implemented.** Registration, login, expensive attempt generation, autosave, submissions, admin validation, and publisher traffic have no verified Cloudflare rule or application limiter. In-memory isolate counters would be unreliable. Configure Cloudflare WAF rate-limiting rules for public IP controls and add Workers Rate Limiting bindings for normalized-email/user keys. This requires Cloudflare configuration, code/config changes, tests, and deployment; no D1 migration is required.
2. **Registration is open and unverified.** Anyone can create active student accounts. For beta, use administrator-created accounts or one-time invitations and disable open registration. A robust invite flow needs a migration; a controlled admin-created flow can reuse `users` but needs password-change/account-recovery code.
3. **Production preview administrator fixture/session sprawl.** Read-only D1 checks found exactly one `admin@example.com` / “Preview Admin” account and 40 active sessions for that one administrator, plus eight expired-but-unrevoked session records. No default password was found in source, but its strength cannot be verified safely. Before beta: create/confirm a named owner account with a unique strong password, revoke all old admin sessions, then suspend/remove or deliberately rename and retain the fixture. These are manual production mutations and were not performed.
4. **Local hardening is not deployed.** Read-only production HTTP checks found no CSP, HSTS, `nosniff`, referrer, permissions, frame, COOP, or CORP headers. The local fixes add static `_headers`, API headers/no-store, same-origin mutation checks, bounded JSON, safe media schemes, safe 500 logging, and hardened cookie deletion. Deployment is required.

### Medium

1. **Password reset is absent.** Proposed table (migration required): `password_reset_tokens(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`, with indexes on `token_hash` and `(user_id, created_at)`. Add generic-response request/consume APIs, 32 random bytes, stored hash only, 30-minute expiry, single use, session revocation after reset, safe same-origin frontend pages, an explicitly selected email provider/secret, and IP + hashed normalized-email limits. No provider is currently configured, so none is assumed.
2. **Email verification is absent.** `users.email_verified_at` exists but is never set/enforced. A verified-email flow still needs a token table equivalent to `email_verification_tokens` plus provider, routes, resend limits, and pages. Private beta can proceed without it only if accounts are administrator-created and identities are confirmed out of band.
3. **No password-change flow or session inventory/revocation UI exists.** Add authenticated current-password verification, new-password validation, password hash update, revocation of every existing session, and issuance of one new session. No schema migration is required.
4. **Publisher safety is incomplete.** All 36 publishers require a confirmation phrase and default to localhost; 35 have recognizable quality gates and all have rollback logic. All accept `--password` and/or `--cookie`, which can expose secrets in shell history/process lists; none has dry-run/read-only diff mode; production origin is arbitrary rather than allowlisted; topic publishers replace the full topic payload even for tiny corrections. Remove CLI secret flags, use environment input only, require an additional production-origin phrase, print a scoped diff, and add dry-run support. The Decimals publisher's quality gate is not expressed like the other 35 and should be standardized.
5. **Recovery is documented only partially.** Time Travel is available and no migrations are pending, but alert ownership, restore rehearsal evidence, retention decisions, and long-term encrypted backup handling are not documented. The pre-existing timestamped local SQL export is now ignored by Git; it may contain personal/assessment data and must be access-controlled and deleted according to retention policy.
6. **Session retention is unmanaged.** Expired records are rejected correctly but not purged/revoked, and repeated publisher logins created many live admin sessions. Add a maximum active-session policy and scheduled cleanup/revocation. This can reuse the current schema.

### Low

1. Password confirmation and common/breached-password checks are absent. Keep the 12–128 character range and no silent truncation; avoid adding a symbol rule. Consider breached-password screening only through a privacy-preserving provider/design.
2. Passwords are exact Unicode strings but the Latin uppercase/lowercase/number rules reduce passphrase flexibility. Revisit complexity rules when password change/reset is implemented; do not normalize existing passwords silently.
3. `last_used_at` is never updated. If used later, update it at a coarse interval to avoid a write per request.
4. There is no self-service export/deletion. For beta, document a manual verified support process, retention periods, and cascade effects; legal language needs counsel.
5. The compatibility date is 2026-07-27 rather than the audit date. Update deliberately with a full test/deployment review, not incidentally.

### Passed

- Generic login failure for unknown email versus wrong password.
- Password salts, hash format, constant-time comparison, and no plaintext/API password return.
- Secure random session tokens, hashed-at-rest session identifiers, server expiry, server logout revocation, suspension revocation, current D1 role checks, and no frontend token storage.
- `HttpOnly`, production `Secure`, `SameSite=Lax`, `/` path, expiry/max-age, and high-priority authentication cookie. Local logout deletion now mirrors security attributes.
- Strict request schemas reject unexpected roles/fields; ids, enums, booleans, counts, strings, and arrays are bounded. Local JSON parsing now enforces 256 KiB rather than Cloudflare's much larger plan limit.
- Student A cannot access Student B practice, quiz, subject-assessment, or mock records. Child question and choice membership is checked server-side.
- Submitted attempts are immutable; answer scoring and pass/fail are server-derived; client payloads cannot supply score/key/elapsed time.
- Practice/quiz/subject/mock pre-submit payloads omit `isCorrect`, correct choice, and explanations. Keys appear only in submitted results/review or admin routes.
- Timed mock start/deadline uses server timestamps; refresh/reconnect does not reset it; edits at/after deadline close the attempt; duplicate submits are idempotent; untimed attempts have no deadline.
- No CORS middleware or `Access-Control-Allow-Origin` exists: policy is same-origin only. Local mutation origin checks add defense in depth; admin custom-header CSRF protection remains.
- No `dangerouslySetInnerHTML`, HTML/Markdown renderer, `eval`, or raw lesson HTML sink was found. React escapes content. Local media URL validation now rejects executable schemes.
- D1 values are bound parameters. Dynamic SQL identifiers/operators are internal constant unions/branches; the only variable-length `IN` builds placeholder characters, not values.
- No tracked `.env`, `.dev.vars`, key, DB dump, backup, or credential file was found. A filename-only Git-history secret-pattern scan found no matching files. Actual secret rotation was not needed from repository evidence.
- Production development DB check returns 404; unauthenticated current-user/admin checks return 401; health is minimal.
- D1 has 44 tables, about 7.5 MB, no pending migration, production backend service, and working Time Travel. Migrations are ordered `0001`–`0014` and tests apply them to isolated D1.
- Workers observability is enabled in `wrangler.jsonc`, and source maps are uploaded. No alerts were verified.

## CSRF, CORS, and security headers

- Cookies are used, so mutations need browser CSRF defenses. Existing `SameSite=Lax` plus the non-simple admin header is useful. The local global mutation middleware now rejects mismatched `Origin` or `Sec-Fetch-Site: cross-site`, while permitting no-Origin CLI publishers. This still requires deployment.
- Exact CORS policy: no cross-origin origins are allowed; no ACAO/credentials/preflight response is emitted. Localhost and preview origins are not accepted by production because the frontend uses relative same-origin requests.
- Local static/API baseline: `default-src 'none'`; `script-src/style-src/connect-src 'self'`; `img-src 'self' data: https:`; `object-src/base-uri 'none'`; `form-action 'self'`; `frame-ancestors 'none'`; HSTS one year with subdomains; `nosniff`; `DENY`; strict-origin referrer; camera/geolocation/microphone disabled; COOP/CORP same-origin. Build/browser QA must precede deployment.

## Logging and monitoring plan

Current code emits request ids and safe 500 bodies. Local changes remove raw exception messages and learner/internal ids from generation-failure logs. Logs must never include passwords, cookies/tokens, request bodies, selected answers, or reset/invite tokens.

Before beta, assign one owner and configure:

- Workers Logs saved queries/notifications for exceptions and 5xx rate; alerts at >=5 failures/5 min and >=2% 5xx/10 min.
- Rate-limit/429 count, login failure spikes, admin login/mutation anomalies, and publisher start/failure/success events.
- D1 error and latency views; p95 thresholds for normal API reads and attempt generation.
- Client telemetry or structured API events for autosave/submission failures without answer bodies.
- Daily checks for stuck/expired attempts, weekly D1 size/session growth, and monthly admin/audit review.
- Optional Analytics Engine for low-cardinality security events; external error monitoring only after privacy review.

## Backup and migration runbook

Cloudflare D1 Time Travel is automatic on the production backend. A restore overwrites the database, cancels in-flight queries, and loses writes after the selected bookmark. Keep the returned previous bookmark so a restore can itself be undone.

Before every migration or publisher:

1. Freeze content/admin writes and record approver, commit, database id, and intended scope.
2. `wrangler d1 time-travel info DB --json` and save the bookmark in an access-controlled, ignored timestamped file.
3. Export only when explicitly approved: `wrangler d1 export DB --remote --output=backups/cse-course-platform-YYYYMMDD-HHMMSS.sql`.
4. Verify the export is non-empty and contains schema without printing learner data. Encrypt/restrict it off-repository.
5. Run local migrations/tests and `wrangler d1 migrations list DB --remote`; verify the configured database UUID.
6. Apply only the named approved migration. Re-run the list, schema checks, and smoke tests.

Restore (incident approval only; destructive): `wrangler d1 time-travel restore DB --bookmark=<approved-bookmark>`. Preserve the pre-restore bookmark printed by Wrangler. Re-verify authentication, counts, content status, and attempt ownership. Conduct a restore rehearsal on a disposable database before beta; do not rehearse against production.

Migrations are safely one-time through D1's migration ledger, not inherently rerunnable SQL. Never edit an applied migration. Destructive migrations require an export/bookmark, explicit data mapping, maintenance window, rollback/forward-fix plan, and post-schema comparison.

## Privacy and data minimization

Stored learner data includes name, normalized email, password hash, role/status/verification timestamp, session IP/user agent/timestamps, enrollments, lesson progress, immutable questions/choices, selected-answer snapshots, scores/pass state, attempt timestamps/duration, and audit actors. IP/user agent aid abuse and incident response but need a short retention window. Academic attempts support learner history but need a published retention rule. User deletion cascades most learner data; audit actor references become null.

Before beta: publish a counsel-reviewed privacy notice/consent flow, state retention/support deletion/export practices, identify the controller/contact, restrict backup/log access, decide whether minors are allowed and obtain appropriate review, and avoid claims beyond reviewed policy. This checklist is operational guidance, not legal advice.

## Required access model and operational controls

Recommended initial model: **administrator-created accounts for no more than 20 learners**, with identity confirmed out of band. Do not rely on open registration without verification. Assign one primary and one backup admin owner; unique accounts only; no shared admin cookie/password.

Required controls: support address, incident contact, monitoring owner, daily first-week review, weekly backups/bookmark checks, content freeze during beta, two-step publisher approval (operator + reviewer or written self-check for solo founder), bug channel, manual recovery procedure, severity definitions, rollback authority, and announced maintenance windows.

## Beta checklist

### Must pass before beta

- [ ] Deploy and verify the local hardening changes after review.
- [ ] Restrict registration to the approved beta access model.
- [ ] Configure/test login, registration, attempt, autosave, submission, and admin/publisher rate limits.
- [ ] Replace/secure the preview admin identity; rotate its credential through an approved flow; revoke the 40 old active sessions; verify one controlled admin session.
- [ ] Confirm no Blocker defect and rerun all listed validations on the deployment candidate.
- [ ] Verify production headers/CORS/origin checks with read-only probes.
- [ ] Capture and verify a fresh bookmark/export; assign restore authority and rehearse on a disposable D1 database.
- [ ] Configure exception/5xx/login/429/D1/autosave/submission alerts and name the owner.
- [ ] Confirm support/incident contacts, privacy notice, account recovery, content freeze, and publisher approval process.
- [ ] Reconfirm answer-key secrecy, ownership, immutable snapshots, idempotent submissions, and exact mock timing in production smoke tests using controlled accounts.

### Should pass during the first beta week

- [ ] Authenticated password change with all-session revocation.
- [ ] Secure password reset and selected email provider, or documented admin-assisted recovery until implemented.
- [ ] Email verification if moving away from administrator-created accounts.
- [ ] Dry-run/scoped-diff publishers with environment-only credentials.
- [ ] Session cap/cleanup and a user-visible session revocation mechanism.
- [ ] Privacy retention schedule, feedback collection, recovery drill, and incident tabletop.

### Can wait until public launch

- Payments, public marketing, advanced analytics, large-scale email automation, self-service deletion/export, and broader multi-device session management.

## Validation evidence

- Focused security/authentication/authorization/ownership/registration/mock/subject run: **11 files, 265 tests passed**. This included 15 hardening tests, 3 registration-policy UI tests, all 192 Worker API tests, mock lifecycle/API/blueprint tests, subject submission tests, and 60,750 generated subject/mock questions across the named stress cases.
- Focused publishers: **26 files, 124 tests passed**.
- Full suite: **64 files, 857 tests passed** in 188.69 seconds. The curriculum-wide audit covered **290 generator families and 184,000 cases**; all named generator stress suites passed.
- Typecheck: passed (separate browser, Worker, UI-test, and Node projects plus `wrangler types --check`).
- Lint: passed (`eslint .`).
- Production build: passed; 358 Worker modules and 221 client modules transformed. The static `_headers` file is present in `dist/client/_headers`.
- Final source/artifact checks: no inline React style attributes, `dangerouslySetInnerHTML`, or stale `PassPath` branding under `src`/`public`; `git diff --check` passed. The build emitted one non-fatal existing advisory because `audit-log.service.ts` is both statically and dynamically imported.

## Local files changed

- New: `PRODUCTION_SECURITY_PRIVATE_BETA_AUDIT.md`, `public/_headers`, `src/react-app/components/AppErrorBoundary.tsx`, `src/worker/middleware/security.middleware.ts`, and `tests/security-hardening.test.ts`.
- Modified: `.gitignore`; `src/react-app/components/ProgressBar.tsx`; `src/react-app/main.tsx`; `src/react-app/pages/DashboardPage.tsx`; `src/react-app/pages/PracticeResultPage.tsx`; `src/react-app/pages/QuizResultPage.tsx`; `src/react-app/styles.css`; `src/worker/auth/cookie.ts`; `src/worker/index.ts`; `src/worker/schemas/lesson-block.schemas.ts`; `src/worker/services/mock-exam.service.ts`; `src/worker/services/subject-assessment.service.ts`; and `src/worker/utils/validation.ts`.
- Generated `dist` output is ignored and was not added to source control. Pre-existing backup files were not created, opened for content review, changed, or deleted; `backups/` is now ignored.

## Migration and deployment status
- Current hardening changes: **no migration needed; deployment needed**.
- Password reset: migration needed (proposed above), email provider/config needed, not created.
- Email verification/invitations: migration needed for secure single-use tokens, provider/config needed, not created.
- Rate limiting: no D1 migration; Cloudflare rule/binding configuration and deployment needed.
- Admin session/account remediation: manual production changes needed after backup/approval; none performed.

## Final decision

**NO-GO** for inviting real learners today.

Required before invitation: deploy/verify the local hardening; close open registration; configure rate limits; secure the production administrator and revoke old sessions; verify monitoring/alerts; and complete a fresh backup plus disposable restore rehearsal. Recommended maximum initial cohort is 20 administrator-created learners. Cloudflare dashboard/binding changes and a deployment are required. No migration is required for the local fixes or rate limiting; a migration is required for robust password-reset, email-verification, or one-time-invitation tokens.

Official references used for current platform behavior: [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/), [Workers Static Assets headers](https://developers.cloudflare.com/workers/static-assets/headers/), [Workers Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/), [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/), and [D1 import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/).
