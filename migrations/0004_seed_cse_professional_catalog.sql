PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO courses (
    public_id,
    title,
    slug,
    short_description,
    description,
    level,
    thumbnail_key,
    status
) VALUES (
    'course-cse-professional',
    'CSE Professional',
    'cse-professional',
    'A focused Civil Service Examination preparation path.',
    'A structured preparation course for CSE learners.',
    'Professional',
    'courses/cse-professional',
    'published'
);

UPDATE courses
SET
    title = 'CSE Professional',
    short_description = 'A focused Civil Service Examination preparation path.',
    description = 'A structured preparation course for CSE learners.',
    level = 'Professional',
    thumbnail_key = 'courses/cse-professional',
    status = 'published',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'cse-professional';

INSERT OR IGNORE INTO subjects (
    course_id,
    title,
    slug,
    description,
    position,
    status
)
SELECT
    id,
    'Numerical Ability',
    'numerical-ability',
    'Core quantitative skills for CSE preparation.',
    1,
    'published'
FROM courses
WHERE slug = 'cse-professional';

UPDATE subjects
SET
    title = 'Numerical Ability',
    description = 'Core quantitative skills for CSE preparation.',
    position = 1,
    status = 'published',
    updated_at = CURRENT_TIMESTAMP
WHERE course_id = (
    SELECT id FROM courses WHERE slug = 'cse-professional'
)
AND slug = 'numerical-ability';

INSERT OR IGNORE INTO topics (
    subject_id,
    title,
    slug,
    description,
    position,
    status
)
SELECT
    subjects.id,
    'Percentages',
    'percentages',
    'A practical introduction to percentage concepts and applications.',
    1,
    'published'
FROM subjects
INNER JOIN courses ON courses.id = subjects.course_id
WHERE courses.slug = 'cse-professional'
AND subjects.slug = 'numerical-ability';

UPDATE topics
SET
    title = 'Percentages',
    description = 'A practical introduction to percentage concepts and applications.',
    position = 1,
    status = 'published',
    updated_at = CURRENT_TIMESTAMP
WHERE subject_id = (
    SELECT subjects.id
    FROM subjects
    INNER JOIN courses ON courses.id = subjects.course_id
    WHERE courses.slug = 'cse-professional'
    AND subjects.slug = 'numerical-ability'
)
AND slug = 'percentages';

INSERT OR IGNORE INTO lessons (
    topic_id,
    public_id,
    title,
    slug,
    lesson_type,
    summary,
    estimated_minutes,
    position,
    is_preview,
    requires_previous,
    status
)
SELECT topics.id, 'lesson-introduction-to-percentages', 'Introduction to Percentages', 'introduction-to-percentages', 'reading', 'A short orientation to percentage language and notation.', 8, 1, 0, 1, 'published'
FROM topics
INNER JOIN subjects ON subjects.id = topics.subject_id
INNER JOIN courses ON courses.id = subjects.course_id
WHERE courses.slug = 'cse-professional'
AND subjects.slug = 'numerical-ability'
AND topics.slug = 'percentages';

INSERT OR IGNORE INTO lessons (
    topic_id,
    public_id,
    title,
    slug,
    lesson_type,
    summary,
    estimated_minutes,
    position,
    is_preview,
    requires_previous,
    status
)
SELECT topics.id, 'lesson-understanding-percentages', 'Understanding Percentages', 'understanding-percentages', 'reading', 'A concise look at what percentages represent.', 10, 2, 0, 1, 'published'
FROM topics
INNER JOIN subjects ON subjects.id = topics.subject_id
INNER JOIN courses ON courses.id = subjects.course_id
WHERE courses.slug = 'cse-professional'
AND subjects.slug = 'numerical-ability'
AND topics.slug = 'percentages';

INSERT OR IGNORE INTO lessons (
    topic_id,
    public_id,
    title,
    slug,
    lesson_type,
    summary,
    estimated_minutes,
    position,
    is_preview,
    requires_previous,
    status
)
SELECT topics.id, 'lesson-fractions-decimals-and-percentages', 'Fractions, Decimals and Percentages', 'fractions-decimals-and-percentages', 'reading', 'Connect common number forms used in CSE problems.', 12, 3, 0, 1, 'published'
FROM topics
INNER JOIN subjects ON subjects.id = topics.subject_id
INNER JOIN courses ON courses.id = subjects.course_id
WHERE courses.slug = 'cse-professional'
AND subjects.slug = 'numerical-ability'
AND topics.slug = 'percentages';

INSERT OR IGNORE INTO lessons (
    topic_id,
    public_id,
    title,
    slug,
    lesson_type,
    summary,
    estimated_minutes,
    position,
    is_preview,
    requires_previous,
    status
)
SELECT topics.id, 'lesson-finding-the-percentage', 'Finding the Percentage', 'finding-the-percentage', 'practice', 'Practice identifying the percentage part of a value.', 12, 4, 0, 1, 'published'
FROM topics
INNER JOIN subjects ON subjects.id = topics.subject_id
INNER JOIN courses ON courses.id = subjects.course_id
WHERE courses.slug = 'cse-professional'
AND subjects.slug = 'numerical-ability'
AND topics.slug = 'percentages';

