PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO lesson_blocks (
    lesson_id,
    block_type,
    content_json,
    position
)
SELECT lessons.id, 'heading', '{"level":1,"text":"Introduction to Percentages"}', 1
FROM lessons
WHERE lessons.public_id = 'lesson-introduction-to-percentages';

INSERT OR IGNORE INTO lesson_blocks (
    lesson_id,
    block_type,
    content_json,
    position
)
SELECT lessons.id, 'paragraph', '{"text":"Percentages give us a compact way to compare a part with a whole. Whenever you see a percentage, read it as a number out of one hundred."}', 2
FROM lessons
WHERE lessons.public_id = 'lesson-introduction-to-percentages';

INSERT OR IGNORE INTO lesson_blocks (
    lesson_id,
    block_type,
    content_json,
    position
)
SELECT lessons.id, 'callout', '{"variant":"info","title":"Definition","text":"A percentage is a ratio whose denominator is 100. The word percent means per hundred."}', 3
FROM lessons
WHERE lessons.public_id = 'lesson-introduction-to-percentages';

INSERT OR IGNORE INTO lesson_blocks (
    lesson_id,
    block_type,
    content_json,
    position
)
SELECT lessons.id, 'paragraph', '{"text":"The percentage symbol (%) is a shorthand for divided by 100. For example, 25% means 25 out of 100, or 25/100."}', 4
FROM lessons
WHERE lessons.public_id = 'lesson-introduction-to-percentages';

INSERT OR IGNORE INTO lesson_blocks (
    lesson_id,
    block_type,
    content_json,
    position
)
SELECT lessons.id, 'image', '{"src":"/images/percentage-grid.svg","alt":"A 100-square grid with 25 squares highlighted","caption":"25 out of 100 squares represents 25%."}', 5
FROM lessons
WHERE lessons.public_id = 'lesson-introduction-to-percentages';

INSERT OR IGNORE INTO lesson_blocks (
    lesson_id,
    block_type,
    content_json,
    position
)
SELECT lessons.id, 'formula', '{"expression":"25% = 25/100 = 0.25","description":"Percentages, fractions, and decimals can describe the same value."}', 6
FROM lessons
WHERE lessons.public_id = 'lesson-introduction-to-percentages';

INSERT OR IGNORE INTO lesson_blocks (
    lesson_id,
    block_type,
    content_json,
    position
)
SELECT lessons.id, 'example', '{"title":"Finding 25% of 240","problem":"What is 25% of 240?","steps":["Convert 25% to 0.25.","Multiply 0.25 by 240.","The answer is 60."],"answer":"60"}', 7
FROM lessons
WHERE lessons.public_id = 'lesson-introduction-to-percentages';

INSERT OR IGNORE INTO lesson_blocks (
    lesson_id,
    block_type,
    content_json,
    position
)
SELECT lessons.id, 'callout', '{"variant":"important","title":"Exam habit","text":"Before calculating, identify the base, the rate, and the part being asked for."}', 8
FROM lessons
WHERE lessons.public_id = 'lesson-introduction-to-percentages';

INSERT OR IGNORE INTO lesson_blocks (
    lesson_id,
    block_type,
    content_json,
    position
)
SELECT lessons.id, 'summary', '{"items":["Percent means per hundred.","25% is equal to 25/100.","25% is equal to 0.25.","Percentage questions usually involve a base, a rate, and a part."]}', 9
FROM lessons
WHERE lessons.public_id = 'lesson-introduction-to-percentages';

INSERT OR IGNORE INTO lesson_blocks (
    lesson_id,
    block_type,
    content_json,
    position
)
SELECT lessons.id, 'heading', '{"level":1,"text":"Understanding Percentages"}', 1
FROM lessons
WHERE lessons.public_id = 'lesson-understanding-percentages';

INSERT OR IGNORE INTO lesson_blocks (
    lesson_id,
    block_type,
    content_json,
    position
)
SELECT lessons.id, 'paragraph', '{"text":"This lesson will build intuition for comparing quantities using percentages. Full teaching content will be added in a later milestone."}', 2
FROM lessons
WHERE lessons.public_id = 'lesson-understanding-percentages';

INSERT OR IGNORE INTO lesson_blocks (
    lesson_id,
    block_type,
    content_json,
    position
)
SELECT lessons.id, 'summary', '{"items":["Percentages compare values to a base of 100.","A clear base makes percentage questions easier to solve."]}', 3
FROM lessons
WHERE lessons.public_id = 'lesson-understanding-percentages';

INSERT OR IGNORE INTO lesson_blocks (
    lesson_id,
    block_type,
    content_json,
    position
)
SELECT lessons.id, 'heading', '{"level":1,"text":"Fractions, Decimals and Percentages"}', 1
FROM lessons
WHERE lessons.public_id = 'lesson-fractions-decimals-and-percentages';

INSERT OR IGNORE INTO lesson_blocks (
    lesson_id,
    block_type,
    content_json,
    position
)
SELECT lessons.id, 'paragraph', '{"text":"This lesson connects equivalent forms such as 1/4, 0.25, and 25%. Full teaching content will be added in a later milestone."}', 2
FROM lessons
WHERE lessons.public_id = 'lesson-fractions-decimals-and-percentages';

INSERT OR IGNORE INTO lesson_blocks (
    lesson_id,
    block_type,
    content_json,
    position
)
SELECT lessons.id, 'summary', '{"items":["Fractions, decimals, and percentages can represent the same quantity.","Converting between forms is a core CSE percentage skill."]}', 3
FROM lessons
WHERE lessons.public_id = 'lesson-fractions-decimals-and-percentages';
