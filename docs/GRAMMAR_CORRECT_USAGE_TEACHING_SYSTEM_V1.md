# Grammar and Correct Usage Teaching System v1

Authoritative topic: `grammar-and-correct-usage` in CSE Professional → Verbal Ability.

The canonical source is `scripts/lib/grammar-correct-usage-teaching-system-content.mjs`. It preserves the twelve authoritative lesson slugs, activity types, durations, generator-backed practice links, fixed mixed practice, topic quiz, curriculum locking, Smart Recovery ownership, Verbal assessment coverage, and Full Mock coverage.

## Teaching progression

The system teaches standard formal usage through the reusable method `Read → Target → Rule → Eliminate → Verify`. Lessons progressively cover sentence roles and word forms, verb-tense timelines, articles and determiners, preposition relationships, conjunction logic, comparative scope, commonly confused words, complete-sentence elimination, and mixed-rule diagnosis.

Nine text-centered `VisualTeachingBoard` models provide accessible rule-to-example reasoning. No `IllustratedGuidedTeaching` block is part of this version.

## Safe publication

The dedicated publisher is `scripts/create-and-publish-grammar-correct-usage-teaching-system.mjs`. It supports validate-only planning, deterministic reconciliation, explicit deletion signatures, SHA-256 deletion-plan fingerprints, fail-closed human review, canonical post-write validation, and idempotency. It may mutate only the CSE Professional `verbal-ability/grammar-and-correct-usage` lesson blocks.

Release registry key and topic slug: `grammar-and-correct-usage`.

Publisher confirmation: `publish-grammar-correct-usage-teaching-system-v1`.

No migration or database repair is required.
