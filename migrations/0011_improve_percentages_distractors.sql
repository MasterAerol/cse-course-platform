PRAGMA foreign_keys = ON;

ALTER TABLE quiz_attempt_answers
    ADD COLUMN selected_choice_text_snapshot TEXT;

ALTER TABLE quiz_attempt_answers
    ADD COLUMN correct_choice_text_snapshot TEXT;

ALTER TABLE practice_attempt_answers
    ADD COLUMN selected_choice_text_snapshot TEXT;

ALTER TABLE practice_attempt_answers
    ADD COLUMN correct_choice_text_snapshot TEXT;

UPDATE quiz_attempt_answers
SET selected_choice_text_snapshot = (
    SELECT question_choices.choice_text
    FROM question_choices
    WHERE question_choices.id = quiz_attempt_answers.selected_choice_id
)
WHERE selected_choice_id IS NOT NULL
  AND selected_choice_text_snapshot IS NULL;

UPDATE quiz_attempt_answers
SET correct_choice_text_snapshot = (
    SELECT correct_choices.choice_text
    FROM question_choices correct_choices
    WHERE correct_choices.question_id = quiz_attempt_answers.question_id
      AND correct_choices.is_correct = 1
    LIMIT 1
)
WHERE correct_choice_text_snapshot IS NULL;

UPDATE practice_attempt_answers
SET selected_choice_text_snapshot = (
    SELECT practice_question_choices.choice_text
    FROM practice_question_choices
    WHERE practice_question_choices.id = practice_attempt_answers.selected_choice_id
)
WHERE selected_choice_id IS NOT NULL
  AND selected_choice_text_snapshot IS NULL;

UPDATE practice_attempt_answers
SET correct_choice_text_snapshot = (
    SELECT correct_choices.choice_text
    FROM practice_question_choices correct_choices
    WHERE correct_choices.question_id = practice_attempt_answers.question_id
      AND correct_choices.is_correct = 1
    LIMIT 1
)
WHERE correct_choice_text_snapshot IS NULL;

WITH expected_practice_choices(lesson_slug, question_position, choice_position, choice_text, is_correct) AS (
    VALUES
    ('worked-examples', 1, 1, '84', 1),
    ('worked-examples', 1, 2, '35', 0),
    ('worked-examples', 1, 3, '240', 0),
    ('worked-examples', 1, 4, '8.4', 0),
    ('worked-examples', 2, 1, '180', 1),
    ('worked-examples', 2, 2, '36', 0),
    ('worked-examples', 2, 3, '1.8', 0),
    ('worked-examples', 2, 4, '7.2', 0),
    ('worked-examples', 3, 1, '25%', 1),
    ('worked-examples', 3, 2, '24%', 0),
    ('worked-examples', 3, 3, '96%', 0),
    ('worked-examples', 3, 4, '75%', 0),
    ('worked-examples', 4, 1, '20%', 1),
    ('worked-examples', 4, 2, '16.67%', 0),
    ('worked-examples', 4, 3, '30%', 0),
    ('worked-examples', 4, 4, '120%', 0),
    ('worked-examples', 5, 1, '₱600', 1),
    ('worked-examples', 5, 2, '₱200', 0),
    ('worked-examples', 5, 3, '₱1,000', 0),
    ('worked-examples', 5, 4, '₱775', 0),
    ('guided-practice', 1, 1, '81', 1),
    ('guided-practice', 1, 2, '18', 0),
    ('guided-practice', 1, 3, '450', 0),
    ('guided-practice', 1, 4, '8.1', 0),
    ('guided-practice', 2, 1, '160', 1),
    ('guided-practice', 2, 2, '64', 0),
    ('guided-practice', 2, 3, '1.6', 0),
    ('guided-practice', 2, 4, '25.6', 0),
    ('guided-practice', 3, 1, '30%', 1),
    ('guided-practice', 3, 2, '27%', 0),
    ('guided-practice', 3, 3, '90%', 0),
    ('guided-practice', 3, 4, '70%', 0),
    ('guided-practice', 4, 1, '20%', 1),
    ('guided-practice', 4, 2, '25%', 0),
    ('guided-practice', 4, 3, '50%', 0),
    ('guided-practice', 4, 4, '80%', 0),
    ('guided-practice', 5, 1, '₱575', 1),
    ('guided-practice', 5, 2, '₱75', 0),
    ('guided-practice', 5, 3, '₱425', 0),
    ('guided-practice', 5, 4, '₱515', 0)
)
UPDATE practice_question_choices
SET
    choice_text = (
        SELECT expected_practice_choices.choice_text
        FROM expected_practice_choices
        INNER JOIN practice_questions
            ON practice_questions.position = expected_practice_choices.question_position
        INNER JOIN practice_sets
            ON practice_sets.id = practice_questions.practice_set_id
        INNER JOIN lessons
            ON lessons.id = practice_sets.lesson_id
        WHERE practice_question_choices.question_id = practice_questions.id
          AND practice_question_choices.position = expected_practice_choices.choice_position
          AND lessons.slug = expected_practice_choices.lesson_slug
    ),
    is_correct = (
        SELECT expected_practice_choices.is_correct
        FROM expected_practice_choices
        INNER JOIN practice_questions
            ON practice_questions.position = expected_practice_choices.question_position
        INNER JOIN practice_sets
            ON practice_sets.id = practice_questions.practice_set_id
        INNER JOIN lessons
            ON lessons.id = practice_sets.lesson_id
        WHERE practice_question_choices.question_id = practice_questions.id
          AND practice_question_choices.position = expected_practice_choices.choice_position
          AND lessons.slug = expected_practice_choices.lesson_slug
    )
