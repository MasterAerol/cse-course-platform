# Private Beta Security Runbook

This runbook separates controls implemented in source from Cloudflare dashboard work, production account actions, and migration-deferred features. It does not authorize a deployment or production mutation.

## Implemented locally

- Production registration is fail-closed. `REGISTRATION_MODE=open` is the only value that enables `POST /api/auth/register`; missing, `closed`, or invalid values return a safe 403. `wrangler.jsonc` sets production to `closed`; `.dev.vars.example` explicitly sets development to `open`.
- `GET /api/config` exposes only the effective `open`/`closed` registration policy. Home, Login, and Registration use it; closed mode removes signup links and replaces the form with a private-beta message.
- Cloudflare Rate Limiting bindings protect login by IP and hashed normalized account, registration by IP, learner attempt creation/start/submission, answer autosave/review flags, and administrator APIs. Rejections return 429 and `Retry-After: 60`. Production fails closed with a safe 503 if a required binding is absent or unavailable. No isolate-local map is used.
- Static and API responses have CSP, clickjacking, MIME-sniffing, referrer, permissions, HSTS, and cross-origin protections. API responses are `no-store`; browser cross-site mutations are rejected; CORS is not enabled.
- Unhandled Worker failures return a generic response with a request ID. Logs contain error names/categories, not request bodies, passwords, cookies, tokens, actor rate-limit keys, or answer payloads.
- `/api/dev/database-check` remains server-gated and returns 404 unless `ENVIRONMENT=development`. No test/debug mutation route exists.
- Active production screens no longer show test-route wording or the administrator email. Publisher documentation uses `<admin-email>` rather than assuming the preview account.

## Required production variables and bindings

The deployment candidate must contain:

```text
ENVIRONMENT=production
REGISTRATION_MODE=closed
```

`REGISTRATION_MODE` is non-secret configuration. Do not put passwords, cookies, API tokens, or administrator credentials in `vars`. The six `ratelimits` bindings and namespace IDs `31001` through `31006` are declared in `wrangler.jsonc`; verify those IDs are unused by another Worker in the same Cloudflare account before deployment because equal namespace IDs share counters.

Application limits per Cloudflare location:

| Binding | Limit |
|---|---:|
| Login IP | 10/minute |
| Login account (SHA-256 key) | 5/minute |
| Registration IP | 3/minute |
| Attempt create/start/submit | 10/minute per learner, family, and operation |
| Answer autosave/review flag | 180/minute per learner, family, and operation |
| Administrator API | 300/minute per administrator |

Worker binding counters are permissive/eventually consistent and local to a Cloudflare location. They are defense in depth, not an accounting system or replacement for edge rules.

## Cloudflare dashboard controls required before beta

Do not claim these are configured until an operator verifies them in the production account. If the Worker remains only on `workers.dev`, attach an approved custom domain/zone before relying on zone WAF rules.

Create rate-limiting rules scoped to the production hostname and method/path, using **IP with NAT support** when the plan supports it:

1. Login: `POST /api/auth/login`, 10 requests per 60 seconds, block for 60 seconds, JSON 429 response.
2. Registration: `POST /api/auth/register`, 3 requests per hour, block for one hour. Keep registration closed even with this rule.
3. Attempt creation/start/submission: POST paths ending in `/attempts`, `/start`, or `/submit` under `/api/student/`; 30 requests per minute per visitor, block for 60 seconds.
4. Autosave/review flags: PUT student paths containing `/answers/` or `/review-flags/`; 600 requests per minute per visitor, block for 60 seconds. This edge ceiling intentionally exceeds normal exam autosave traffic.
5. Administrator APIs: `/api/admin/*`; start in log mode at 600 requests per minute, execute one full local publisher rehearsal, then enable blocking at a ceiling above the observed legitimate peak. Keep the application-level 300/minute per-admin limiter.

For security-critical login controls, combine visitor/IP characteristics with path and response-based counting of 401/403 where the Cloudflare plan permits it. Never key a credentialed rule only on a forgeable client header.

Workers observability is already enabled in source. In the dashboard, assign an owner and create notifications or saved queries for:

- 5 or more exceptions in 5 minutes;
- 5xx responses above 2% for 10 minutes;
- authentication failures and 429 spikes;
- rate-limit binding failures (`Rate-limit check failed`);
- admin mutation/publisher failures;
- D1 error/latency anomalies and mock/assessment generation failures.

## Administrator account actions: still blocked

No default administrator password, password-reseeding migration, startup seed, login bypass, or credential-printing path was found. Existing suspension logic can revoke all sessions internally, but the platform has no safe operator-facing password-change or revoke-all-sessions capability.

Per the implementation stop condition, this pass did not create that capability and did not change the production administrator or its sessions. Private beta remains blocked until a separately reviewed, no-schema implementation provides:

1. authenticated current-password verification;
2. new-password validation and PBKDF2 hashing through the existing password module;
3. revocation of every existing session for the account;
4. issuance of exactly one fresh session after password change;
5. an audited administrator action to revoke all sessions for a selected account without accepting raw numeric user IDs.

After that capability is deployed, the exact operator sequence is:

1. Capture a D1 Time Travel bookmark and approved backup.
2. Confirm the named administrator owner out of band.
3. Change the preview administrator password through the reviewed authenticated flow; never pass it on a command line or disclose it in logs.
4. Revoke all old sessions, then confirm the old browser session and every old publisher cookie receive 401.
5. Sign in once with the new credential and confirm one controlled active session.
6. Call `GET /api/admin/auth-check` from that session and require 200 with `authorized: true`.
7. Run a read-only D1 count for active sessions belonging to the administrator and require exactly one.
8. Rename the account to the named owner or suspend it after transferring administration. Do not delete it automatically.

## Backup and recovery before deployment

Read-only bookmark command:

```powershell
npx.cmd wrangler d1 time-travel info DB --json
```

Approved export command (writes sensitive data; run only in an access-controlled ignored directory):

```powershell
npx.cmd wrangler d1 export DB --remote --output=backups/cse-course-platform-YYYYMMDD-HHMMSS.sql
```

Verify the configured D1 UUID before any production action. Rehearse restore only on a disposable database. A production restore is destructive and requires incident approval.

## Validation and deployment sequence

```powershell
npm.cmd run cf-typegen
npm.cmd test -- --run
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npx.cmd wrangler deploy --dry-run
git diff --check
```

After review and after all dashboard/account prerequisites are complete, the exact deployment command is:

```powershell
npm.cmd run deploy
```

This command was not run during implementation.

Post-deployment read-only checks must confirm closed registration (403), login availability, development route 404, API/static security headers, no ACAO credential wildcard, cross-origin mutation 403, rate-limit 429/Retry-After in a controlled test, ownership boundaries, answer-key secrecy, server scoring, immutable submissions, and authoritative mock deadlines.

## Deferred because migration is required

- Single-use invitation tokens.
- Password-reset tokens.
- Email-verification tokens.

Do not create those migrations as part of this hardening pass.