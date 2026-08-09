# CSE Readiness Score v1

## Architecture

CSE Readiness v1 is derived at request time from immutable submitted learner evidence. It creates no readiness table or historical snapshots, so no migration is required. Formula version is `CSE_READINESS_FORMULA_VERSION = 1`.

The estimate is not an official CSC score and does not guarantee passing.

## Formula

| Component | Maximum | Rule |
| --- | ---: | --- |
| Full Mock | 35 | 80% latest submitted score plus 20% historical best. |
| Subject Assessments | 30 | Latest submitted subject scores weighted by the platform mock distribution: Verbal 50/150, Numerical 40/150, Analytical 40/150, General Information 20/150. Missing subjects add zero and are not silently reweighted. |
| Skill Strength | 20 | Observed, classifiable Smart Recovery skills: Strong 100, Improving 70, Needs more practice 40. Unobserved and Not enough data skills are excluded rather than treated as failures. |
| Recent Practice | 10 | Accuracy over the latest 50 submitted generated-practice question snapshots, including unanswered snapshots as incorrect. |
| Improvement and Consistency | 5 | Bounded latest-versus-previous comparisons from mock, subject assessments, and practice halves. Deltas are capped at +/-20 points and fewer than two signals are scaled down. |

The contributions are summed, rounded to a whole-number score, and clamped to 0-100.

## Confidence

- Strong evidence: at least one full mock, all four subject assessments, at least 40 bounded Smart Recovery evidence items, and at least 30 recent generated-practice questions.
- Moderate evidence: at least one full mock, at least three subject assessments, and at least 40 bounded Smart Recovery evidence items.
- Low evidence: every other state.

A learner with no evidence receives a numeric zero for schema stability, but the UI suppresses a readiness interpretation and says there is not enough evidence for a reliable estimate.

## Readiness bands

- 0-39: Building foundations
- 40-59: Developing
- 60-74: Getting closer
- 75-84: Nearly ready
- 85-100: Strong readiness

These bands are platform guidance, not pass predictions. The mock examination's 80% passing target remains separate.

## Supported evidence

- Submitted or auto-submitted Full Mock attempts with a submission timestamp and score.
- Submitted subject-assessment attempts with a submission timestamp and score.
- Latest 50 immutable generated-practice snapshots from submitted attempts.
- Existing Smart Recovery formula v2 evidence/statuses over its bounded 180-day evidence window.

Excluded:

- In-progress, abandoned, and unsubmitted attempts.
- Fixed practices and quizzes, because v1 recent practice deliberately uses immutable generated snapshots.
- Lesson completion as a performance score.
- Mistake Notebook question retrieval; the readiness endpoint does not load notebook entries.
- Raw answers, answer keys, prompts, generator seeds, numeric database IDs, and client-supplied learner IDs.

## Subject readiness

Each subject combines its latest assessment score (70%) with the observed classifiable skill-strength percentage (30%) when both exist. If only one source exists, that source is shown. If neither exists, no percentage is returned. Labels are Needs attention below 60, Developing from 60 to 74.9, and Strong at 75 or above.

## Recommendations

The deterministic priority order is:

1. Take a Full Mock when none exists.
2. Complete the first missing subject assessment.
3. Open Smart Recovery when at least three observed skills need more practice.
4. Focus on the weakest subject when it trails the strongest by at least 15 points.
5. Take another timed mock when readiness is at least 75.
6. Otherwise continue the course.

All actions use existing authoritative routes and do not bypass enrollment, prerequisites, or locking.

## API and performance

`GET /api/student/readiness`

The endpoint requires authentication, learner role, active CSE Professional enrollment, and the existing learner rate limiter. The user ID comes only from the authenticated session.

The service uses six bounded query operations: enrollment, canonical skills, bounded Smart Recovery evidence, latest two full mocks, latest two assessments per subject, and latest 50 generated-practice questions. Smart Recovery is analyzed once in memory with the existing formula. There are no per-skill queries, question generation, full history reconstruction, or Mistake Notebook retrieval.

## Limitations and trends

The current comparison is derived from recent-versus-previous submitted evidence. It is not a persistent readiness history chart. A future readiness-history feature would require an explicitly approved migration and formula-versioned snapshots.