WHERE EXISTS (
    SELECT 1
    FROM expected_practice_choices
    INNER JOIN practice_questions
        ON practice_questions.position = expected_practice_choices.question_position
    INNER JOIN practice_sets
        ON practice_sets.id = practice_questions.practice_set_id
    INNER JOIN lessons
        ON lessons.id = practice_sets.lesson_id
    WHERE practice_question_choices.question_id = practice_questions.id
      AND practice_question_choices.position = expected_practice_choices.choice_position
      AND lessons.slug = expected_practice_choices.lesson_slug
);

WITH expected_quiz_choices(question_position, choice_position, choice_text, is_correct) AS (
    VALUES
    (1, 1, '60%', 1),
    (1, 2, '35%', 0),
    (1, 3, '53%', 0),
    (1, 4, '0.6%', 0),
    (2, 1, '37.5%', 1),
    (2, 2, '3.75%', 0),
    (2, 3, '375%', 0),
    (2, 4, '0.375%', 0),
    (3, 1, '45', 1),
    (3, 2, '250', 0),
    (3, 3, '18', 0),
    (3, 4, '4.5', 0),
    (4, 1, '200', 1),
    (4, 2, '30', 0),
    (4, 3, '2', 0),
    (4, 4, '15', 0),
    (5, 1, '15%', 1),
    (5, 2, '12%', 0),
    (5, 3, '85%', 0),
    (5, 4, '0.15%', 0),
    (6, 1, '25%', 1),
    (6, 2, '20%', 0),
    (6, 3, '30%', 0),
    (6, 4, '125%', 0),
    (7, 1, '15%', 1),
    (7, 2, '17.65%', 0),
    (7, 3, '75%', 0),
    (7, 4, '85%', 0),
    (8, 1, '₱960', 1),
    (8, 2, '₱240', 0),
    (8, 3, '₱1,440', 0),
    (8, 4, '₱1,180', 0),
    (9, 1, '₱1,000', 1),
    (9, 2, '₱200', 0),
    (9, 3, '₱600', 0),
    (9, 4, '₱825', 0),
    (10, 1, '6', 1),
    (10, 2, '10', 0),
    (10, 3, '16', 0),
    (10, 4, '24', 0)
)
UPDATE question_choices
SET
    choice_text = (
        SELECT expected_quiz_choices.choice_text
        FROM expected_quiz_choices
        INNER JOIN questions
            ON questions.position = expected_quiz_choices.question_position
        INNER JOIN quizzes
            ON quizzes.id = questions.quiz_id
        INNER JOIN lessons
            ON lessons.id = quizzes.lesson_id
        WHERE question_choices.question_id = questions.id
          AND question_choices.position = expected_quiz_choices.choice_position
          AND lessons.slug = 'percentages-topic-quiz'
          AND quizzes.title = 'Percentages Topic Quiz'
    ),
    is_correct = (
        SELECT expected_quiz_choices.is_correct
        FROM expected_quiz_choices
        INNER JOIN questions
            ON questions.position = expected_quiz_choices.question_position
        INNER JOIN quizzes
            ON quizzes.id = questions.quiz_id
        INNER JOIN lessons
            ON lessons.id = quizzes.lesson_id
        WHERE question_choices.question_id = questions.id
          AND question_choices.position = expected_quiz_choices.choice_position
          AND lessons.slug = 'percentages-topic-quiz'
          AND quizzes.title = 'Percentages Topic Quiz'
    )
WHERE EXISTS (
    SELECT 1
    FROM expected_quiz_choices
    INNER JOIN questions
        ON questions.position = expected_quiz_choices.question_position
    INNER JOIN quizzes
        ON quizzes.id = questions.quiz_id
    INNER JOIN lessons
        ON lessons.id = quizzes.lesson_id
    WHERE question_choices.question_id = questions.id
      AND question_choices.position = expected_quiz_choices.choice_position
      AND lessons.slug = 'percentages-topic-quiz'
      AND quizzes.title = 'Percentages Topic Quiz'
);
