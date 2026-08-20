const heading = (text, level = 2) => ({ blockType: 'heading', content: { level, text } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })
const formula = (expression, description) => ({ blockType: 'formula', content: { expression, description } })
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const example = (title, problem, steps, answer, visual) => ({ blockType: 'example', content: { title, problem, steps, answer, ...(visual === undefined ? {} : { visual }) } })
const summary = (items) => ({ blockType: 'summary', content: { items } })
const transition = (label, whatChanged, why, source) => ({ label, whatChanged, why, source, arrow: 'straight' })
const memory = (title, rule, reason, examples) => ({ title, rule, reason, examples })
const visual = (ariaLabel, stages, transitions, memoryTip) => ({
  kind: 'transformation',
  ariaLabel,
  stages: stages.map(([label, text, emphasis]) => ({ label, expression: [{ text, ...(emphasis ? { emphasis } : {}) }] })),
  transitions,
  memoryTip,
})
const practiceCta = (title) => paragraph(`Practice CTA: Continue to the linked ${title} activity. Its existing route, generator or fixed questions, passage pool, scoring, explanations, and curriculum lock remain unchanged.`)

export const evidenceProcessVisual = visual(
  'Following a passage-grounded reading process from overall meaning to a choice proved by exact textual evidence',
  [['Read', 'overall meaning'], ['Ask', 'identify question type', 'highlight'], ['Locate', 'find relevant sentence'], ['Prove', 'match evidence'], ['Choose', 'one supported answer', 'final']],
  [
    transition('Set context', 'The passage is read for its central direction.', 'Overall meaning prevents one isolated detail from controlling the answer.', 'whole passage.'),
    transition('Target the task', 'The question is classified before evidence is searched.', 'Main-idea, detail, and inference questions need different proof.', 'question wording.'),
    transition('Ground the choice', 'A relevant sentence or linked idea is identified.', 'Passage evidence—not topic knowledge—controls the answer.', 'relevant passage span.'),
    transition('Verify', 'Every option is compared with the evidence.', 'Unsupported additions make an otherwise plausible choice wrong.', 'one fully supported choice.'),
  ],
  memory('Read → Ask → Locate → Prove → Choose', 'Name the task and prove the answer before selecting it.', 'The sequence turns reading into an evidence check instead of a memory guess.', ['read meaning', 'locate proof', 'choose supported option']),
)

export const mainIdeaVisual = visual(
  'Building a main idea that covers internet access digital resources workshops and community programs in a modern library passage',
  [['Topic', 'modern libraries'], ['Detail 1', 'internet + digital resources'], ['Detail 2', 'workshops + programs', 'highlight'], ['Main idea', 'libraries offer wider community services', 'final']],
  [
    transition('Collect support', 'The topic receives its first service examples.', 'Details show what the passage says about libraries.', 'internet and digital resources.'),
    transition('Cover the passage', 'Additional services broaden the supporting set.', 'The main idea must include more than one interesting detail.', 'workshops and programs.'),
    transition('State the umbrella', 'The shared point becomes one complete claim.', 'The best main idea covers every important detail without adding a new subject.', 'wider community services.'),
  ],
  memory('Main idea = umbrella', 'Choose the statement that covers the important details underneath it.', 'An umbrella is neither one narrow detail nor a claim extending beyond the passage.', ['topic + all major support', 'not one detail']),
)

export const scopeTrapVisual = visual(
  'Testing narrow accurate and broad candidate main ideas against the complete scope of a public library passage',
  [['Narrow', 'libraries offer internet'], ['Best fit', 'libraries provide varied modern services', 'highlight'], ['Broad', 'all community needs are solved'], ['Decision', 'choose complete supported scope', 'final']],
  [
    transition('Expand coverage', 'One detail becomes a statement covering all listed services.', 'A main idea must represent the whole passage.', 'all major services.'),
    transition('Detect excess', 'The broader claim adds an absolute result not discussed.', 'Coverage is not permission to invent.', 'unsupported all-needs claim.'),
    transition('Select fit', 'The complete but limited statement remains.', 'Best fit means broad enough for the passage and no broader.', 'supported scope.'),
  ],
  memory('Whole, not huge', 'Cover the whole passage without making the claim larger than its evidence.', 'Too narrow misses support, while too broad imports material the author never supplied.', ['whole passage', 'supported boundary']),
)

