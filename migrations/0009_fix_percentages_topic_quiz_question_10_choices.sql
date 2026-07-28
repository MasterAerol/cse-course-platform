PRAGMA foreign_keys = ON;

WITH target_question AS (
    SELECT questions.id AS question_id
    FROM questions
    INNER JOIN quizzes ON quizzes.id = questions.quiz_id
    INNER JOIN lessons ON lessons.id = quizzes.lesson_id
    INNER JOIN topics ON topics.id = lessons.topic_id
    INNER JOIN subjects ON subjects.id = topics.subject_id
    INNER JOIN courses ON courses.id = subjects.course_id
    WHERE courses.slug = 'cse-professional'
      AND subjects.slug = 'numerical-ability'
      AND topics.slug = 'percentages'
      AND lessons.slug = 'percentages-topic-quiz'
      AND quizzes.title = 'Percentages Topic Quiz'
      AND questions.position = 10
      AND questions.prompt = 'A class has 40 students. Sixty percent are present, and 25% of the present students are wearing ID cards. How many present students are wearing ID cards?'
    LIMIT 1
),
expected_choices(position, choice_text, is_correct) AS (
    VALUES
    (1, '6', 1),
    (2, '10', 0),
    (3, '15', 0),
    (4, '24', 0)
)
UPDATE question_choices
SET
    choice_text = (
        SELECT expected_choices.choice_text
        FROM expected_choices
        WHERE expected_choices.position = question_choices.position
    ),
    is_correct = (
        SELECT expected_choices.is_correct
        FROM expected_choices
        WHERE expected_choices.position = question_choices.position
    )
WHERE question_id = (SELECT question_id FROM target_question)
  AND position IN (SELECT position FROM expected_choices);

WITH target_question AS (
    SELECT questions.id AS question_id
    FROM questions
    INNER JOIN quizzes ON quizzes.id = questions.quiz_id
    INNER JOIN lessons ON lessons.id = quizzes.lesson_id
    INNER JOIN topics ON topics.id = lessons.topic_id
    INNER JOIN subjects ON subjects.id = topics.subject_id
    INNER JOIN courses ON courses.id = subjects.course_id
    WHERE courses.slug = 'cse-professional'
      AND subjects.slug = 'numerical-ability'
      AND topics.slug = 'percentages'
      AND lessons.slug = 'percentages-topic-quiz'
      AND quizzes.title = 'Percentages Topic Quiz'
      AND questions.position = 10
      AND questions.prompt = 'A class has 40 students. Sixty percent are present, and 25% of the present students are wearing ID cards. How many present students are wearing ID cards?'
    LIMIT 1
),
expected_choices(position, choice_text, is_correct) AS (
    VALUES
    (1, '6', 1),
    (2, '10', 0),
    (3, '15', 0),
    (4, '24', 0)
)
INSERT INTO question_choices (
    question_id,
    choice_text,
    is_correct,
    position
)
SELECT
    target_question.question_id,
    expected_choices.choice_text,
    expected_choices.is_correct,
    expected_choices.position
FROM target_question
CROSS JOIN expected_choices
WHERE NOT EXISTS (
    SELECT 1
    FROM question_choices
    WHERE question_choices.question_id = target_question.question_id
      AND question_choices.position = expected_choices.position
);
