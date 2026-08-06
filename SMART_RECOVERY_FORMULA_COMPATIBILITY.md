# Smart Recovery weakness-formula compatibility

## Final decision

The current weakness formula is version 2. Version 2 is required because Phase
E materially changed the result produced from submitted evidence; it did not
merely activate a source already defined by version 1.

| Semantic | Version 1 (Phase B) | Version 2 (Phase E/current) |
| --- | --- | --- |
| Generated practice weight | 1.00 | 0.75 |
| Subject assessment weight | 1.25 | 1.25 |
| Mock examination weight | 1.50 | 1.25 |
| Recovery evidence | Unsupported | Submitted recovery snapshots at 1.25 |
| Maximum distinct items per skill | Latest 20 | Latest 50 |

Both versions use the same 180-day lookback, five-item minimum, recent-five
multiplier of 1.5, unanswered-as-zero behavior, source-plus-snapshot
deduplication, 60% needs-practice threshold, 80% strong threshold, 15-point
meaningful-trend threshold, and mistake-pattern calculation. Before/after
comparison itself is not a formula change; it applies the attempt's recorded
formula at two evidence boundaries.

## Calculation-time policy

- Dashboard summaries and skill details always use the current formula (v2).
- A recovery attempt records the current taxonomy and formula versions when it
  is created. Those fields remain immutable after submission.
- Before and after metrics for a submitted attempt use that attempt's recorded
  formula version. Before excludes the attempt and requires timestamps strictly
  earlier than submission; after includes eligible evidence through submission.
- Result and history APIs derive metrics deterministically at the immutable
  submission boundary. Later evidence is excluded, so repeated reads remain
  stable. The stored score, snapshots, choices, and answer-score snapshots are
  never rewritten.
- `currentStatus` is intentionally separate: it is a live v2 dashboard signal,
  not a rewrite of the historical result.
- Supported historical versions coexist through explicit formula definitions.
  An unknown version fails closed; it is never silently evaluated as the
  current formula.
- Old attempts are not upgraded or backfilled to a newer formula.

No production Smart Recovery data exists, so no backfill is needed. Migration
0015 already stores a positive `weakness_formula_version` on each recovery
attempt and has all required immutable history fields; migration 0016 is not
required.

## Versioning policy

Increment the formula version whenever the same eligible evidence can produce a
materially different weighted accuracy, trend, status, priority, or
before/after result. Examples include changing supported sources, source or
recency weights, evidence-window limits, deduplication identity, unanswered
handling, status thresholds, trend thresholds, or mistake-pattern semantics.

Do not increment it for UI copy, response presentation, query optimization,
adding history navigation, or other changes that preserve the calculated
result. A new version must ship with an explicit retained definition for every
historical version that remains readable, compatibility tests, and a fail-closed
path for unsupported versions.
