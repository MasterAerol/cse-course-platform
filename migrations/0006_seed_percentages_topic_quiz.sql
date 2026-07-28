INSERT INTO quizzes (
    lesson_id,
    topic_id,
    title,
    description,
    quiz_type,
    passing_score,
    time_limit_minutes,
    maximum_attempts,
    shuffle_questions,
    shuffle_choices,
    show_explanations,
    status
)
SELECT
    lessons.id,
    topics.id,
    'Percentages Topic Quiz',
    'A 10-question checkpoint covering core percentage concepts. These are original practice questions, not actual CSC questions.',
    'topic',
    70,
    NULL,
    NULL,
    0,
    0,
    1,
    'published'
FROM lessons
INNER JOIN topics ON topics.id = lessons.topic_id
INNER JOIN subjects ON subjects.id = topics.subject_id
INNER JOIN courses ON courses.id = subjects.course_id
WHERE courses.slug = 'cse-professional'
  AND subjects.slug = 'numerical-ability'
  AND topics.slug = 'percentages'
  AND lessons.slug = 'percentages-topic-quiz'
  AND NOT EXISTS (
    SELECT 1
    FROM quizzes existing_quizzes
    WHERE existing_quizzes.lesson_id = lessons.id
      AND existing_quizzes.title = 'Percentages Topic Quiz'
  );

INSERT INTO questions (quiz_id, prompt, explanation, points, position, status)
SELECT quizzes.id, 'What is 3/5 expressed as a percentage?', 'Convert the fraction to a decimal: 3 divided by 5 is 0.6. Then multiply by 100 to get 60%.', 1, 1, 'active'
FROM quizzes
INNER JOIN lessons ON lessons.id = quizzes.lesson_id
WHERE lessons.slug = 'percentages-topic-quiz'
  AND quizzes.title = 'Percentages Topic Quiz'
  AND NOT EXISTS (SELECT 1 FROM questions WHERE questions.quiz_id = quizzes.id AND questions.position = 1);

INSERT INTO questions (quiz_id, prompt, explanation, points, position, status)
SELECT quizzes.id, 'What is 0.375 expressed as a percentage?', 'Move the decimal two places to the right or multiply by 100: 0.375 becomes 37.5%.', 1, 2, 'active'
FROM quizzes
INNER JOIN lessons ON lessons.id = quizzes.lesson_id
WHERE lessons.slug = 'percentages-topic-quiz'
  AND quizzes.title = 'Percentages Topic Quiz'
  AND NOT EXISTS (SELECT 1 FROM questions WHERE questions.quiz_id = quizzes.id AND questions.position = 2);

INSERT INTO questions (quiz_id, prompt, explanation, points, position, status)
SELECT quizzes.id, 'What is 18% of 250?', 'Convert 18% to 0.18, then multiply 0.18 by 250 to get 45.', 1, 3, 'active'
FROM quizzes
INNER JOIN lessons ON lessons.id = quizzes.lesson_id
WHERE lessons.slug = 'percentages-topic-quiz'
  AND quizzes.title = 'Percentages Topic Quiz'
  AND NOT EXISTS (SELECT 1 FROM questions WHERE questions.quiz_id = quizzes.id AND questions.position = 3);

INSERT INTO questions (quiz_id, prompt, explanation, points, position, status)
SELECT quizzes.id, 'Thirty is 15% of what number?', 'The base is part divided by rate: 30 divided by 0.15 equals 200.', 1, 4, 'active'
FROM quizzes
INNER JOIN lessons ON lessons.id = quizzes.lesson_id
WHERE lessons.slug = 'percentages-topic-quiz'
  AND quizzes.title = 'Percentages Topic Quiz'
  AND NOT EXISTS (SELECT 1 FROM questions WHERE questions.quiz_id = quizzes.id AND questions.position = 4);

INSERT INTO questions (quiz_id, prompt, explanation, points, position, status)
SELECT quizzes.id, 'What percent of 80 is 12?', 'Divide the part by the base: 12 divided by 80 is 0.15, which is 15%.', 1, 5, 'active'
FROM quizzes
INNER JOIN lessons ON lessons.id = quizzes.lesson_id
WHERE lessons.slug = 'percentages-topic-quiz'
  AND quizzes.title = 'Percentages Topic Quiz'
  AND NOT EXISTS (SELECT 1 FROM questions WHERE questions.quiz_id = quizzes.id AND questions.position = 5);

INSERT INTO questions (quiz_id, prompt, explanation, points, position, status)
SELECT quizzes.id, 'A value increases from 120 to 150. What is the percentage increase?', 'The increase is 30. Divide 30 by the original value 120 to get 0.25, or 25%.', 1, 6, 'active'
FROM quizzes
INNER JOIN lessons ON lessons.id = quizzes.lesson_id
WHERE lessons.slug = 'percentages-topic-quiz'
  AND quizzes.title = 'Percentages Topic Quiz'
  AND NOT EXISTS (SELECT 1 FROM questions WHERE questions.quiz_id = quizzes.id AND questions.position = 6);

