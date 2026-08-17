# Average Teaching System v1

## Scope

Average Teaching System v1 replaces only lesson teaching blocks under `cse-professional / numerical-ability / average`. It does not change generators, practices, fixed questions, the quiz, scoring, progression, Smart Recovery, assessments, or database schema.

## Authoritative curriculum audit

| Position | Lesson slug | Type | Minutes | Current blocks | Main audit finding | Practice linkage |
|---:|---|---|---:|---:|---|---|
| 1 | `understanding-average` | reading | 9 | 10 | Useful equal-sharing example, but formula appears before a complete conceptual derivation. | none |
| 2 | `sum-count-and-mean` | reading | 10 | 9 | Correct relationships but rearrangement is stated rather than visually derived. | none |
| 3 | `finding-the-average` | practice | 11 | 8 | Correct examples; needs stronger range/reasonableness check. | `finding-average` |
| 4 | `finding-a-missing-value` | practice | 11 | 8 | Correct method; required-total reasoning needs a full visual and verification. | `missing-value-average` |
| 5 | `combined-average` | practice | 12 | 8 | Correct weighted formula; unequal versus equal group logic needs visual contrast. | `combined-average` |
| 6 | `weighted-average` | practice | 12 | 8 | Correct examples; percentage and relative weights need one conceptual sequence. | `weighted-average` |
| 7 | `average-after-adding-a-value` | practice | 11 | 8 | Correct update formula; total/count changes and direction check need visualization. | `average-after-adding` |
| 8 | `average-after-removing-a-value` | practice | 11 | 8 | Correct removal method; replacement/count distinction is missing. | `average-after-removing` |
| 9 | `average-age-problems` | practice | 12 | 8 | Correct age totals; direct averaging misconception needs a concise warning. | `average-age` |
| 10 | `average-score-and-salary-problems` | practice | 13 | 8 | Correct target-total method; requires stronger verification and unit handling. | `average-score-salary` |
| 11 | `mixed-average-applications` | practice | 14 | 8 | Covers mixed models but lacks average-speed and average-rate distinctions. | fixed 8-question practice |
| 12 | `average-topic-quiz` | quiz | 18 | 4 | Appropriate orientation; quiz remains the existing fixed 15-question assessment. | fixed 15-question quiz |

All twelve slugs, activity types, positions, durations, and linkages are preserved. The canonical manifest contains 81 blocks and seven VisualTeachingBoards: equal sharing, sum/count derivation, missing value, combined average, weighted average, changing average, and average speed.

## Teaching standard

Every transformation identifies what changed, why it is valid, and where each value came from. Memory rules include their mathematical reason. The system teaches total/count meaning before formulas; distinguishes equal and unequal group weights; separates removal from replacement; and defines average speed as total distance divided by total time.

## Publisher

The dedicated publisher is `scripts/create-and-publish-average-teaching-system.mjs`.

- Confirmation phrase: `publish-average-teaching-system-v1`
- Password environment variable: `CSE_AVERAGE_ADMIN_PASSWORD`
- Validate-only performs no writes.
- Every deletion includes lesson, block ID, position, type, identifier, reason, and learner-content assessment.
- Any deletion requires the exact SHA-256 deletion-plan fingerprint through `--approve-deletions`.
- Each lesson is reconciled atomically with its audit record through an admin-only, course/subject/topic-restricted endpoint.
- Canonical JSON comparison preserves unchanged blocks and makes a second run write-free.
- Publishers never run through Safe Release.

Local production-shaped verification begins with the current 95-block structure and plans 81 updates, 14 superseded/excess deletions, and zero creates. The first local publish produces the canonical 81-block structure; the second produces zero creates, updates, or deletes. Production counts must be obtained from production validate-only because production may differ from the local authoritative starting fixture.

## Safe production procedure

Validate only:

```powershell
$env:CSE_AVERAGE_ADMIN_PASSWORD = '<set securely in the current session>'
node scripts/create-and-publish-average-teaching-system.mjs --base-url https://cse-course-platform.master-course.workers.dev --email '<admin email>' --validate-only
```

After reviewing every deletion and copying the reported fingerprint:

```powershell
node scripts/create-and-publish-average-teaching-system.mjs --base-url https://cse-course-platform.master-course.workers.dev --email '<admin email>' --confirm publish-average-teaching-system-v1 --approve-deletions '<validated fingerprint>'
```

Do not put the password on the command line. Re-run validate-only after publication to verify `writesRequired: false`.

## Known limitations and next topic

The lesson blocks use the platform's existing noninteractive teaching components; guided hints do not create a new exercise engine. Browser-width safety inherits the already-tested LessonPage and VisualTeachingBoard responsive contracts. The recommended next teaching-system topic is Number Problems.