export const detailEvidenceVisual = visual(
  'Tracing an exact office paper-reduction sentence into a faithful paraphrase and a supported detail answer',
  [['Passage', 'forms moved online'], ['Effect', 'paper use decreased', 'highlight'], ['Paraphrase', 'digital process reduced paper'], ['Answer', 'same idea, new wording', 'final']],
  [
    transition('Locate', 'The action and its stated effect are isolated.', 'Detail questions require exact traceability.', 'moving forms online reduced paper.'),
    transition('Restate', 'Different words preserve the same relationship.', 'Correct options often paraphrase instead of copying.', 'digital process = forms online.'),
    transition('Verify', 'The paraphrase adds no new result or certainty.', 'A faithful detail answer preserves subject, action, and scope.', 'same supported idea.'),
  ],
  memory('Same idea, not same words', 'Match meaning, subject, relationship, and scope.', 'A paraphrase can change wording while keeping every passage fact intact.', ['reduced paper = decreased paper use']),
)

export const statementStatusVisual = visual(
  'Classifying a claim about a program as stated contradicted or not mentioned by comparing it with the passage',
  [['Claim', 'program succeeded in every province'], ['Locate', 'program began in 2025'], ['Compare', 'no success evidence', 'highlight'], ['Status', 'not mentioned', 'final']],
  [
    transition('Search', 'The relevant program sentence is found.', 'Classification starts with what the passage actually says.', 'began in 2025.'),
    transition('Compare precisely', 'The choice asks about success, but the sentence gives only a date.', 'Silence is different from contradiction.', 'date does not prove success.'),
    transition('Classify', 'The unsupported claim is labeled not mentioned.', 'A claim is contradicted only when the passage supplies opposing information.', 'no success statement.'),
  ],
  memory('Silence is not false', 'Separate stated, contradicted, and not mentioned.', 'A missing fact has no passage support, but the passage has not necessarily denied it.', ['date stated', 'success not mentioned']),
)

export const structureMapVisual = visual(
  'Mapping a three-paragraph service passage from problem through evidence to a supported solution and result',
  [['Paragraph 1', 'problem: long queues'], ['Paragraph 2', 'response: online appointments', 'highlight'], ['Paragraph 3', 'result: shorter waits'], ['Structure', 'problem → solution → result', 'final']],
  [
    transition('Identify issue', 'The opening establishes what needs attention.', 'Structure begins with each paragraph’s job.', 'long queues.'),
    transition('Track response', 'The next paragraph presents the action taken.', 'A solution must answer the identified problem.', 'online appointments.'),
    transition('Name pattern', 'The result completes the relationship.', 'A light map shows how the passage develops without memorizing every word.', 'problem-solution-result.'),
  ],
  memory('Map jobs, not every word', 'Label each paragraph by its purpose in the passage.', 'Structure becomes visible when the reader tracks issue, evidence, shift, and conclusion.', ['problem', 'solution', 'result']),
)

export const causeEffectVisual = visual(
  'Preserving the direction from continued heavy rainfall through impassable roads to delayed public transport',
  [['Cause', 'rain continued'], ['Immediate effect', 'roads became impassable', 'highlight'], ['Later effect', 'transport was delayed'], ['Check', 'cause direction preserved', 'final']],
  [
    transition('Direct effect', 'Road conditions follow the rainfall.', 'The passage supplies the reason-result connection.', 'rain → roads.'),
    transition('Consequence', 'Transport delay follows the road condition.', 'Intermediate effects can also become causes.', 'roads → delay.'),
    transition('Reject reversal', 'The final chain keeps the stated direction.', 'A distractor that says delay caused the rain reverses the relationship.', 'stated causal order.'),
  ],
  memory('Because points back; therefore points forward', 'Trace what caused what in the passage.', 'Signal words and sentence order protect against reversed relationships.', ['because rain', 'therefore roads closed']),
)

