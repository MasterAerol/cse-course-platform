CREATE INDEX idx_quiz_attempt_answers_question_id
    ON quiz_attempt_answers(question_id);

CREATE INDEX idx_quiz_attempt_answers_selected_choice_id
    ON quiz_attempt_answers(selected_choice_id);
