# Smart Recovery Phase E

## Scope

Phase E integrates submitted recovery snapshots into the learner weakness
signal, derives historical before/after comparisons, exposes recovery history,
and refreshes the dashboard, overview, and result experience. It does not add
fixed-question mappings, mutable mastery aggregates, readiness scoring,
planning, migrations, publishing, or deployment behavior.

## Formula version 2

Phase B formula version 1 did not define a `recovery` source. Its implemented
generated-practice and mock-exam weights and its 20-item cap also differed from
the approved Phase E contract. Phase E therefore increments the formula version
to 2 instead of silently redefining version 1.

Formula version 2 uses:

| Submitted source | Weight |
| --- | ---: |
| Generated practice | 0.75 |
| Subject assessment | 1.25 |
| Mock examination | 1.25 |
| Recovery set | 1.25 |

The existing 180-day lookback, recent-five multiplier of 1.5, unanswered-zero
behavior, five-item minimum, 60% needs-practice threshold, 80% strong threshold,
and 15-point meaningful-trend threshold remain explicit. The combined window
is the latest 50 distinct items per learner and skill.

New recovery attempts are stamped with formula version 2. Historical attempts
retain their immutable stored formula version. Their score and question review
never change; the Phase E progress interpretation states which current formula
version performed the evidence comparison.

## Recovery evidence

Only attempts whose persisted status is `submitted` contribute. Evidence is
read from `recovery_attempts`, `recovery_question_snapshots`, immutable choices,
and server-scored `recovery_answers`. The snapshot supplies the skill,
generator/version/seed, subject, topic, related lesson, prompt identity, and
distractor classification context. Client state and live generator output are
not evidence sources.

In-progress attempts are excluded by the repository query, so a set cannot
influence the weakness signal that selected it. Evidence is deduplicated by
source plus immutable snapshot public ID. Duplicate submission and repeated API
reads therefore contribute no additional items. Recovery items use the same
lookback, recency ordering, unanswered handling, and latest-50 cap as all other
sources.

## Submission boundary and progress

Recovery submission remains atomic. Phase E binds a server-authored ISO
timestamp with millisecond precision into the same D1 batch that scores answers
and transitions the attempt to `submitted`. This avoids cross-source ordering
ambiguity caused by SQLite `CURRENT_TIMESTAMP` second precision.

For each trained skill:

- **Before** uses eligible evidence strictly before the attempt submission and
  excludes every snapshot from that recovery attempt.
- **After** uses eligible evidence through the submission time, including the
  submitted recovery snapshots.
- The response includes status, weighted accuracy, and evidence count for both
  boundaries, percentage-point change, and `improved`, `stable`, `declined`, or
  `insufficient_data`.
- `currentStatus` is also returned for the learner's current evidence window,
  allowing a historical result to remain stable while recommendations refresh.

The normal minimum-evidence and strong-status rules apply. A high recovery-set
score does not by itself establish mastery.

## Result interpretation

Interpretation is deterministic and learner-safe:

- `improved`: meaningful accuracy or status improvement;
- `strong_recovery_result`: a high set score without a stronger historical
  improvement conclusion;
- `still_needs_practice`: at least one trained skill remains below the normal
  weakness threshold;
- `more_evidence_needed`: no stronger conclusion is supported.

Messages explicitly avoid permanent-mastery, guaranteed-readiness, or
weakness-eliminated claims.

## APIs

Phase E adds:

- `GET /api/student/smart-recovery/history`
- `GET /api/student/smart-recovery/attempts/:attemptPublicId/result`

The plural Phase D result endpoint remains available for compatibility. All
routes use the authenticated session, learner-role middleware, active enrollment
validation, prepared D1 statements, and owner-scoped queries. No learner ID is
accepted from the client.

History returns the active attempt public ID, total submitted count, a bounded
newest-first list of 20 submitted attempts, score summaries, deterministic
interpretations, and per-skill before/after progress. It does not expose answer
keys, seeds, internal IDs, or other learners' records.

## Learner UI

The dashboard card shows the latest submitted recovery score. The overview adds
accessible history loading, empty, error, retry, and newest-first result states.
The result page uses the server interpretation and displays before/after status,
weighted accuracy, evidence counts, percentage-point change, trend, current
signal, and related-lesson links.

## Exclusions and next phase

Fixed practice and quiz mappings remain empty and excluded. Migration 0015 is
sufficient; no migration 0016 is created. Remote migration, canonical-skill
publication, production mutation, and deployment remain outside this phase.

A later phase may add approved fixed-question mappings, complete history
pagination, or broader planning features after separate review.