export const contextReferenceVisual = visual(
  'Using nearby purpose and a named noun to resolve the contextual meaning of reserved and the reference of it',
  [['Sentence', 'computer is reserved'], ['Purpose', 'for government transactions', 'highlight'], ['Meaning', 'reserved = set aside'], ['Reference', 'it = the computer', 'final']],
  [
    transition('Use context', 'The following purpose limits the word’s meaning.', 'As used in the passage matters more than a familiar unrelated sense.', 'priority purpose.'),
    transition('Substitute', 'Set aside fits the grammar and meaning.', 'A valid contextual sense preserves part of speech and sentence logic.', 'reserved adjective.'),
    transition('Trace reference', 'The pronoun points to the nearest sensible named noun.', 'Reference questions ask what earlier word or idea the expression replaces.', 'computer before it.'),
  ],
  memory('Nearby meaning; backward reference', 'Use surrounding evidence for a word and look backward for a reference target.', 'Context limits meaning, while pronouns and demonstratives depend on an earlier noun or idea.', ['reserved = set aside', 'it = computer']),
)

export const inferenceVisual = visual(
  'Combining waterproof shoes and dark clouds through one small logical step to infer that Lena expected rain',
  [['Evidence A', 'umbrella + waterproof shoes'], ['Evidence B', 'dark clouds', 'highlight'], ['Small step', 'rain preparation'], ['Inference', 'Lena expected rain', 'final']],
  [
    transition('Combine clues', 'Preparation details are connected with weather conditions.', 'A strong inference normally uses more than one supporting clue.', 'clothing and clouds.'),
    transition('Limit reasoning', 'The clues support preparation for rain.', 'The logical step stays close to the text.', 'rain preparation.'),
    transition('Conclude', 'The limited interpretation becomes the answer.', 'Claims about a storm, flooding, or future travel would require imagination.', 'expected rain.'),
  ],
  memory('Inference = evidence + one small step', 'Move only as far as the combined clues justify.', 'A larger leap becomes speculation even when it is possible in real life.', ['clues → expected rain', 'not clues → guaranteed storm']),
)

export const purposeToneVisual = visual(
  'Separating the topic of online government services from an explanatory purpose and an optimistic tone proved by wording',
  [['Topic', 'online government services'], ['Purpose', 'explain their benefits', 'highlight'], ['Tone words', 'promising step'], ['Tone', 'optimistic / approving', 'final']],
  [
    transition('Ask why', 'The subject becomes the author’s action.', 'Purpose is what the passage does with its topic.', 'explains benefits.'),
    transition('Find attitude', 'Evaluative wording is isolated.', 'Tone must come from word choice, not the reader’s feelings about the topic.', 'promising step.'),
    transition('Label moderately', 'The evidence supports an optimistic or approving label.', 'The label should be no stronger than the wording.', 'moderate positive tone.'),
  ],
  memory('Topic = what; purpose = why; tone = attitude', 'Answer three different questions with three kinds of evidence.', 'Separating subject, function, and wording prevents attractive category errors.', ['services', 'explain', 'optimistic']),
)

export const factConclusionVisual = visual(
  'Distinguishing a reported application count from an evaluative claim and then building a limited conclusion from evidence',
  [['Fact', '500 applications processed'], ['Opinion', 'best improvement', 'highlight'], ['Evidence set', 'fewer errors + shorter waits'], ['Conclusion', 'procedure improved service', 'final']],
  [
    transition('Classify', 'A verifiable report is separated from a judgment.', 'Best signals evaluation, while the count can be checked.', 'count versus judgment.'),
    transition('Collect evidence', 'Two results are combined instead of relying on preference.', 'A conclusion should follow multiple supporting details.', 'errors and waiting time.'),
    transition('Limit conclusion', 'The judgment stays within the measured results.', 'The evidence supports improvement, not perfection everywhere.', 'supported improvement.'),
  ],
  memory('Verify facts; prove conclusions', 'Ask whether a statement can be checked and whether the final judgment follows from evidence.', 'Opinions express evaluation, while conclusions still need passage support.', ['500 applications = fact', 'best = opinion']),
)

