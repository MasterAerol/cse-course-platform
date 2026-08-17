# Automatic Teaching Release Workflow v1

`npm.cmd run release:teaching -- --codex --topic average --message "Complete Average Teaching System v1" --confirm release-production`

The orchestrator resolves one of five registered publishers (`percentages`, `fractions`, `decimals`, `ratio-proportion`, `average`), delegates implementation validation/Git/deploy/health to Safe Release, then uses `CSE_CONTENT_ADMIN_EMAIL` and `CSE_CONTENT_ADMIN_PASSWORD` (or the registered legacy password variable) without printing credentials. It runs validate-only twice before writing, compares the complete deletion snapshot/fingerprint, publishes only zero-deletion or explicitly machine-safe deletion plans, post-validates, runs the publisher again, and requires zero creates/updates/deletes and no unrelated-topic changes.

Human review remains mandatory for unclassified, unknown, potentially valuable, unsafe, or `requires-human-review` deletions; migrations and DB repairs remain Safe Release blockers. Percentage/Fractions deletion plans are conservatively blocked if they report deletions without classifications. QA verification is optional and skipped when secure QA credentials are absent.

Dry run: `npm.cmd run release:teaching -- --topic average --message "Inspect Average release" --dry-run`. Add `--allow-production-read` only to permit credentialed production validate-only; dry run never writes.

Future prompt footer:

```text
AUTOMATIC RELEASE:
After implementation and all required validation, run:

npm.cmd run release:teaching -- --codex --topic <topic-slug> --message "<commit message>" --confirm release-production

The Teaching Release workflow may automatically commit, push, deploy, health-check, validate and safely publish teaching content, and verify idempotency. If it blocks, do not bypass it. Report the exact reason. Do not manually run migrations or DB repairs.
```