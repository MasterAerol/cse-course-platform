# Context Clues Teaching System v1

The canonical source is `scripts/lib/context-clues-teaching-system-content.mjs`. It preserves the twelve authoritative Verbal Ability activities and their existing practice, quiz, generator, Smart Recovery, assessment, routing, scoring, and curriculum-locking relationships.

The progression moves from direct definition and restatement evidence through synonym, contrast, example, cause/effect, general inference, contextual multiple meanings, linked sentences, and mixed CSE-style reasoning. Signal words, punctuation, prediction, replacement, grammatical fit, and distractor elimination are taught as evidence tools. Broad word knowledge remains owned by Vocabulary and Word Meaning v1; relationship precision remains owned by Synonyms and Antonyms v1.

The fail-closed publisher is `scripts/create-and-publish-context-clues-teaching-system.mjs`. Validate-only output includes a deterministic reconciliation plan, exact deletion details, a deletion fingerprint when needed, and `unrelatedTopicsModified: 0`. Unknown deletion signatures require human review. Successful publication is followed by canonical inspection and a zero-write idempotency run through the shared Teaching Release workflow.