export const distractorVisual = visual(
  'Eliminating a partly true choice by comparing every clause with evidence and rejecting one unsupported addition',
  [['Evidence', 'training improved efficiency'], ['Choice start', 'training improved efficiency', 'highlight'], ['Added claim', 'for every employee always'], ['Decision', 'reject unsupported addition', 'final']],
  [
    transition('Match', 'The opening clause agrees with the passage.', 'Distractors often begin with familiar evidence.', 'improved efficiency.'),
    transition('Inspect whole choice', 'An absolute claim is added.', 'Every part of an answer must be supported.', 'every employee always.'),
    transition('Eliminate', 'The unsupported addition invalidates the option.', 'Partly true is not fully correct.', 'passage gives no absolute guarantee.'),
  ],
  memory('Extreme choice? Prove the extreme', 'Require strong evidence for always, never, all, none, only, or completely.', 'Moderate passage language cannot support stronger certainty without explicit proof.', ['some ≠ all', 'may ≠ always']),
)

const examMethod = 'Read → Ask → Locate → Prove → Choose. Read for overall meaning, identify the question type, return to the relevant passage span, prove or reject every option from the text, then choose and verify the one fully supported answer.'

const lesson = (slug, title, minutes, intro, rule, passageOne, stepsOne, answerOne, passageTwo, stepsTwo, answerTwo, common, memorySpec, summaryItems, visualOne, visualTwo) => ({
  slug,
  title,
  lessonType: slug === 'reading-comprehension-topic-quiz' ? 'quiz' : 'practice',
  estimatedMinutes: minutes,
  blocks: [
    heading(title, 1),
    paragraph(intro),
    formula(rule, 'Use the relationship as an evidence test. Passage meaning and scope control the answer.'),
    example('Worked passage', passageOne, stepsOne, answerOne, visualOne),
    example('Why a tempting choice fails', passageTwo, stepsTwo, answerTwo, visualTwo),
    callout('CSE exam method', examMethod, 'important'),
    callout('Common mistake', common, 'warning'),
    callout(`Memory trick — ${memorySpec[0]}`, `${memorySpec[1]} because ${memorySpec[2]}`, 'important'),
    practiceCta(title),
    summary(summaryItems),
  ],
})

