# CSE Professional Curriculum and Question-Quality Audit

Audit date: 2026-08-05  
Scope: local published CSE Professional data, all registered generator families, four subject assessments, and the full mock examination  
Production mutation: none

## Executive result

The local course has 4 published subjects, 33 published topics, 395 published lessons, 319 published practice sets, 4 published subject assessments, and 1 published full mock. All automated correctness, determinism, blueprint, type, lint, and build gates pass after the low-risk fixes documented below.

Audited totals:

| Measure | Result |
| --- | ---: |
| Active fixed questions | 807 |
| Fixed questions with exactly 4 unique choices and 1 key | 807 |
| Fixed questions with explanations | 807 |
| Registered generator families | 290 |
| Numerical generator families | 78 |
| Generated cases in the new cross-registry stress audit | 184,000 |
| Repeat generations used for determinism comparison | 184,000 |
| Exact duplicate prompt groups | 37 (74 records) |
| Source-bank entries in General Information | 114 |

Finding-group counts are Blocker 1, High 2, Medium 1, and Low 1. The Blocker and both High findings were fixed. The Medium finding is intentionally editorial and unresolved. The Low source defect is fixed in source, but two already-published local records require an explicit publisher run before their stored text changes.

## Published topic inventory

All rows below are published. `Gen` is the number of generated practice sets/generator families assigned to the topic; `Fixed` and `Quiz` are active stored questions.

### Numerical Ability

| Position | Topic slug | Lessons | Published practices | Gen | Fixed | Quiz |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | `percentages` | 11 | 5 | 3 | 25 | 10 |
| 2 | `fractions` | 12 | 8 | 7 | 8 | 15 |
| 3 | `decimals` | 12 | 8 | 7 | 8 | 15 |
| 4 | `ratio-and-proportion` | 12 | 9 | 8 | 8 | 15 |
| 5 | `average` | 12 | 9 | 8 | 8 | 15 |
| 6 | `number-problems` | 12 | 10 | 9 | 8 | 15 |
| 7 | `age-problems` | 12 | 10 | 9 | 8 | 15 |
| 8 | `work-and-rate-problems` | 12 | 10 | 9 | 8 | 15 |
| 9 | `distance-speed-and-time` | 12 | 10 | 9 | 8 | 15 |
| 10 | `simple-interest` | 12 | 10 | 9 | 8 | 15 |

The older Percentages topic has a different, internally consistent 11-lesson/5-practice structure. No unpublished or incorrectly ordered Numerical topic was found.

### Analytical Ability

Each topic has 12 lessons, 10 published practices (9 generated and 1 fixed), 8 fixed-practice questions, and 15 quiz questions.

| Position | Topic slug | Generator families |
| ---: | --- | ---: |
| 1 | `logical-reasoning-fundamentals` | 10 |
| 2 | `analogy-and-classification` | 9 |
| 3 | `number-series` | 9 |
| 4 | `letter-series` | 9 |
| 5 | `coding-and-decoding` | 9 |
| 6 | `ordering-and-ranking` | 9 |
| 7 | `syllogisms` | 9 |
| 8 | `seating-and-arrangement-problems` | 9 |
| 9 | `data-interpretation` | 9 |

### Verbal Ability

Each topic has 12 lessons, 10 published practices (9 generated and 1 fixed), 9 generator families, 8 fixed-practice questions, and 15 quiz questions.

| Position | Topic slug |
| ---: | --- |
| 1 | `vocabulary-and-word-meaning` |
| 2 | `synonyms-and-antonyms` |
| 3 | `context-clues` |
| 4 | `sentence-completion` |
| 5 | `grammar-and-correct-usage` |
| 6 | `subject-verb-agreement` |
| 7 | `pronouns-and-modifiers` |
| 8 | `sentence-structure-and-error-identification` |
| 9 | `paragraph-organization` |
| 10 | `reading-comprehension` |

### General Information

Each topic has 12 lessons, 10 published practices (9 generated and 1 fixed), 10 generator families, 12 fixed-practice questions, and 20 quiz questions.

| Position | Topic slug |
| ---: | --- |
| 1 | `philippine-constitution-fundamentals` |
| 2 | `ra-6713-code-of-conduct` |
| 3 | `peace-and-human-rights` |
| 4 | `environment-management-and-protection` |

All modern 12-lesson topics follow introduction, focused generated practice, mixed fixed practice, and topic quiz progression. Dependencies use sequential locking (`requiresPrevious`) and subject order. No draft lessons or missing topic prerequisites were found.

## Assessment and mock blueprint integrity

All assessment questions are generated and snapshot-backed; fixed/generated proportion is 0%/100%. Explanations are enabled after submission.

| Assessment slug | Questions | Topic allocation | Easy / medium / hard | Passing |
| --- | ---: | --- | --- | ---: |
| `numerical-ability-subject-assessment` | 50 | 5 per topic (10% each) | 20 / 20 / 10 | 70% |
| `analytical-ability-subject-assessment` | 45 | 5 per topic (11.11% each) | 18 / 18 / 9 | 70% |
| `verbal-ability-subject-assessment` | 50 | 5 per topic (10% each) | 20 / 20 / 10 | 70% |
| `general-information-subject-assessment` | 40 | 10 per topic (25% each) | 16 / 16 / 8 | 70% |