INSERT OR IGNORE INTO lessons (
    topic_id,
    public_id,
    title,
    slug,
    lesson_type,
    summary,
    estimated_minutes,
    position,
    is_preview,
    requires_previous,
    status
)
SELECT topics.id, 'lesson-finding-the-base', 'Finding the Base', 'finding-the-base', 'practice', 'Work backward to identify the original base amount.', 12, 5, 0, 1, 'published'
FROM topics
INNER JOIN subjects ON subjects.id = topics.subject_id
INNER JOIN courses ON courses.id = subjects.course_id
WHERE courses.slug = 'cse-professional'
AND subjects.slug = 'numerical-ability'
AND topics.slug = 'percentages';

INSERT OR IGNORE INTO lessons (
    topic_id,
    public_id,
    title,
    slug,
    lesson_type,
    summary,
    estimated_minutes,
    position,
    is_preview,
    requires_previous,
    status
)
SELECT topics.id, 'lesson-finding-the-rate', 'Finding the Rate', 'finding-the-rate', 'practice', 'Solve for rate in standard percentage questions.', 12, 6, 0, 1, 'published'
FROM topics
INNER JOIN subjects ON subjects.id = topics.subject_id
INNER JOIN courses ON courses.id = subjects.course_id
WHERE courses.slug = 'cse-professional'
AND subjects.slug = 'numerical-ability'
AND topics.slug = 'percentages';

INSERT OR IGNORE INTO lessons (
    topic_id,
    public_id,
    title,
    slug,
    lesson_type,
    summary,
    estimated_minutes,
    position,
    is_preview,
    requires_previous,
    status
)
SELECT topics.id, 'lesson-percentage-increase-and-decrease', 'Percentage Increase and Decrease', 'percentage-increase-and-decrease', 'reading', 'Understand changes expressed as percentages.', 14, 7, 0, 1, 'published'
FROM topics
INNER JOIN subjects ON subjects.id = topics.subject_id
INNER JOIN courses ON courses.id = subjects.course_id
WHERE courses.slug = 'cse-professional'
AND subjects.slug = 'numerical-ability'
AND topics.slug = 'percentages';

INSERT OR IGNORE INTO lessons (
    topic_id,
    public_id,
    title,
    slug,
    lesson_type,
    summary,
    estimated_minutes,
    position,
    is_preview,
    requires_previous,
    status
)
SELECT topics.id, 'lesson-discounts-and-markups', 'Discounts and Markups', 'discounts-and-markups', 'reading', 'Apply percentages to common price adjustment scenarios.', 12, 8, 0, 1, 'published'
FROM topics
INNER JOIN subjects ON subjects.id = topics.subject_id
INNER JOIN courses ON courses.id = subjects.course_id
WHERE courses.slug = 'cse-professional'
AND subjects.slug = 'numerical-ability'
AND topics.slug = 'percentages';

INSERT OR IGNORE INTO lessons (
    topic_id,
    public_id,
    title,
    slug,
    lesson_type,
    summary,
    estimated_minutes,
    position,
    is_preview,
    requires_previous,
    status
)
SELECT topics.id, 'lesson-worked-examples', 'Worked Examples', 'worked-examples', 'practice', 'Review solved percentage problems step by step.', 15, 9, 0, 1, 'published'
FROM topics
INNER JOIN subjects ON subjects.id = topics.subject_id
INNER JOIN courses ON courses.id = subjects.course_id
WHERE courses.slug = 'cse-professional'
AND subjects.slug = 'numerical-ability'
AND topics.slug = 'percentages';

INSERT OR IGNORE INTO lessons (
    topic_id,
    public_id,
    title,
    slug,
    lesson_type,
    summary,
    estimated_minutes,
    position,
    is_preview,
    requires_previous,
    status
)
SELECT topics.id, 'lesson-guided-practice', 'Guided Practice', 'guided-practice', 'practice', 'Try guided drills for percentage problem solving.', 15, 10, 0, 1, 'published'
FROM topics
INNER JOIN subjects ON subjects.id = topics.subject_id
INNER JOIN courses ON courses.id = subjects.course_id
WHERE courses.slug = 'cse-professional'
AND subjects.slug = 'numerical-ability'
AND topics.slug = 'percentages';

INSERT OR IGNORE INTO lessons (
    topic_id,
    public_id,
    title,
    slug,
    lesson_type,
    summary,
    estimated_minutes,
    position,
    is_preview,
    requires_previous,
    status
)
SELECT topics.id, 'lesson-percentages-topic-quiz', 'Percentages Topic Quiz', 'percentages-topic-quiz', 'quiz', 'A short checkpoint for the Percentages topic.', 10, 11, 0, 1, 'published'
FROM topics
INNER JOIN subjects ON subjects.id = topics.subject_id
INNER JOIN courses ON courses.id = subjects.course_id
WHERE courses.slug = 'cse-professional'
AND subjects.slug = 'numerical-ability'
AND topics.slug = 'percentages';
