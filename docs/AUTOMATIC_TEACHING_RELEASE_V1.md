# Automatic Teaching Release Workflow v1

`npm.cmd run release:teaching -- --codex --topic average --message "Complete Average Teaching System v1" --confirm release-production`

The orchestrator resolves one of five registered publishers (`percentages`, `fractions`, `decimals`, `ratio-proportion`, `average`), delegates implementation validation/Git/deploy/health to Safe Release, then uses `CSE_CONTENT_ADMIN_EMAIL` and `CSE_CONTENT_ADMIN_PASSWORD` (or the registered legacy password variable) without printing credentials. It runs validate-only twice before writing, compares the complete deletion snapshot/fingerprint, publishes only zero-deletion or explicitly machine-safe deletion plans, post-validates, runs the publisher again, and requires zero creates/updates/deletes and no unrelated-topic changes.

Human review remains mandatory for unclassified, unknown, potentially valuable, unsafe, or `requires-human-review` deletions; migrations and DB repairs remain Safe Release blockers. Percentage/Fractions deletion plans are conservatively blocked if they report deletions without classifications. QA verification is optional and skipped when secure QA credentials are absent.

When `CSE_QA_STUDENT_PASSWORD` is present, `scripts/verify-qa-student-topic-access.mjs` signs in as `test@pasawise.com`, verifies active enrollment and unlocked curriculum state, and opens every lesson route in the released topic. It never configures, unlocks, resets, or changes learner progress; without that credential the QA phase reports `skipped`.

Dry run: `npm.cmd run release:teaching -- --topic average --message "Inspect Average release" --dry-run`. Add `--allow-production-read` only to permit credentialed production validate-only; dry run never writes.

Future prompt footer:

```text
AUTOMATIC RELEASE:
After implementation and all required validation, run:

npm.cmd run release:teaching -- --codex --topic <topic-slug> --message "<commit message>" --confirm release-production

The Teaching Release workflow may automatically commit, push, deploy, health-check, validate and safely publish teaching content, and verify idempotency. If it blocks, do not bypass it. Report the exact reason. Do not manually run migrations or DB repairs.

## One-time Remote Codex secret configuration

Configure these as secure Remote Codex/workspace environment secrets once:

```text
CSE_CONTENT_ADMIN_EMAIL
CSE_CONTENT_ADMIN_PASSWORD
```

Do not put their values in prompts, source files, committed `.env` files, JSON configuration, or command-line arguments. The shared credential takes precedence over the registered topic-specific legacy password variable. An explicit `--email` may be used as a non-secret fallback for content-only release; passwords are never accepted on the command line.

Remote Codex also needs Git push authentication (the workspace credential helper or a securely configured `GITHUB_TOKEN`) and Cloudflare/Wrangler authentication (normally a securely configured `CLOUDFLARE_API_TOKEN` authorized for this Worker/account). Safe Release reports the exact completed boundary when either is unavailable. Never place these values in prompts or committed files. No workflow automatically applies migrations, executes repair SQL, restores D1, or resets production data.

Publisher validate-only is the authenticated preflight: each registered publisher logs in and reads the current topic state before the shared pipeline permits write mode. Authentication failure therefore stops before publication.

## Content-only release

Use this when application code is already live and only canonical teaching content remains pending:

```powershell
npm.cmd run content:release -- --codex --topic average --confirm publish-content
```

The command resolves the publisher and credentials, validates the HTTPS production origin, runs validate-only, applies deletion/fingerprint rules, publishes only an automatically safe plan, post-validates, proves a zero-write second run, invokes an available inspector, and optionally verifies QA access. It prints both a human summary and `CONTENT_RELEASE_JSON` structured output.

## Full teaching release

```powershell
npm.cmd run release:teaching -- --codex --topic average --message "Complete Average Teaching System v1" --confirm release-production
```

This first runs Safe Release through validation, commit, push, Worker deploy, and `/api/health`. Only after a healthy deployment does it enter the same shared content pipeline. Missing content credentials block at that boundary without undoing an already-successful application release.

Future topics require one registry entry, one publisher, and one canonical content manifest. Unsupported aliases such as `number-problems`, `age-problems`, `work-rate`, `distance-speed-time`, and `simple-interest` remain explicitly rejected until those three pieces exist.

## Standard future prompt footer

```text
AUTOMATIC RELEASE:

After implementation and required validation, run the repository Teaching Release workflow for this topic.

If release is ordinary and safe:
- commit
- push
- deploy
- health-check
- validate production content
- publish production teaching content when automatically safe
- verify idempotency
```