Generator-pool allocation follows the registered topic pools: Numerical 3/7/7/8/8/9/9/9/9/9; Analytical 10 then eight pools of 9; Verbal ten pools of 9; General Information four pools of 10.

The full mock is published with 150 scored questions, an 80% threshold, and a 190-minute timed mode. Timed and untimed modes use the same academic blueprint and optional content does not enter scoring.

| Mock subject | Questions | Overall share | Easy / medium / hard | Topic allocation |
| --- | ---: | ---: | --- | --- |
| Verbal | 50 | 33.33% | 15 / 25 / 10 | 5 each (10%) |
| Numerical | 40 | 26.67% | 12 / 20 / 8 | 4 each (10%) |
| Analytical | 40 | 26.67% | 12 / 20 / 8 | 5,5,4,4,4,4,5,4,5 (12.5% or 10%) |
| General Information | 20 | 13.33% | 6 / 10 / 4 | 5 each (25%) |
| Total | 150 | 100% | 45 / 75 / 30 | 30% / 50% / 20% difficulty mix |

## Findings

### Blocker — fixed-answer position leakage (fixed)

- Scope: every active fixed practice and topic quiz; all subjects and topic slugs.
- Representative prompt: `Warm : Hot :: Tired : ?`
- Defect: all 807 stored correct choices were position A (practice 297/0/0/0; quiz 510/0/0/0). Active fixed assessments did not request choice shuffling, exposing a severe answer pattern.
- Correct reasoning: display position is not part of correctness; choice IDs are the scoring authority.
- Fix: active practice and quiz payloads now derive a deterministic permutation from attempt public ID and question ID. The same attempt and result retain the same order; different attempts distribute the stored key across A-D. Stored questions, keys, score calculation, and blueprints are unchanged.
- Files: `src/worker/utils/attempt-choice-order.ts`, `src/worker/services/practice.service.ts`, `src/worker/services/quiz.service.ts`, `tests/attempt-choice-order.test.ts`, `tests/worker.test.ts`.
- Test: 1,000 attempt seeds require each position to receive 20-30% of the stored first choice; focused service suite passes 193/193.
- Publisher required: no.

### High — group-age validator rejected valid timeline sums (fixed)

- Subject/topic/slug: Numerical Ability / Age Problems / `sum-of-ages`.
- Representative seed: `curriculum-audit|sum-of-ages|1`.
- Prompt: `7 years ago, the total age of 3 people was 46 years. What is their present total age?`
- Defect: a two-person age-difference invariant was incorrectly applied to an arbitrary group timeline.
- Correct reasoning: present total is `46 + 3 × 7 = 67 years`; no ordered two-person difference invariant applies.
- Fix: skip that invariant for `timeline-sum` validation.
- File/test: `src/worker/generators/age-problems/age-problem-generators.ts`; caught by `tests/curriculum-question-quality-audit.test.ts`.
- Publisher required: no; generated attempts use the corrected code while historical snapshots remain immutable.

### High — mixed future-age range could exceed the platform maximum (fixed)

- Subject/topic/slug: Numerical Ability / Age Problems / `mixed-age-relationships`.
- Representative seed: `curriculum-audit|mixed-age-relationships|78` before the fix.
- Prior prompt: `Two people are now 81 and 23 years old. How many years from now will the older person be 3 times the younger person's age?`
- Defect: the equation was solvable (6 years) but generated an 81-year present age outside the bank's declared 80-year maximum, so the generator rejected its own case.
- Correct reasoning: bound the younger age before deriving the older age so the relationship and the allowed range both hold.
- Fix: compute the maximum future younger age from the ratio and elapsed years before sampling.
- File/test: `src/worker/generators/age-problems/age-problem-generators.ts`; caught by `tests/curriculum-question-quality-audit.test.ts`.
- Publisher required: no.

### Medium — exact practice-to-quiz reuse (unresolved by policy)

- Counts: Analytical 18 groups/36 records; Verbal 15/30; Numerical 3/6; General Information 1/2. Total 37 groups/74 records.
- Representative locations: `mixed-analogy-and-classification-practice` and `analogy-and-classification-topic-quiz`.
- Representative prompt: `Warm : Hot :: Tired : ?`
- Defect: exact reuse lowers assessment value for learners who just completed mixed practice. Most pairs are a mixed-practice item copied into the same topic quiz.
- Proposed correction: replace quiz copies with independently reviewed variants while preserving blueprint, skill, and difficulty. Near-duplicate review should precede edits.
- Files/publishers: multiple topic content modules and topic publishers; no automatic edits were made.
- Publisher required: yes only after an approved editorial replacement set exists.

### Low — mojibake apostrophes (source fixed; stored local records pending)