export const readingComprehensionLessonSpecs = [
  {
    slug: 'understanding-reading-comprehension',
    title: 'Understanding Reading Comprehension',
    lessonType: 'reading',
    estimatedMinutes: 18,
    blocks: [
      heading('Understanding Reading Comprehension', 1),
      paragraph('Reading Comprehension is not a memory contest. The passage is the authority: a correct answer must come from what the passage directly states, logically implies, emphasizes, organizes, or supports with evidence. A fact you know from elsewhere is irrelevant unless the question explicitly asks for outside knowledge.'),
      formula('answer = requested idea + passage evidence + matching scope', 'Core rule: answer from the passage, not from what you already know about the topic.'),
      example('Direct evidence', 'Several offices introduced flexible work schedules. Managers reported fewer late arrivals, while employees said they had more time to manage family responsibilities. What benefit is directly mentioned?', ['Read for the overall point: flexible schedules had reported benefits.', 'The question asks for a stated detail.', 'Locate “fewer late arrivals.”', 'Reject benefits not named in the passage.'], 'Fewer late arrivals.', evidenceProcessVisual),
      example('True but irrelevant', 'The passage says a roof reduced direct sunlight in a waiting area. A choice says public transport is important to the economy.', ['The statement may be true in real life.', 'The question concerns the roof’s stated effect.', 'No sentence links the economic claim to the answer.'], 'Reject the choice because passage evidence—not general truth—controls.', distractorVisual),
      heading('Read with a purpose', 2),
      paragraph('For short CSE passages, read the whole passage for meaning, read the question, identify whether it asks for main idea, detail, sequence, cause, vocabulary, inference, purpose, tone, fact, opinion, or conclusion, then return to the exact evidence. For a longer passage, a brief question scan can help, but track paragraph jobs rather than trying to memorize every line.'),
      callout('CSE exam method', examMethod, 'important'),
      callout('Common mistake', 'Answering from memory, choosing a true-but-irrelevant statement, selecting after one familiar phrase, or failing to return to the text. Point to the supporting sentence or idea before committing.', 'warning'),
      callout('Memory trick — no evidence, no answer', 'Require a passage sentence or a small supported inference because Reading Comprehension measures text-grounded reasoning, not outside knowledge.', 'important'),
      paragraph('Earlier Vocabulary, Context Clues, Pronouns and Modifiers, Sentence Structure, and Paragraph Organization lessons supply useful tools. Here the task is different: apply those tools to understand and prove answers from a passage.'),
      summary(['The passage is the authority.', 'Name the question type.', 'Locate exact or combined evidence.', 'Match the answer’s subject, relationship, time, and scope.', 'Reject unsupported additions.', 'Verify before choosing.']),
    ],
  },
  lesson('main-idea-topic', 'Main Idea and Topic', 18,
    'The topic names the subject; the main idea states the central point the whole passage communicates about that subject. A best title normally reflects that main idea rather than one minor detail.',
    'topic + all important support, with no added claim = main idea',
    'Public libraries now provide more than printed books. Many offer internet access, digital resources, skills workshops, and community programs. These services have expanded the role of libraries in modern communities.',
    ['Name the topic: modern public libraries.', 'Group the services as supporting details.', 'State what all details show about the library’s expanded role.'],
    'Modern libraries provide a wider range of community services than printed books alone.',
    'Candidates: A. Libraries offer internet access. B. Libraries provide varied modern community services. C. Libraries solve every community need.',
    ['A is accurate but covers one detail.', 'B covers the full service set without exaggeration.', 'C adds an absolute result the passage never discusses.'],
    'Choose B; A is too narrow and C is too broad.',
    'Do not choose the first, longest, or most interesting sentence automatically. Test whether the candidate covers the opening, middle, and ending.',
    ['Main idea = umbrella', 'Place every important detail under the candidate', 'a real main idea covers the passage without extending beyond it'],
    ['Distinguish topic from main idea.', 'Reject detail-only summaries.', 'Reject overbroad claims.', 'Choose a title only after finding the main idea.'],
    mainIdeaVisual, scopeTrapVisual),
  lesson('supporting-details', 'Supporting Details', 18,
    'A stated-detail answer can be traced to exact words or a faithful paraphrase. Compare subject, action, reason, quantity, time, and scope, and distinguish stated, contradicted, and not mentioned.',
    'detail answer = exact evidence OR faithful paraphrase; no extra claim',
    'The office reduced paper consumption by moving many forms online. Which answer restates the detail?',
    ['Locate the action: forms moved online.', 'Locate the effect: paper consumption decreased.', 'Accept different wording only when the relationship and scope remain.'],
    'The agency used digital processes to decrease its use of paper.',
    'The passage says, “The program began in 2025.” A choice says, “The program succeeded in every province.”',
    ['The date is stated.', 'Success in every province is neither stated nor denied.', 'Do not call a missing claim false unless opposing evidence appears.'],
    'The choice is not mentioned, not contradicted.',
    'Do not copy a nearby sentence without answering the question, and do not accept a partly true choice that changes a name, group, time, quantity, reason, or adds an unsupported clause.',
    ['Same idea, not same words', 'Match meaning and scope instead of demanding copied wording', 'correct details are often paraphrased while altered details preserve only familiar words'],
    ['Locate exact evidence.', 'Recognize faithful paraphrase.', 'Separate stated, contradicted, and not mentioned.', 'Reject altered and partly true choices.'],
    detailEvidenceVisual, statementStatusVisual),
  lesson('sequence-organization', 'Sequence and Organization', 19,
    'Sequence questions ask what happens before, after, or next. Organization questions ask how the passage develops through chronology, comparison, problem-solution, general-to-specific explanation, or claim and evidence.',
    'paragraph job + transition + dependency = passage structure',
    'A permit passage presents long queues, introduces online appointments, and reports shorter waits. How is it organized?',
    ['Label the opening as a problem.', 'Label online appointments as the response.', 'Label shorter waits as the result.'],
    'Problem → solution → result.',
    '“Processing delays increased during peak months. This prompted the agency to hire temporary staff.” What does “This” refer to?',
    ['A demonstrative points backward.', 'The entire prior idea is increased processing delays.', 'Temporary staff is the response, not the antecedent.'],
    '“This” refers to the increase in processing delays.',
    'Do not arrange events by what usually happens in real life, confuse repeated words with sequence, or let a reference word float without a clear earlier noun or idea.',
    ['Map jobs, not every word', 'Label each paragraph or sentence by what it contributes', 'a light structure map reveals order, shifts, references, and conclusions without detailed note-taking'],
    ['Track time and transition signals.', 'Identify paragraph jobs.', 'Resolve reference words backward.', 'Use Paragraph Organization skills to understand—not reorder—the passage.'],
    structureMapVisual, contextReferenceVisual),
  lesson('cause-effect', 'Cause and Effect', 18,
    'A cause explains why something happened; an effect is the result. Signal words help, but the stated relationship and its direction matter more than one keyword.',
    'cause → immediate effect → later consequence',
    'Heavy rainfall continued for several days. As a result, several roads became impassable, and public transport was delayed.',
    ['Rainfall is the stated cause.', 'Impassable roads are the immediate effect.', 'Transport delay is the later consequence.'],
    'Continued rain led to impassable roads, which delayed transport.',
    'A choice says, “Delayed transport caused the heavy rainfall.”',
    ['The same ideas appear in the passage.', 'Their direction has been reversed.', 'No evidence makes transport delay a cause of weather.'],
    'Reject the reversed relationship.',
    'Do not substitute a possible cause from outside knowledge or treat because, therefore, due to, and as a result as interchangeable decorations.',
    ['Because points back; therefore points forward', 'Trace the direction of the reason and result', 'signal words and the evidence chain prevent reversed-cause distractors'],
    ['Locate cause and effect.', 'Preserve direction.', 'Track intermediate consequences.', 'Reject outside explanations.'],
    causeEffectVisual, distractorVisual),
  lesson('vocabulary-in-context', 'Vocabulary in Context', 18,
    'Vocabulary-in-context asks what a word means as used in this passage. Nearby purpose, examples, contrast, cause, grammar, and reference links determine the intended sense.',
    'context evidence + part of speech + sentence fit = passage meaning',
    'One computer is reserved for government transactions. What does “reserved” mean?',
    ['The following purpose shows priority use.', 'Reserved functions as an adjective.', 'Substitute set aside and reread the sentence.'],
    'Reserved means set aside for a particular purpose.',
    'The agency launched a new portal. It allows applicants to check their status online. What does “It” refer to?',
    ['Look backward for a named noun.', 'The new portal can perform the stated action.', 'Agency is not the nearest sensible target of the singular pronoun in this construction.'],
    '“It” refers to the new portal.',
    'Do not choose the most familiar dictionary meaning or nearest noun mechanically. The choice must preserve passage meaning, grammar, and a sensible reference.',
    ['Nearby meaning; backward reference', 'Use surrounding evidence for meaning and earlier text for a reference target', 'words take their passage sense while pronouns and demonstratives point to established ideas'],
    ['Use the word as written in the passage.', 'Preserve part of speech.', 'Substitute and reread.', 'Resolve it, they, this, and these to a sensible earlier target.'],
    contextReferenceVisual, detailEvidenceVisual),
  lesson('inference-implied-meaning', 'Inference and Implied Meaning', 19,
    'An inference is a conclusion strongly supported by passage evidence even though the exact sentence is not written. A possible explanation is not enough; the logical step must stay small.',
    'inference = evidence A + evidence B + one small logical step',
    'Lena brought an umbrella and wore waterproof shoes before leaving home. Dark clouds covered the sky. What can be inferred?',
    ['Combine the preparation details.', 'Connect them with the dark clouds.', 'Stop at the nearest supported interpretation.'],
    'Lena expected rain.',
    'A choice says, “A severe storm certainly flooded Lena’s route.”',
    ['Severe, certainly, and flooded are stronger than the clues.', 'The passage gives no route condition or later event.', 'The answer requires several imagined steps.'],
    'Reject the overgeneralized prediction.',
    'Do not repeat a direct detail when the question asks for an inference, invent a motive, predict a future event, or accept extreme wording without equally strong evidence.',
    ['Inference = evidence + one small step', 'Move only as far as combined clues justify', 'anything larger becomes speculation rather than comprehension'],
    ['Combine multiple clues.', 'State the smallest supported meaning.', 'Reject unsupported motives and predictions.', 'Prove strong wording with strong evidence.'],
    inferenceVisual, distractorVisual),
  lesson('author-purpose-tone', 'Author’s Purpose and Tone', 19,
    'Topic is what the passage discusses. Purpose is why the author wrote it—such as inform, explain, describe, instruct, compare, or warn. Tone is the attitude shown by wording.',
    'topic = subject; purpose = author action; tone = wording-based attitude',
    'A passage lists the steps for registering for a government service and explains where each form is submitted. What is its purpose?',
    ['The topic is government-service registration.', 'The author presents steps and clarification.', 'No language asks readers to support an opinion.'],
    'To inform or explain how to register.',
    '“The initiative is a promising step toward faster public service.” What tone is supported?',
    ['Focus on the words “promising step.”', 'They express approval and hope.', 'Choose a moderate label matching that evidence.'],
    'Optimistic or approving.',
    'Do not substitute the topic for purpose, call every informative passage persuasive, or choose tone from your reaction to the issue instead of the author’s exact words.',
    ['Topic = what; purpose = why; tone = attitude', 'Answer each label with its own evidence', 'subject matter, author function, and word choice are different features of a passage'],
    ['Name the topic.', 'Ask what the author is doing.', 'Underline tone words.', 'Choose a moderate defensible label.'],
    purposeToneVisual, evidenceProcessVisual),
  lesson('fact-opinion-conclusion', 'Fact, Opinion, and Conclusion', 19,
    'A fact can be verified; an opinion expresses judgment, belief, preference, or evaluation. A conclusion combines passage evidence into a limited supported judgment.',
    'verifiable report = fact; evaluative judgment = opinion; combined evidence = conclusion',
    'Classify: “The office processed 500 applications in June.” and “The new system is the best improvement the agency has made.”',
    ['The count and date can be checked.', 'Best expresses evaluation.', 'Do not decide by whether you personally agree.'],
    'The first is fact; the second is opinion.',
    'A new procedure produced fewer encoding errors and shorter waiting times. Which conclusion is supported?',
    ['Combine both measured results.', 'Use a limited claim covering accuracy and speed.', 'Reject perfection, universal success, or unrelated benefits.'],
    'The procedure improved service accuracy and efficiency.',
    'Do not treat every printed sentence as fact, mistake attributed opinion for a verified result, or draw a conclusion stronger than the combined evidence.',
    ['Verify facts; prove conclusions', 'Ask what can be checked and what judgment the evidence supports', 'opinion markers and evidence scope distinguish reporting from evaluation'],
    ['Separate report from judgment.', 'Notice opinion markers.', 'Combine clues for conclusions.', 'Keep conclusions within evidence limits.'],
    factConclusionVisual, inferenceVisual),
  lesson('mixed-reading-comprehension-problems', 'Mixed Reading Comprehension Problems', 21,
    'Mixed CSE passages use the same text for different tasks. Identify the question type before searching: main idea needs whole-passage coverage, detail needs traceability, and inference, purpose, tone, vocabulary, structure, and conclusion each require their own evidence.',
    examMethod,
    'A mobile service desk visits distant neighborhoods, handles selected forms, and records common questions to improve future notices. What is the main idea?',
    ['Cover both closer access and improved notices.', 'Reject the detail that it visits twice monthly.', 'Reject the claim that every transaction is available.'],
    'The mobile desk brings selected services closer and uses questions to improve public guidance.',
    'A choice says, “All residents will always avoid the central office because the mobile desk processes selected forms.”',
    ['Selected forms is true.', 'All, always, and avoid the central office are unsupported.', 'The choice also changes a limited service into a complete replacement.'],
    'Reject the partly true, extreme choice.',
    'Do not answer a main-idea question with a detail, a detail question with an inference, or any question with the wrong person, group, time, causal direction, or an outside fact.',
    ['No evidence = no answer', 'Point to the exact sentence or controlled evidence chain before choosing', 'different question types change what counts as sufficient proof'],
    ['Identify the task.', 'Map the relevant passage span.', 'Test every clause of each option.', 'Eliminate extreme, irrelevant, altered, reversed, wrong-group, and wrong-time claims.', 'Verify the final choice.'],
    evidenceProcessVisual, distractorVisual),
  lesson('mixed-reading-comprehension-practice', 'Mixed Reading Comprehension Practice', 22,
    'This authoritative fixed practice combines main idea, direct details, sequence, cause, vocabulary in context, inference, purpose, and conclusion. Use the same evidence-first process even when passage subjects change.',
    examMethod,
    'A visitor log passage says staff can search a digital log during an emergency while a paper form remains available during power interruptions. What is the main idea?',
    ['Combine the current-information benefit with the retained backup.', 'Reject one-step details such as entering a destination.', 'Reject claims that all paper procedures disappeared.'],
    'The digital log improves access to current information while retaining a backup.',
    'A tempting answer says, “The tablet operates during every power interruption.”',
    ['The passage mentions power interruptions.', 'It says the paper form—not the tablet—is the backup.', 'The choice assigns the function to the wrong system.'],
    'Reject the wrong-person or wrong-system detail.',
    'Do not change strategy between questions or answer from the previous passage. Each item stores and displays its own complete passage, choices, evidence, and explanation.',
    ['Read → Ask → Locate → Prove → Choose', 'Repeat the same evidence sequence for every question', 'a stable method protects against changing passage topics and distractor wording'],
    ['Read the displayed passage.', 'Classify the question.', 'Locate exact evidence.', 'Eliminate unsupported options.', 'Verify one answer.'],
    statementStatusVisual, evidenceProcessVisual),
  lesson('reading-comprehension-topic-quiz', 'Reading Comprehension Topic Quiz', 28,
    'The topic quiz checks independent use of the complete evidence method across topic, main idea, best title, details, not-mentioned claims, sequence, structure, cause, context, inference, purpose, tone, fact, opinion, and conclusion.',
    'one passage + one question type + exact evidence = one best answer',
    'A peer-review passage describes a checklist, focused comments, and revision. What conclusion is supported?',
    ['Combine the review and revision details.', 'Keep the conclusion within the activity described.', 'Reject universal claims about all grading.'],
    'Peer review can develop careful reading as well as revision skills.',
    'A distractor says, “Peer reviewers provide every writer’s final grade.”',
    ['The passage states that the reviewer does not provide the final grade.', 'The choice reverses an explicit detail.', 'No inference can override direct contradiction.'],
    'Reject the contradicted detail.',
    'Do not stop after finding one familiar phrase. A quiz distractor may preserve part of the passage while altering scope, sequence, cause, reference, purpose, tone, or conclusion.',
    ['One choice, all clauses proved', 'Verify every part of the selected option', 'one unsupported addition makes the complete answer wrong'],
    ['Read for meaning.', 'Identify the question type.', 'Locate or combine evidence.', 'Eliminate every unsupported choice.', 'Reread the selected answer against the passage.'],
    factConclusionVisual, distractorVisual),
]

export const readingComprehensionLessonBySlug = new Map(readingComprehensionLessonSpecs.map((lessonSpec) => [lessonSpec.slug, lessonSpec]))
