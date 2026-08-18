# Sentence Completion Teaching System v1

The canonical source is `scripts/lib/sentence-completion-teaching-system-content.mjs`. It preserves all twelve authoritative activities and their existing generator, fixed-practice, quiz, Smart Recovery, assessment, scoring, routing, and curriculum-locking relationships.

The progression covers prediction, meaning and grammar filters, transitions, cause/effect, contrast/comparison, parallel structure, tone/formality, double blanks, collocation, and mixed CSE-style elimination. Vocabulary, Synonyms and Antonyms, and Context Clues remain separate prerequisite teaching systems.

The fail-closed publisher is `scripts/create-and-publish-sentence-completion-teaching-system.mjs`. It supports validate-only planning, deterministic reconciliation, explicit deletion details and fingerprints, human review for unknown deletions, canonical post-write inspection, idempotency, and `unrelatedTopicsModified: 0`.
