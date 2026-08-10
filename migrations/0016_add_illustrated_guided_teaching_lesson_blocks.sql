-- Rebuild lesson_blocks so its closed type set matches the application schema.
-- Preserve the AUTOINCREMENT watermark as well as every stored row and ID.
CREATE TABLE lesson_blocks_0016_sequence (
    sequence_value INTEGER NOT NULL
);

INSERT INTO lesson_blocks_0016_sequence (sequence_value)
SELECT MAX(
    COALESCE((SELECT seq FROM sqlite_sequence WHERE name = 'lesson_blocks'), 0),
    COALESCE((SELECT MAX(id) FROM lesson_blocks), 0)
);

CREATE TABLE lesson_blocks_0016_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    block_type TEXT NOT NULL
        CHECK (
            block_type IN (
                'heading',
                'paragraph',
                'callout',
                'formula',
                'example',
                'image',
                'video',
                'divider',
                'summary',
                'illustrated-guided-teaching'
            )
        ),
    content_json TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    UNIQUE (lesson_id, position)
);

INSERT INTO lesson_blocks_0016_new (
    id,
    lesson_id,
    block_type,
    content_json,
    position,
    created_at,
    updated_at
)
SELECT
    id,
    lesson_id,
    block_type,
    content_json,
    position,
    created_at,
    updated_at
FROM lesson_blocks;

DROP TABLE lesson_blocks;

ALTER TABLE lesson_blocks_0016_new RENAME TO lesson_blocks;

CREATE INDEX idx_lesson_blocks_lesson_id
    ON lesson_blocks(lesson_id);

UPDATE sqlite_sequence
SET seq = (SELECT sequence_value FROM lesson_blocks_0016_sequence)
WHERE name = 'lesson_blocks';

INSERT INTO sqlite_sequence (name, seq)
SELECT 'lesson_blocks', sequence_value
FROM lesson_blocks_0016_sequence
WHERE NOT EXISTS (
    SELECT 1 FROM sqlite_sequence WHERE name = 'lesson_blocks'
);

DROP TABLE lesson_blocks_0016_sequence;
