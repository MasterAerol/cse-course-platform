# Mistake Notebook v1

## Architecture

Mistake Notebook v1 is derived at read time from immutable submitted-attempt snapshots and answers. It creates no notebook table and requires no migration. Entries stay synchronized with authoritative scoring and cannot drift from historical results.

The repository uses one source-qualified `UNION ALL` CTE across supported engines. List filtering and pagination occur in SQL. The page query uses `COUNT(*) OVER()` so records and the total are returned by one bounded statement. Summary aggregates and grouped JSON are also calculated by one statement. Detail lookup uses the same normalized source with an exact opaque entry identifier and session-derived learner ID.

## Supported sources

- Generated Practice submitted attempts
- Subject Assessment submitted attempts
- Full Mock Examination submitted or auto-submitted expired attempts
- Smart Recovery submitted attempts

Each source preserves immutable prompt, choices, explanation JSON, public snapshot identity, submitted status, and learner ownership. Unanswered submitted snapshots are included as incorrect.

## Excluded sources

Fixed practice and topic quiz attempts are excluded from v1. Their answer text may be snapshotted, but their prompt and explanation still come from mutable authored question rows rather than immutable per-attempt question snapshots. No historical prompt or explanation is inferred.

## API

- `GET /api/student/mistake-notebook/summary`
- `GET /api/student/mistake-notebook`
- `GET /api/student/mistake-notebook/:entryId`

List filters: `subject`, `source`, `skill`, `from`, `to`, `unansweredOnly`, and `repeatedPatternOnly`. Pagination defaults to 20 and is capped at 50. Default ordering is newest submitted mistake first.

Entry identifiers are source-qualified public identifiers such as `practice:<attemptPublicId>:<snapshotPublicId>`. Numeric database IDs, generator seeds, and internal metadata are never exposed.

## Security

All routes require an authenticated student and active CSE Professional enrollment. Learner identity comes only from the authenticated session. Detail queries include the learner ID, so a cross-user identifier returns the same not-found response as an unknown identifier. Correct answers and explanations are returned only from submitted historical attempts.

## Metadata and Smart Recovery

Canonical skills are attached only through direct generator mappings or the immutable Smart Recovery snapshot. Missing, deprecated, or historically unavailable skill metadata does not suppress an otherwise valid mistake. Mistake patterns are shown only when the selected immutable choice carries a persisted distractor classification.

The detail endpoint optionally calculates the current Smart Recovery status for its single mapped skill. Historical question content is never rewritten. Notebook actions link to existing lesson, practice, and Smart Recovery routes; they do not bypass enrollment or lesson locks and do not create a retry engine.

## Historical compatibility and limitations

Older valid immutable snapshots remain readable when skill, mistake-pattern, explanation, topic, or related-lesson metadata is absent. Corrupt rows missing a prompt, correct answer, public identity, or valid submitted timestamp are excluded safely.

V1 has no read/unread state, bookmarking, manual notes, mastery overrides, or stored notebook records. Those capabilities would require a separately approved migration. Fixed practice and quiz support should wait for an immutable historical question snapshot design.