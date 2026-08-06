# Smart Recovery Phase D

## Scope

Phase D adds targeted, generated-only recovery attempts. Fixed practice and
quiz mappings remain excluded. It does not add mastery aggregates, readiness
scores, planning features, or production data changes.

## Lifecycle

1. The learner summary reports whether a targeted set is available, an active
   attempt public ID, the recommended question count, eligible skill count,
   safe unavailable reason, and latest submitted result.
2. `POST /api/student/smart-recovery/attempts` accepts only a UUID idempotency
   key. The server chooses the learner, course, weaknesses, generators, seed,
   and question count.
3. A single D1 batch inserts the attempt, immutable question snapshots, and
   immutable choices. A failed statement rolls back the batch.
4. The in-progress attempt can be retrieved and resumed. Pre-submit responses
   omit correct answers, explanations, seeds, internal IDs, and formula details.
5. Answers autosave through an idempotent upsert. The selected choice must
   belong to the attempt snapshot. Correctness is not returned before submit.
6. Submission scores stored snapshots and choices server-side. Unanswered
   questions score zero. Answer score snapshots and the attempt status change
   in one D1 batch.
7. Submitted attempts, snapshots, choices, and answers are immutable. Duplicate
   submission returns the stored result.

## Allocation

Only `needs_more_practice` skills with a direct, active generator mapping are
eligible. Priority uses Phase B weighted accuracy, evidence count, then skill
slug. At most five skills and eight questions per skill are used.

| Eligible skills | Questions by priority | Total |
| ---: | --- | ---: |
| 5 or more | 6 / 5 / 4 / 3 / 2 | 20 |
| 4 | 7 / 5 / 4 / 4 | 20 |
| 3 | 8 / 7 / 5 | 20 |
| 2 | 8 / 8 | 16 |
| 1 | 8 | 8 |
| 0 | unavailable | 0 |

Broad `mixed-*` mappings, deprecated/missing generators, improving skills,
strong skills, and fixed questions are excluded.

## Generation and freshness

The attempt seed is created with Web Crypto. Generator choice and difficulty
rotation are deterministic from the attempt seed and skill. Question seeds are
derived from the attempt seed, skill, generator, position, difficulty, and a
bounded retry. The generator registry validates every output.

Recent generated practice, subject-assessment, mock-exam, and recovery
identities are checked. Recently seen generator/version/seed combinations,
canonical signatures, and normalized prompts are avoided where generation
permits. A duplicate or invalid output retries with a deterministic scoped seed;
the retry budget is bounded and failure produces no partial attempt.

## D1 consistency strategy

Migration `0015_smart_recovery_taxonomy_and_sessions.sql` contains all required
Phase D fields and constraints. No migration 0016 is required.

Creation uses one `D1Database.batch()` with subqueries that resolve the new
attempt and snapshot IDs from public IDs. D1 executes the statements
sequentially and rolls back the sequence if one fails. The attempt therefore is
not committed without all snapshots and choices. Submission similarly batches
all answer-score snapshots before the final status transition. Existing unique
indexes prevent duplicate idempotency keys and multiple active attempts.

Migration 0015 has no recovery mark-for-review field and snapshot updates are
forbidden, so Phase D intentionally omits mark-for-review. It also defines only
`in_progress` and `submitted`; Phase D does not invent an expiry status.

## API

- `GET /api/student/smart-recovery`
- `GET /api/student/smart-recovery/skills/:skillSlug`
- `POST /api/student/smart-recovery/attempts`
- `GET /api/student/smart-recovery/attempts/:attemptPublicId`
- `PUT /api/student/smart-recovery/attempts/:attemptPublicId/answers/:snapshotPublicId`
- `POST /api/student/smart-recovery/attempts/:attemptPublicId/submit`
- `GET /api/student/smart-recovery/attempts/:attemptPublicId/results`

All endpoints require an authenticated student with active CSE Professional
enrollment. Mutations use existing learner attempt/autosave rate limits.

## Learner routes

- `/smart-recovery`
- `/smart-recovery/skills/:skillSlug`
- `/smart-recovery/attempts/:attemptPublicId`
- `/smart-recovery/attempts/:attemptPublicId/results`

The attempt UI is untimed, one question at a time, autosaved, resumable, and
supports answered/unanswered navigation plus review and submission. The result
shows the score, skill breakdown, current weakness signal, related lessons, and
post-submit question review without promising mastery.

## Formula and evidence

Weakness formula version 1 remains unchanged. Recovery submissions are not
added to Phase B evidence in Phase D because adding the proposed 1.25 recovery
weight would alter the explicitly versioned formula contract. This decision is
documented rather than silently changing learner classifications.

## Deferred to Phase E

- Editorially approved fixed-question mappings and fixed fallback.
- Mark-for-review, if a future schema explicitly supports it.
- Full recovery history page beyond active attempt and latest result.
- A versioned decision on recovery evidence weighting/formula behavior.
- Mutable mastery, readiness, mistake notebook, and study-planning features.
