# Codex Safe Release Workflow v1

Safe Release is the repository-controlled path for validating, committing, pushing, deploying, and health-checking an ordinary CSE Professional / PasaWise application change. It is intentionally conservative and never runs a database migration, database repair, seed, rollback, or production content publisher.

## Standard commands

Inspect and run the full validation suite without changing Git or production:

```powershell
npm.cmd run release:safe -- --message "Describe the release" --dry-run
```

After explicit production authorization:

```powershell
npm.cmd run release:safe -- `
  --message "Complete Average Teaching System v1" `
  --confirm release-production
```

Noninteractive Codex execution:

```powershell
npm.cmd run release:safe -- `
  --codex `
  --message "Complete Average Teaching System v1" `
  --confirm release-production
```

`--skip-validation` is available only with `--dry-run` for focused safety-rule tests. A real release always runs typecheck, lint, the full test suite, production build, and `git diff --check`.

## Release phases

The script stops on the first failure:

1. Preflight
2. Full validation
3. Risk classification and file inspection
4. Safe staging and staged-scope reinspection
5. Commit
6. Push `main` to `origin/main`
7. Cloudflare authentication check and `npm.cmd run deploy`
8. `GET /api/health` validation for HTTP 200 and `{ "status": "ok" }`
9. Final report

A clean working tree exits successfully with `Nothing to release.`

## Human-review boundaries

Deployment is blocked when the change includes:

- anything under `migrations/`;
- `wrangler.jsonc`, Wrangler TOML/JSON, or D1 binding configuration;
- scripts whose stable filename identifies repair, migration, seed, rollback, remote-D1, or production-mutation behavior;
- unresolved Git state or conflict markers;
- likely credentials or private keys;
- a changed file larger than 15 MB;
- a binary/archive inside `.tmp/`, `tmp/`, or `temp/`.

The rules are deterministic and filename-based where possible. Text scanning is an additional safeguard, not the only risk classifier.

A changed `create-and-publish-*.mjs` file is reported as a separate content-publishing requirement but does not by itself block compatible application deployment. Safe Release never invokes that publisher. Validate-only, deletion review, confirmation, publication, and post-publish verification remain their own explicitly authorized workflow. If the feature requires a migration or repair first, the migration/repair rule blocks application deployment.

## Credentials and failure behavior

Remote Codex works when the environment has Git push credentials, Cloudflare credentials, Node, npm dependencies, and Wrangler. A push failure preserves the local commit and stops before deploy. A Cloudflare authentication failure after push stops before deploy. A failed post-deploy health check is reported as `DEPLOYED BUT HEALTH CHECK FAILED`; no automatic rollback occurs.

The script never prints detected secret values. It reports only the affected filename and finding category. It also never discards source changes.

## Rule for future Codex tasks

After implementation and focused tests, Codex may run Safe Release only when the user explicitly authorizes automatic release and all of these are true:

- no migration is required;
- no manual database repair is required;
- no unsafe production mutation is required;
- full validation passes.

If application code and a content publisher change together, Safe Release may deploy the compatible application code, but the publisher remains manual unless the user separately authorizes that publisher's controlled production flow.

## Reusable prompt footer

```text
SAFE RELEASE:
After implementation, run all required validation.
If Safe Release determines this change is ordinary deployable code with no migration/manual production repair requirement, automatically run:

npm.cmd run release:safe -- --codex --message "<appropriate commit message>" --confirm release-production

If Safe Release blocks, do not bypass it. Report the blocking reason.
Do not run production content publishers automatically.
```

## Known limitations

Safe Release cannot prove semantic safety from filenames or text alone. Human review remains required for migrations, binding changes, production data mutation, and publisher deletion plans. The unauthenticated health check verifies Worker availability, not authenticated learner behavior; QA-account UI testing remains separate.