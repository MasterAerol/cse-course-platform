export const generatedByLesson = {
  'facts-opinions-and-conclusions': 'fact-opinion-conclusion',
  'identifying-valid-conclusions': 'valid-conclusion',
  'assumptions-and-hidden-premises': 'assumption-identification',
  'if-then-statements': 'conditional-reasoning',
  'necessary-and-sufficient-conditions': 'necessary-sufficient-condition',
  'negation-and-contradiction': 'negation-contradiction',
  'basic-deductive-reasoning': 'basic-deduction',
  'logical-equivalence': 'logical-equivalence',
  'mixed-logical-reasoning-problems': 'mixed-logical-reasoning',
}

export const lessonSpecs = [
  ['Understanding Logical Statements', 'understanding-logical-statements', 'reading', 12],
  ['Facts, Opinions, and Conclusions', 'facts-opinions-and-conclusions', 'practice', 12],
  ['Identifying Valid Conclusions', 'identifying-valid-conclusions', 'practice', 14],
  ['Assumptions and Hidden Premises', 'assumptions-and-hidden-premises', 'practice', 14],
  ['If–Then Statements', 'if-then-statements', 'practice', 14],
  ['Necessary and Sufficient Conditions', 'necessary-and-sufficient-conditions', 'practice', 15],
  ['Negation and Contradiction', 'negation-and-contradiction', 'practice', 15],
  ['Basic Deductive Reasoning', 'basic-deductive-reasoning', 'practice', 16],
  ['Logical Equivalence', 'logical-equivalence', 'practice', 15],
  ['Mixed Logical Reasoning Problems', 'mixed-logical-reasoning-problems', 'practice', 18],
  ['Mixed Logical Reasoning Practice', 'mixed-logical-reasoning-practice', 'practice', 20],
  ['Logical Reasoning Fundamentals Topic Quiz', 'logical-reasoning-fundamentals-topic-quiz', 'quiz', 25],
].map(([title, slug, lessonType, minutes], index) => ({ title, slug, lessonType, minutes, position: index + 1 }))