INSERT INTO questions (quiz_id, prompt, explanation, points, position, status)
SELECT quizzes.id, 'A value decreases from 500 to 425. What is the percentage decrease?', 'The decrease is 75. Divide 75 by the original value 500 to get 0.15, or 15%.', 1, 7, 'active'
FROM quizzes
INNER JOIN lessons ON lessons.id = quizzes.lesson_id
WHERE lessons.slug = 'percentages-topic-quiz'
  AND quizzes.title = 'Percentages Topic Quiz'
  AND NOT EXISTS (SELECT 1 FROM questions WHERE questions.quiz_id = quizzes.id AND questions.position = 7);

INSERT INTO questions (quiz_id, prompt, explanation, points, position, status)
SELECT quizzes.id, 'An item priced at 1,200 is discounted by 20%. What is the sale price?', 'Twenty percent of 1,200 is 240. Subtract 240 from 1,200 to get 960.', 1, 8, 'active'
FROM quizzes
INNER JOIN lessons ON lessons.id = quizzes.lesson_id
WHERE lessons.slug = 'percentages-topic-quiz'
  AND quizzes.title = 'Percentages Topic Quiz'
  AND NOT EXISTS (SELECT 1 FROM questions WHERE questions.quiz_id = quizzes.id AND questions.position = 8);

INSERT INTO questions (quiz_id, prompt, explanation, points, position, status)
SELECT quizzes.id, 'A store buys an item for 800 and adds a 25% markup. What is the selling price?', 'Twenty-five percent of 800 is 200. Add 200 to 800 to get 1,000.', 1, 9, 'active'
FROM quizzes
INNER JOIN lessons ON lessons.id = quizzes.lesson_id
WHERE lessons.slug = 'percentages-topic-quiz'
  AND quizzes.title = 'Percentages Topic Quiz'
  AND NOT EXISTS (SELECT 1 FROM questions WHERE questions.quiz_id = quizzes.id AND questions.position = 9);

INSERT INTO questions (quiz_id, prompt, explanation, points, position, status)
SELECT quizzes.id, 'A class has 40 students. Sixty percent are present, and 25% of the present students are wearing ID cards. How many present students are wearing ID cards?', 'Sixty percent of 40 is 24 present students. Twenty-five percent of 24 is 6.', 1, 10, 'active'
FROM quizzes
INNER JOIN lessons ON lessons.id = quizzes.lesson_id
WHERE lessons.slug = 'percentages-topic-quiz'
  AND quizzes.title = 'Percentages Topic Quiz'
  AND NOT EXISTS (SELECT 1 FROM questions WHERE questions.quiz_id = quizzes.id AND questions.position = 10);

WITH quiz_questions AS (
    SELECT questions.id AS question_id, questions.position AS question_position
    FROM questions
    INNER JOIN quizzes ON quizzes.id = questions.quiz_id
    INNER JOIN lessons ON lessons.id = quizzes.lesson_id
    WHERE lessons.slug = 'percentages-topic-quiz'
      AND quizzes.title = 'Percentages Topic Quiz'
),
choices(question_position, choice_text, is_correct, position) AS (
    VALUES
    (1, '60%', 1, 1),
    (1, '35%', 0, 2),
    (1, '53%', 0, 3),
    (1, '0.6%', 0, 4),
    (2, '37.5%', 1, 1),
    (2, '3.75%', 0, 2),
    (2, '375%', 0, 3),
    (2, '0.375%', 0, 4),
    (3, '45', 1, 1),
    (3, '36', 0, 2),
    (3, '50', 0, 3),
    (3, '4.5', 0, 4),
    (4, '200', 1, 1),
    (4, '150', 0, 2),
    (4, '45', 0, 3),
    (4, '300', 0, 4),
    (5, '15%', 1, 1),
    (5, '12%', 0, 2),
    (5, '18%', 0, 3),
    (5, '66.67%', 0, 4),
    (6, '25%', 1, 1),
    (6, '20%', 0, 2),
    (6, '30%', 0, 3),
    (6, '125%', 0, 4),
    (7, '15%', 1, 1),
    (7, '17.65%', 0, 2),
    (7, '75%', 0, 3),
    (7, '85%', 0, 4),
    (8, '960', 1, 1),
    (8, '980', 0, 2),
    (8, '1,000', 0, 3),
    (8, '1,440', 0, 4),
    (9, '1,000', 1, 1),
    (9, '900', 0, 2),
    (9, '975', 0, 3),
    (9, '1,200', 0, 4),
    (10, '6', 1, 1),
    (10, '10', 0, 2),
    (10, '15', 0, 3),
    (10, '24', 0, 4)
)
INSERT INTO question_choices (question_id, choice_text, is_correct, position)
SELECT quiz_questions.question_id, choices.choice_text, choices.is_correct, choices.position
FROM quiz_questions
INNER JOIN choices ON choices.question_position = quiz_questions.question_position
WHERE NOT EXISTS (
    SELECT 1
    FROM question_choices
    WHERE question_choices.question_id = quiz_questions.question_id
      AND question_choices.position = choices.position
);
