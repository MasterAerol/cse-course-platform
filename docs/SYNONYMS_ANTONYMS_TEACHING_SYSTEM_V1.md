# Synonyms and Antonyms Teaching System v1

The canonical source is `scripts/lib/synonyms-antonyms-teaching-system-content.mjs`. It preserves the twelve authoritative Verbal Ability activities and their existing practice, quiz, generator, Smart Recovery, assessment, routing, scoring, and curriculum-locking relationships.

The progression is specific to synonym and antonym reasoning: same versus opposite direction, exact versus near matches, contextual sense, grammatical role, degree, tone, register, specificity, sentence replacement, distractor classification, and CSE-style elimination. Broad roots, affixes, word families, denotation, and multiple-meaning teaching remain owned by Vocabulary and Word Meaning Teaching System v1.

The fail-closed publisher is `scripts/create-and-publish-synonyms-antonyms-teaching-system.mjs`. Validate-only output includes a deterministic reconciliation plan, exact deletion details, a deletion fingerprint when needed, and `unrelatedTopicsModified: 0`. Unknown deletion signatures require human review. Successful publication is followed by canonical inspection and a zero-write idempotency run through the shared Teaching Release workflow.
