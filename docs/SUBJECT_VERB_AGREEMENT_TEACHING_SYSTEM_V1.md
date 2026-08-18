# Subject–Verb Agreement Teaching System v1

This canonical teaching system upgrades the existing `subject-verb-agreement` topic without changing its curriculum order, activity routes, generators, fixed questions, scoring, assessments, or recovery mappings.

## Authoritative curriculum

The sixth Verbal Ability topic contains twelve activities: one reading lesson, nine generated-practice lessons, one fixed eight-question practice, and one fixed fifteen-question topic quiz. The canonical manifest preserves the audited block counts: 12 blocks in the introductory lesson and 10 blocks in every other activity.

## Teaching progression

The lessons progress from finding the true subject and handling the opposite-looking noun/verb `-s` patterns through compound subjects, proximity, indefinite pronouns, collective nouns and quantities, intervening phrases, inversion, and special agreement cases. Mixed lessons use the reusable CSE method: `Verb → Subject → Number → Rule → Check`.

Nine reusable `VisualTeachingBoard` models provide accessible text-first explanations. `IllustratedGuidedTeaching` is intentionally excluded because it would duplicate the visual boards. Grammar and Correct Usage remains the owner of broad grammar diagnosis; this topic owns agreement-specific decisions.

## Release safety

The dedicated publisher supports validate-only and read-only capability checks, deterministic canonical comparison, explicit deletion reporting, SHA-256 deletion fingerprints, fail-closed unknown deletions, atomic lesson reconciliation, post-write inspection, idempotency, and `unrelatedTopicsModified: 0`.

Production publication is permitted only through the registered Teaching Release workflow with confirmation `release-production`. Runtime changes must deploy and pass health and capability checks before content validation begins.