const heading = (text, level = 2) => ({ blockType: 'heading', content: { level, text } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const example = (title, problem, steps, answer) => ({ blockType: 'example', content: { title, problem, steps, answer } })
const summary = (items) => ({ blockType: 'summary', content: { items } })

const teaching = {
  'facts-opinions-and-conclusions': ['A stated fact is information explicitly supplied as true for the problem. An opinion expresses a judgment. A conclusion must follow from the supplied facts.', 'Treat the passage as a closed world: use its statements, not real-world beliefs.', ['Fact and opinion', 'A record says five forms arrived. A clerk says the filing system is excellent.', ['The record count is supplied evidence.', '“Excellent” is a judgment.'], 'The count is the stated fact.'], ['Supported conclusion', 'All approved forms are signed. Form K is approved.', ['Apply the stated rule to Form K.', 'Do not add facts not present.'], 'Form K is signed.'], 'Do not confuse praise with evidence, copy a premise when an inference is requested, or overgeneralize.'],
  'identifying-valid-conclusions': ['A valid conclusion must be true whenever all stated premises are true.', 'Trace category membership or a rule one step at a time; reverse no arrows.', ['Category chain', 'All team leads attend the briefing. Mara is a team lead.', ['Place Mara in the team-lead group.', 'Apply the attendance rule.'], 'Mara attends the briefing.'], ['Contrapositive', 'Every approved form is signed. Form X is not signed.', ['Approved implies signed.', 'Not signed implies not approved.'], 'Form X is not approved.'], 'Avoid affirming the consequent, denying the antecedent, reversing a universal statement, and claiming more than the premises support.'],
  'assumptions-and-hidden-premises': ['An assumption is an unstated idea an argument needs in order for its reason to support its conclusion.', 'Choose the narrow bridge between the evidence and conclusion, not a stronger opinion.', ['Printer argument', 'Add a printer because employees wait to print.', ['The reason concerns waiting.', 'The needed bridge is that printer availability contributes to the delay.'], 'Availability must contribute to the wait.'], ['Schedule argument', 'Move a meeting earlier so Ana can attend.', ['The proposal changes time.', 'It assumes the earlier time permits Ana to attend.'], 'Ana must be available at the earlier time.'], 'Do not select the conclusion itself, irrelevant background, or an unnecessarily strong claim.'],
  'if-then-statements': ['A conditional rule “If P, then Q” makes P sufficient for Q.', 'Valid forms are P, therefore Q; and not Q, therefore not P.', ['Modus ponens', 'If a form is approved, it is logged. Form A is approved.', ['Use P → Q.', 'P holds for Form A.'], 'Form A is logged.'], ['Modus tollens', 'If a task is complete, it is signed. Task B is not signed.', ['Use not Q → not P.', 'The missing signature denies Q.'], 'Task B is not complete.'], 'Do not infer P from Q or infer not Q from not P. Those are affirming the consequent and denying the antecedent.'],
  'necessary-and-sufficient-conditions': ['A sufficient condition guarantees a result. A necessary condition is required but may not guarantee the result.', '“If” introduces a sufficient condition; “only if” introduces a necessary condition.', ['Sufficient', 'If a pass is gold, it grants gate access.', ['Gold is the stated trigger.', 'Within the rule, gold guarantees access.'], 'Gold is sufficient for access.'], ['Necessary', 'A worker enters only if an ID is shown.', ['“Only if” marks a requirement.', 'Other requirements may still apply.'], 'Showing an ID is necessary, not automatically sufficient.'], 'Do not reverse the condition or treat every requirement as a guarantee.'],
  'negation-and-contradiction': ['A negation is true exactly when the original statement is false.', 'Negate “all” with at least one counterexample; negate “some” with none.', ['Universal negation', 'Negate: All clerks are trained.', ['One untrained clerk is enough to make “all” false.', 'Keep the same subject group.'], 'At least one clerk is not trained.'], ['Conjunction', 'Negate: The office is open and the supervisor is present.', ['The conjunction fails if either part fails.', 'Use inclusive “or.”'], 'The office is not open or the supervisor is not present.'], 'Do not replace all with none, negate only a convenient part, or confuse a contrary with an exact contradiction.'],
  'basic-deductive-reasoning': ['Deduction combines stated premises so the conclusion is guaranteed.', 'Write a chain and apply each link in its stated direction.', ['Two steps', 'All leaders brief. Everyone who briefs signs. Mara leads.', ['Mara briefs.', 'Everyone who briefs signs.'], 'Mara signs.'], ['Elimination', 'Lio works Monday or Tuesday. Lio does not work Monday.', ['One listed option must hold.', 'Monday is eliminated.'], 'Lio works Tuesday.'], 'Do not choose what merely may be true, skip a link, reverse a relation, or import an unstated fact.'],
  'logical-equivalence': ['Equivalent statements have the same truth conditions.', 'A conditional equals its contrapositive; and/or order may be swapped; double negation restores the statement.', ['Contrapositive', 'If approved, then signed.', ['Let P be approved and Q be signed.', 'Use not Q → not P.'], 'If not signed, then not approved.'], ['Not both', 'It is not true that both P and Q hold.', ['Negate the conjunction.', 'Apply De Morgan’s rule.'], 'Not P or not Q.'], 'The converse and inverse are not equivalent to a conditional, and “not both” does not mean “neither.”'],
  'mixed-logical-reasoning-problems': ['Mixed problems first require identifying the logical structure being tested.', 'Label premises, conditions, quantifiers, and the requested conclusion before evaluating options.', ['Mixed conditional', 'If filed, logged. Record R is not logged.', ['Recognize modus tollens.', 'Use not logged → not filed.'], 'Record R is not filed.'], ['Mixed chain', 'All A are B; all B are C; Nia is A.', ['Follow A → B.', 'Then follow B → C.'], 'Nia is C.'], 'Do not switch rules midway, reverse an arrow, strengthen a quantifier, or use outside knowledge.'],
}

export function blocksFor(slug) {
  if (slug === 'understanding-logical-statements') return [
    heading('Logical statements make truth-valued claims'), paragraph('A logical statement is a declarative sentence that can be true or false. Logical reasoning evaluates the structure of the claim, not whether a reader personally believes it.'),
    heading('Statements and non-statements', 3), callout('Truth-language guide', 'Ask whether the sentence asserts one or more claims. Questions seek information; commands request action; exclamations express a reaction and generally are not propositions.'),
    example('Statement', '“All clerks submitted the report.”', ['It asserts a definite claim.', 'The claim can be evaluated as true or false.'], 'This is a logical statement.'),
    example('Command', '“Submit the report.”', ['It requests an action.', 'It does not assert a truth-valued claim.'], 'This is a command, not a proposition.'),
    example('Question', '“Did the meeting begin?”', ['It asks for information.', 'It does not itself assert an answer.'], 'This is a question, not a proposition.'),
    heading('Simple and compound statements', 3), example('Compound statement', '“The office is open and the supervisor is present.”', ['The sentence asserts that the office is open.', 'It also asserts that the supervisor is present.'], 'Two claims joined by “and” form a compound statement.'),
    callout('Use only the given information', 'A conclusion must follow from the supplied premises. Do not repair a problem with assumptions about offices, people, or ordinary life.', 'important'),
    callout('Common mistakes', 'Do not treat every complete sentence as a proposition, classify a question or command as a statement, or confuse a long sentence with a compound logical claim.', 'warning'),
    summary(['Statements can be true or false.', 'Questions, commands, and exclamations generally are not statements.', 'Compound statements combine claims.', 'Judge structure using only the given information.']),
  ]
  const item = teaching[slug]
  if (item !== undefined) return [heading(item[0]), paragraph(item[0]), callout('Reasoning rule', item[1]), example(...item[2]), example(...item[3]), callout('Common mistakes', item[4], 'warning'), heading('Practice method', 3), paragraph('Read the prompt as a complete rule system, identify the exact relation, and eliminate each option by naming the rule it violates.'), summary([item[1], item[4], 'Choose only what must follow from the supplied information.'])]
  return [heading('Assessment review'), paragraph('Review statements, evidence, conclusions, assumptions, conditional direction, quantifier negation, deduction, and equivalence before starting.'), callout('Closed-world rule', 'Use only the facts and rules in each question.'), example('Conditional review', 'If approved, then logged. A is approved.', ['Match the stated antecedent.', 'Apply modus ponens.'], 'A is logged.'), example('Negation review', 'Negate: All forms are signed.', ['Look for a counterexample.', 'Change all to at least one not.'], 'At least one form is not signed.'), callout('Common mistakes', 'Avoid converse errors, overgeneralization, outside assumptions, partial negation, and stronger-than-needed assumptions.', 'warning'), heading('Ready check', 3), paragraph('For each answer, be able to name the premise and rule that guarantees it.'), summary(['Follow arrows only in valid directions.', 'Negate quantifiers exactly.', 'Prefer necessary conclusions over possible claims.'])]
}

export const mixedQuestions = [
  ['Which sentence is a logical statement?', ['The office opens at eight.', 'Open the office.', 'Does the office open at eight?', 'What a busy office!'], 0, 'A declarative claim can be evaluated as true or false.'],
  ['A log states that six forms arrived. Which is the stated fact?', ['Six forms arrived.', 'The forms arrived too late.', 'Six is the ideal number of forms.', 'The clerk likes the forms.'], 0, 'The count is explicitly supplied by the log.'],
  ['All leaders attend the briefing. Mara is a leader. What follows?', ['Mara attends the briefing.', 'Everyone at the briefing is a leader.', 'Mara leads every team.', 'No leader misses any meeting.'], 0, 'Apply the universal rule directly to Mara.'],
  ['“Add a printer because employees wait to print.” What assumption is required?', ['Printer availability contributes to the wait.', 'Every employee owns a printer.', 'Printing is the most important office task.', 'The office will add a printer.'], 0, 'The reason supports the proposal only if availability contributes to the delay.'],
  ['If a form is approved, it is logged. Form A is approved. What follows?', ['Form A is logged.', 'Every logged form is approved.', 'Form A is not logged.', 'Form A was submitted today.'], 0, 'Modus ponens applies P → Q to P.'],
  ['A worker enters only if an ID is shown. Showing an ID is what kind of condition for entry?', ['Necessary', 'Automatically sufficient', 'Irrelevant', 'A contradiction'], 0, '“Only if” introduces a necessary condition.'],
  ['What is the negation of “All clerks are trained”?', ['At least one clerk is not trained.', 'No clerk is trained.', 'At least one clerk is trained.', 'All trained people are clerks.'], 0, 'A single counterexample negates a universal statement.'],
  ['All leaders brief. Everyone who briefs signs. Mara leads. What follows?', ['Mara signs.', 'Everyone who signs leads.', 'Mara signs only if nobody briefs.', 'All employees lead.'], 0, 'Follow the two-step chain: leads → briefs → signs.'],
]

export const quizQuestions = [
  ['Which is a logical statement?', ['The record is complete.', 'Complete the record.', 'Is the record complete?', 'What a complete record!'], 0, 'The declarative sentence asserts a truth-valued claim.'],
  ['Which is a compound statement?', ['The office is open and the supervisor is present.', 'Open the office.', 'Is the office open?', 'The supervisor'], 0, 'The first option combines two claims with “and.”'],
  ['A schedule states the meeting begins at nine. Which is the stated fact?', ['The meeting begins at nine.', 'Nine is the best meeting time.', 'The meeting will be productive.', 'Everyone prefers nine.'], 0, 'The schedule explicitly supplies the starting time.'],
  ['All approved forms are signed. Form K is approved. What is supported?', ['Form K is signed.', 'Every signed form is approved.', 'Form K is the only approved form.', 'No other form is signed.'], 0, 'Apply approved → signed to Form K.'],
  ['All approved forms are signed. Which conclusion is invalid?', ['Every signed form is approved.', 'An approved form is signed.', 'A form without a signature is not approved.', 'If K is approved, K is signed.'], 0, 'Reversing approved → signed is not valid.'],
  ['“Move the meeting earlier so Ana can attend.” What assumption is required?', ['Ana can attend at the earlier time.', 'Earlier meetings are always better.', 'Everyone wants Ana present.', 'The meeting has already moved.'], 0, 'The proposed time change must enable the claimed result.'],
  ['If filed, then logged. Record R is filed. What follows?', ['R is logged.', 'If logged, then filed.', 'R is not filed.', 'Every record is logged.'], 0, 'This is modus ponens.'],
  ['If complete, then signed. Task T is not signed. What follows?', ['T is not complete.', 'T is complete.', 'Every signed task is complete.', 'T was started late.'], 0, 'Modus tollens uses not-Q → not-P.'],
  ['If approved, then logged. A is logged, so A is approved. What error occurs?', ['Affirming the consequent', 'Modus ponens', 'Modus tollens', 'Valid contraposition'], 0, 'The argument invalidly infers P from Q.'],
  ['A worker enters only if an ID is shown. ID presentation is what for entry?', ['Necessary', 'Sufficient by itself', 'Unrelated', 'Equivalent to being employed'], 0, '“Only if” marks a necessary condition.'],
  ['If a pass is gold, it grants access. Being gold is what for access under this rule?', ['Sufficient', 'Necessary for every access case', 'A contradiction', 'An opinion'], 0, 'The antecedent guarantees the consequent.'],
  ['Negate “All reports are filed.”', ['At least one report is not filed.', 'No report is filed.', 'Some report is filed.', 'All files are reports.'], 0, 'Negating all requires at least one counterexample.'],
  ['Which directly contradicts “Mara is present”?', ['Mara is not present.', 'Mara may be present.', 'Lio is present.', 'Mara arrived early.'], 0, 'P and not-P are direct contradictions.'],
  ['Which is equivalent to “If approved, then signed”?', ['If not signed, then not approved.', 'If signed, then approved.', 'If not approved, then not signed.', 'If approved, then not signed.'], 0, 'A conditional is equivalent to its contrapositive.'],
  ['All leaders brief. Everyone who briefs signs. Mara leads. What must be true?', ['Mara signs.', 'Everyone who signs leads.', 'Only Mara briefs.', 'All employees sign.'], 0, 'The chain leads → briefs → signs guarantees that Mara signs.'],
]