- Affected source files: `src/worker/domain/peace-human-rights/peace-human-rights.bank.ts`, `scripts/peace-human-rights-topic-content.mjs`, and `src/worker/domain/pronouns-modifiers/pronouns-modifiers-bank.ts`.
- Defect: 10 source occurrences used a corrupted apostrophe sequence.
- Fix: replaced them with U+2019 and added cross-registry malformed-text rejection.
- Stored local records still affected: `peace-and-human-rights` / `mixed-peace-human-rights-practice`, positions 1 and 6, in explanations containing `personâ€™s` and `othersâ€™`.
- Publisher required: `scripts/create-and-publish-peace-human-rights-topic.mjs` is required to update those published records. It was not run.

## Correctness, explanations, distractors, determinism, and safety

- Fixed content: 807/807 active questions have four unique choices, exactly one key, and a non-empty explanation. No duplicate option set or raw `<script>`/`<iframe>` content was found.
- Generated content: all 290 registered families passed their validator, deterministic equality, unique-choice, one-key, answer/explanation agreement, finite-number, malformed-text, and per-family answer-position checks.
- Stress volume: 78 numerical families × 1,000 plus 212 other families × 500 = 184,000 cases. Each was generated a second time for exact determinism comparison.
- Immutable behavior: generated attempts use stored question/choice/explanation snapshots and do not regenerate historical questions. Existing worker, assessment, and mock lifecycle tests pass.
- Presentation: production and publisher source scans are clear of U+FFFD and the targeted mojibake sequences after the source fix. Peso, punctuation, long-passage, table, and explanation rendering remain covered by the topic and UI tests.
- Distractors: registered families attach mistake-model derivations; no duplicate choices were found in stress. Generator answer positions each exceeded 15% in every A-D slot. The fixed-content display mitigation is described under the Blocker.
- Difficulty: subject assessments use 40/40/20 easy/medium/hard; the mock uses 30/50/20. Topic lessons progress from instruction through focused and mixed practice to assessment.

## General Information official-source status

All four banks are source-locked, contain 114 uniquely identified entries, reject current-person/partisan content, and retain provision and version metadata. Stable constitutional/statutory/treaty claims were checked against current official primary pages. Current institutional mandates are time-sensitive and should be rechecked for each release.

| Area | Status | Primary checklist |
| --- | --- | --- |
| 1987 Constitution | Verified against current Supreme Court E-Library text; safe to retain | Supreme Court E-Library / constitutional text |
| RA 6713 | Verified against Supreme Court E-Library and CSC statute collection; safe to retain | CSC RA 6713 and implementing rules |
| UDHR, ICCPR, ICESCR | Verified against current UN/OHCHR pages; safe to retain | UN/OHCHR instrument text |
| CHR constitutional mandate | Verified against current CHR mandate page; safe to retain | CHR and Article XIII, Sections 17-18 |
| Climate Change Commission mandate | Verified against the current Commission page; safe to retain | CCC / RA 9729 |
| DENR embedded mandate PDF | Exact embedded URL returned 403 to automated retrieval; equivalent official material corroborates it | Manually open the DENR EO 192 mandate source before release |
| EMB Region XII embedded mandate page | Exact embedded URL returned 403; other current official EMB regional mandate pages corroborate the same laws/functions | Replace with or manually verify an accessible canonical EMB source |

No legal interpretation, policy claim, agency role, or assessment item was rewritten from unsupported inference.

## Publisher and production action

No migration is needed. No publisher or production command was run.

Confirmed local publisher need: only the two stale stored Peace and Human Rights explanation strings require `scripts/create-and-publish-peace-human-rights-topic.mjs`. Production was not read or mutated, so a read-only production query must first confirm that those two stale strings are present. The publisher matches existing topic/lesson slugs and question positions and updates records rather than creating duplicates, so its content operations are idempotent. It will nevertheless PATCH the full topic payload and may update timestamps, not only the two strings.

Before a production publisher run:

1. Create a D1 Time Travel bookmark or export the affected topic rows.
2. Run the publisher's focused generator/publisher gate.
3. Execute the publisher once with its explicit confirmation and production admin credentials.
4. Query the topic for exactly 12 lessons, 9 generated practices, 12 fixed-practice questions, 20 quiz questions, zero duplicate positions, and zero malformed sequences.
5. Repeat once only if an idempotency proof is required, then compare counts and IDs.

The script rolls publication-status changes back in reverse order if publication fails, but it does not restore every earlier content PATCH. The D1 bookmark/export is therefore the complete rollback mechanism.

Proposed deployment command after review (not executed):

```powershell
npm run deploy
```

## Validation evidence

| Gate | Result |
| --- | --- |
| Focused service/choice-order tests | 2 files, 193 passed |
| Focused curriculum/source/blueprint tests | 14 files, 82 passed |
| Cross-registry stress audit | 290 families, 184,000 cases, passed |
| Duplicate audit | 807 fixed records scanned; 37 exact groups reported |
| Full test suite | 62 files, 839 passed |
| Typecheck | passed |
| Lint | passed |
| Production build | passed |

The build emitted a non-failing Vite chunk advisory for `audit-log.service.ts` being both statically and dynamically imported. No deployment occurred.
