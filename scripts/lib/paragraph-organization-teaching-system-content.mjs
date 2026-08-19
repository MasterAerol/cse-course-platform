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
const practiceCta = (title) => paragraph(`Practice CTA: Continue to the linked ${title} activity. Its existing route, generator or fixed questions, scoring, explanations, and curriculum lock remain unchanged.`)

export const paragraphMapVisual = visual(
  'Mapping a coherent public-service paragraph from its main idea through linked support to a supported conclusion',
  [['Opening', 'Main idea'], ['Support', 'explanation + evidence', 'highlight'], ['Link', 'therefore / this / next'], ['Closing', 'supported result', 'final']],
  [
    transition('Set direction', 'The opening states what the paragraph will develop.', 'Readers need a controlling idea before details.', 'main idea.'),
    transition('Build support', 'Explanations and examples stay beside the claim they develop.', 'Relevant support gives the paragraph unity.', 'supporting details.'),
    transition('Close', 'The final sentence follows from the completed support.', 'A conclusion should not introduce a new major idea.', 'supported result.'),
  ],
  memory('One road, clear signs', 'Keep one main idea and follow every sentence link.', 'A coherent paragraph behaves like one route: each sentence moves the reader toward the same destination.', ['topic → support → conclusion']),
)

export const topicSentenceVisual = visual(
  'Choosing a topic sentence broad enough to cover all service-access details but specific enough to control them',
  [['Details', 'renew online / search catalog / reserve'], ['Shared idea', 'digital library services', 'highlight'], ['Topic', 'The library improved access digitally'], ['Check', 'every detail fits', 'final']],
  [
    transition('Group details', 'Three actions were recognized as digital services.', 'The shared category reveals the central idea.', 'renew, search, reserve.'),
    transition('State topic', 'The category became a complete controlling sentence.', 'A topic sentence should cover the whole detail set.', 'digital access.'),
    transition('Verify', 'Each detail explains the selected topic.', 'A detail that does not fit signals an overbroad or wrong topic.', 'all details fit.'),
  ],
  memory('Umbrella test', 'The topic sentence must cover every supporting detail.', 'An umbrella works only when all details fit under it without making the wording empty or vague.', ['digital services covers renew, search, reserve']),
)

export const supportVisual = visual(
  'Separating relevant supporting details from repetition and unrelated information in a preparedness paragraph',
  [['Topic', 'Preparedness improves'], ['Explain', 'staff receive training', 'highlight'], ['Evidence', 'teams conduct drills'], ['Result', 'responses become faster', 'final']],
  [
    transition('Explain', 'Training tells how preparedness improves.', 'Support must develop the topic rather than restate it.', 'training.'),
    transition('Add evidence', 'Drills provide a concrete instance.', 'Evidence makes the explanation specific and credible.', 'drills.'),
    transition('Show result', 'Faster response follows the preparation.', 'The result completes the support chain.', 'faster response.'),
  ],
  memory('Ask “How or why?”', 'Keep a detail when it answers how, why, or with what evidence.', 'Relevant support adds information that develops the main idea instead of merely sharing a word.', ['training explains how', 'drills give evidence']),
)

export const chronologyVisual = visual(
  'Arranging an application process by prerequisites and time markers from preparation to completion',
  [['First', 'complete form'], ['Next', 'clerk verifies documents', 'highlight'], ['Then', 'pay fee'], ['Finally', 'receive claim stub', 'final']],
  [
    transition('Prerequisite', 'The completed form exists before verification.', 'A later action cannot use something not yet completed.', 'form before verification.'),
    transition('Approval step', 'Payment follows document verification.', 'The process confirms requirements before collecting the fee.', 'verify before pay.'),
    transition('Completion', 'The claim stub follows payment.', 'Finally marks the last supported action.', 'pay before stub.'),
  ],
  memory('Before beats “sounds smooth”', 'Place every prerequisite before the action that depends on it.', 'Dependency proves chronology even when answer choices use equally fluent wording.', ['complete → verify → pay → receive']),
)

export const causeEffectVisual = visual(
  'Tracing a cause-and-effect chain from heavy rain to a delayed public-service briefing',
  [['Cause', 'heavy rain'], ['Immediate effect', 'road flooded', 'highlight'], ['Next effect', 'buses slowed'], ['Result', 'briefing began late', 'final']],
  [
    transition('Physical result', 'Flooding follows the rain.', 'The road condition is a direct effect of heavy rain.', 'rain → flood.'),
    transition('Travel result', 'Slow buses follow the flooded road.', 'The condition explains the transport delay.', 'flood → slow travel.'),
    transition('Final consequence', 'The briefing delay follows late travel.', 'The final result needs the complete causal chain.', 'slow travel → late briefing.'),
  ],
  memory('Because before therefore', 'Find what answers because, then follow what therefore introduces.', 'The two questions expose the direction from reason to supported result.', ['because rain; therefore flooding']),
)

export const comparisonVisual = visual(
  'Keeping a point-by-point comparison of appointment and walk-in services in matched pairs',
  [['Introduce', 'appointments and walk-ins'], ['Access', 'scheduled / immediate', 'highlight'], ['Waiting', 'shorter / variable'], ['Conclusion', 'choose by need', 'final']],
  [
    transition('Name both', 'Both service methods appear before comparison.', 'Readers need the comparison subjects first.', 'A and B.'),
    transition('Pair one point', 'Access method is compared with access method.', 'Point-by-point organization keeps like features together.', 'access/access.'),
    transition('Conclude', 'The choice follows both paired differences.', 'The conclusion is supported by the completed comparison.', 'choose by need.'),
  ],
  memory('Same point, then switch', 'Compare both subjects on one point before moving to the next.', 'Matched pairs prevent the paragraph from jumping between unrelated features.', ['A access / B access; A waiting / B waiting']),
)

export const hierarchyVisual = visual(
  'Distinguishing general-to-specific explanation from specific-to-general conclusion in an identification paragraph',
  [['General claim', 'Valid ID is required'], ['Example', 'government card', 'highlight'], ['Detail', 'name and photo'], ['Purpose', 'identity is verified', 'final']],
  [
    transition('Narrow', 'A category becomes one example.', 'For example signals movement from general to specific.', 'requirement → card.'),
    transition('Specify', 'The example receives a concrete detail.', 'Details explain why the example qualifies.', 'card → name and photo.'),
    transition('Connect purpose', 'Verification follows the identifying features.', 'The result explains the requirement.', 'features → verification.'),
  ],
  memory('Claim before example; evidence before conclusion', 'Identify whether details explain an opening claim or build toward a final claim.', 'The direction of support determines whether the paragraph narrows or generalizes.', ['claim → example', 'observations → conclusion']),
)

export const linkVisual = visual(
  'Resolving a demonstrative reference and contrast transition between sentences about appointment services',
  [['Name', 'office introduced appointment system'], ['Reference', 'This system schedules visits', 'highlight'], ['Contrast', 'However, walk-in help remains'], ['Result', 'two access options', 'final']],
  [
    transition('Resolve reference', 'This system follows the named appointment system.', 'A demonstrative needs a clear earlier antecedent.', 'system before this system.'),
    transition('Attach contrast', 'However follows the scheduling idea it qualifies.', 'A transition must connect the exact relationship it signals.', 'scheduled versus walk-in.'),
    transition('Unify', 'The conclusion covers both access methods.', 'The final idea needs both preceding options.', 'two options.'),
  ],
  memory('Name before reference', 'Place the named noun before this, these, it, they, or such.', 'Reference words point backward, so the reader must already know their target.', ['documents → these documents', 'system → this system']),
)

export const openingClosingVisual = visual(
  'Testing an opening for independence and a closing for backward support in a commute-planning paragraph',
  [['Opening', 'Planning a commute saves time'], ['Support', 'check route and schedule', 'highlight'], ['Evidence', 'prepare alternate route'], ['Closing', 'Preparation makes travel predictable', 'final']],
  [
    transition('Open independently', 'The first sentence names the topic without an unexplained reference.', 'An opening should orient the reader.', 'commute planning.'),
    transition('Develop', 'Route and schedule details explain the plan.', 'Support must stay relevant to the opening.', 'planning details.'),
    transition('Close backward', 'Predictable travel summarizes the supported benefit.', 'The closing should grow from earlier details.', 'supported benefit.'),
  ],
  memory('Open forward; close backward', 'An opening points ahead to the paragraph, while a closing points back to what was established.', 'Direction exposes unexplained openings and unsupported endings.', ['introduce → develop → conclude']),
)

export const methodVisual = visual(
  'Applying the CSE paragraph-organization method Topic Links Chain Test Eliminate Reread',
  [['Topic', 'name the central idea'], ['Links', 'mark time, cause, reference, contrast', 'highlight'], ['Chain', 'build forced pairs and order'], ['Verify', 'eliminate and reread', 'final']],
  [
    transition('Find topic', 'The paragraph purpose is stated before ordering.', 'The main idea constrains possible openings and support.', 'central idea.'),
    transition('Mark links', 'Explicit dependencies become visible.', 'Strong links are more reliable than repeated words.', 'time, reference, logic.'),
    transition('Verify whole', 'The complete chain is reread after elimination.', 'Every sentence must fit both its neighbor and the paragraph purpose.', 'one coherent paragraph.'),
  ],
  memory('Topic → Links → Chain → Test → Eliminate → Reread', 'Use evidence to build the order before comparing all choices.', 'A dependency chain rejects fluent distractors that break one required relationship.', ['find topic', 'join forced pairs', 'reread whole']),
)

const examMethod = 'Topic → Links → Chain → Test → Eliminate → Reread. Name the central idea, mark explicit dependencies, join forced sentence pairs, test the opening and closing, eliminate any broken chain, then reread the whole paragraph.'

const lesson = (slug, title, minutes, intro, rule, exampleOne, stepsOne, answerOne, exampleTwo, stepsTwo, answerTwo, common, memorySpec, summaryItems, visualOne, visualTwo) => ({
  slug,
  title,
  lessonType: slug === 'paragraph-organization-topic-quiz' ? 'quiz' : 'practice',
  estimatedMinutes: minutes,
  blocks: [
    heading(title, 1),
    paragraph(intro),
    formula(rule, 'Use the pattern as evidence. Do not choose an order only because it sounds smooth.'),
    example('Worked example', exampleOne, stepsOne, answerOne, visualOne),
    example('Why a tempting order fails', exampleTwo, stepsTwo, answerTwo, visualTwo),
    callout('CSE exam method', examMethod, 'important'),
    callout('Common mistake', common, 'warning'),
    callout(`Memory trick — ${memorySpec[0]}`, `${memorySpec[1]} because ${memorySpec[2]}`, 'important'),
    practiceCta(title),
    summary(summaryItems),
  ],
})

export const paragraphOrganizationLessonSpecs = [
  {
    slug: 'understanding-paragraph-organization',
    title: 'Understanding Paragraph Organization',
    lessonType: 'reading',
    estimatedMinutes: 17,
    blocks: [
      heading('Understanding Paragraph Organization', 1),
      paragraph('Paragraph organization means arranging sentences so one main idea develops in a clear, provable order. A coherent paragraph normally introduces its focus, develops it with linked support, and ends with a result or conclusion supported by what came before. CSE items test these relationships, not personal writing preference.'),
      formula('main idea + relevant support + explicit links + supported closing = coherent paragraph', 'Plain English first: every sentence must belong, connect, and move the same idea forward.'),
      example('See the paragraph map', 'The city opened an online permit portal. Applicants can now submit forms from home. This option reduces unnecessary travel. Therefore, the service is more accessible.', ['The first sentence introduces the portal.', 'The second explains what applicants can do.', 'This option refers to online submission.', 'Therefore introduces the supported benefit.'], 'Portal → use → effect → conclusion.', paragraphMapVisual),
      example('Find the controlling idea', 'Residents can renew books online. They can search the catalog from home. They can also reserve materials. Which sentence should introduce these details?', ['Group the details: renew, search, and reserve are digital library services.', 'State a sentence broad enough to cover all three.', 'Reject a detail that covers only one service.'], 'The city library improved access through several digital services.', topicSentenceVisual),
      heading('Strong links beat repeated words', 2),
      paragraph('Useful evidence includes topic-to-detail support, prerequisite actions, cause and result, comparison pairs, general-example hierarchy, pronoun antecedents, transition targets, and conclusions. Repeated vocabulary can help, but it never overrides a broken timeline, reference, or logical relationship.'),
      callout('CSE exam method', examMethod, 'important'),
      callout('Common mistake', 'Learners often choose the smoothest-sounding option after checking only its first two sentences. That fails when a later pronoun has no antecedent, an effect precedes its cause, or the closing adds a new topic. Test every link.', 'warning'),
      callout('Memory trick — one road, clear signs', 'Keep one main idea and follow every sentence link because a coherent paragraph behaves like one route whose signs lead to one destination.', 'important'),
      paragraph('Sentence Structure and Error Identification already teaches sentence correctness. This topic assumes each sentence can be grammatical and asks a different question: in what order do the sentences form one coherent paragraph?'),
      summary(['Identify the central idea.', 'Find an independent opening.', 'Mark explicit sentence dependencies.', 'Keep related support together.', 'Choose a supported closing.', 'Reread the complete order.']),
    ],
  },
  lesson('identifying-topic-sentence', 'Identifying the Topic Sentence', 17,
    'A topic sentence states the central idea that the remaining sentences explain, illustrate, or prove. It is broader than one detail but more specific than a vague subject label.',
    'best topic sentence = covers every detail + states one clear focus',
    'Details: residents renew books online, search the catalog, and reserve materials. Which topic sentence fits?',
    ['Group the actions under digital library services.', 'Check that every detail fits the same focus.', 'Choose the complete sentence that introduces that focus.'],
    'The city library improved access through several digital services.',
    '“Residents can renew books online” may sound important.',
    ['It covers only one of three details.', 'Search and reservation do not develop renewal alone.', 'A topic sentence must control the full paragraph.'],
    'It is a supporting detail, not the topic sentence.',
    'Do not choose the first sentence automatically or select a sentence merely because it repeats the most words. Test coverage of all details.',
    ['Umbrella test', 'Place every detail under the candidate topic', 'a true topic sentence covers the complete detail set without becoming vague'],
    ['Find the shared idea.', 'Reject one-detail candidates.', 'Choose a clear controlling sentence.', 'Verify every detail fits.'],
    topicSentenceVisual, paragraphMapVisual),
  lesson('supporting-details', 'Supporting Details', 17,
    'A supporting detail develops the topic by explaining how or why, giving evidence or an example, or showing a relevant result. A related word is not enough; the relationship must add meaning.',
    'topic → explanation → evidence or example → supported result',
    'Topic: The barangay disaster plan improves preparedness. Arrange: staff train; teams conduct drills; responses become faster.',
    ['Training explains how preparation begins.', 'Drills provide concrete practice.', 'Faster response is the supported result.'],
    'Topic → training → drills → faster response.',
    '“The barangay hall was painted last month” mentions the same location.',
    ['It does not explain preparedness.', 'It supplies no evidence for the disaster plan.', 'Shared setting does not create support.'],
    'The sentence is irrelevant support.',
    'Do not keep a sentence just because it repeats the topic noun, and do not place a specific example before the category it illustrates.',
    ['Ask how, why, or what proves it', 'Require every detail to answer one of those questions', 'relevant support develops the central claim instead of echoing it'],
    ['Keep relevant details.', 'Group explanation with evidence.', 'Place examples after their category.', 'Remove repetition and unrelated facts.'],
    supportVisual, paragraphMapVisual),
  lesson('chronological-order', 'Chronological Order', 18,
    'Chronological order follows time or process. Words such as first, before, next, after, once, then, later, and finally help, but real prerequisites decide the sequence when markers are missing.',
    'prerequisite action → dependent action → next step → completion',
    'Arrange an application process: complete the form; clerk verifies documents; pay the fee; receive a claim stub.',
    ['A form must exist before verification.', 'Verification comes before payment in the stated process.', 'The claim stub follows payment.'],
    'Complete → verify → pay → receive.',
    'An option begins “Finally, receive the claim stub” and then gives the earlier steps.',
    ['Finally explicitly marks completion.', 'Later sentences describe prerequisites.', 'The marker and dependency are both broken.'],
    'Reject the order even if each sentence is grammatical.',
    'Do not arrange by what usually happens in your own experience when the item supplies a different process. Use only stated markers and dependencies.',
    ['Before beats smooth', 'Place each prerequisite before what uses it', 'dependency proves order more reliably than fluency'],
    ['Underline time markers.', 'Identify prerequisites.', 'Build the process chain.', 'Check that no step depends on a later step.'],
    chronologyVisual, methodVisual),
  lesson('cause-effect-order', 'Cause-and-Effect Order', 18,
    'Cause-and-effect organization connects reasons, actions, conditions, and consequences. Because and since often introduce causes; therefore, consequently, thus, and as a result usually introduce effects.',
    'cause → immediate effect → later consequence → supported conclusion',
    'Arrange: heavy rain; road flooded; buses slowed; briefing began late.',
    ['Rain explains the flood.', 'Flooding explains slow buses.', 'Slow travel explains the delayed briefing.'],
    'Rain → flood → slow buses → late briefing.',
    'A distractor begins with the late briefing, then mentions rain without framing the result first.',
    ['No opening announces that the paragraph will explain a result.', 'The cause appears after its consequences.', 'The chain has no logical direction.'],
    'Reject the reversed causal chain.',
    'Do not treat therefore and because as interchangeable decorations. Each word points in a different logical direction.',
    ['Because before therefore', 'Ask what happened because of what, then what follows therefore', 'those questions reveal cause and effect direction'],
    ['Mark causes and effects.', 'Follow the stated direction.', 'Keep intermediate effects in sequence.', 'Verify the conclusion is supported.'],
    causeEffectVisual, methodVisual),
  lesson('comparison-contrast-order', 'Comparison-and-Contrast Order', 18,
    'Comparison paragraphs may be subject-by-subject or point-by-point. Whichever pattern begins should remain consistent. Point-by-point organization compares the same feature for both subjects before moving to another feature.',
    'introduce A and B → compare one matched point → compare next matched point → conclude',
    'Compare appointment and walk-in service by access method and waiting time.',
    ['Introduce both service methods.', 'Pair scheduled access with immediate access.', 'Pair shorter waiting with variable waiting.', 'Conclude which need each method serves.'],
    'Introduction → access pair → waiting pair → supported choice.',
    'A distractor discusses appointment access, appointment waiting, walk-in access, then returns to appointments.',
    ['The paragraph begins point-by-point but switches patterns.', 'Matched features are separated.', 'The reader must reconstruct the comparison.'],
    'Reject the pattern switch.',
    'Do not place however first or treat it as a general attention word. It must follow the exact idea being contrasted.',
    ['Same point, then switch', 'Compare A and B on one feature before changing features', 'matched points make the relationship visible'],
    ['Introduce both subjects.', 'Choose one comparison pattern.', 'Keep matched points together.', 'Attach contrast transitions correctly.'],
    comparisonVisual, linkVisual),
  lesson('general-specific-order', 'General-to-Specific and Specific-to-General Order', 19,
    'General-to-specific paragraphs begin with a claim or category and narrow to explanations, examples, and details. Specific-to-general paragraphs present observations or evidence and end with a justified generalization.',
    'general → example → detail OR observations → supported generalization',
    'Arrange: Valid identification is required; a government card is one example; it shows a name and photo; these features help verify identity.',
    ['The requirement is the general claim.', 'For example narrows to one card.', 'Name and photo describe the example.', 'Verification explains the purpose.'],
    'Claim → example → detail → purpose.',
    'A distractor places “These stages build confidence” before the training stages are described.',
    ['These stages has no earlier referent.', 'The generalization appears before its evidence.', 'The intended direction is specific to general.'],
    'Place the observations before the conclusion.',
    'Do not assume the broadest sentence is always first. A justified conclusion can be broad, but it must follow the evidence that supports it.',
    ['Claim before example; evidence before conclusion', 'Identify which sentence supplies support and which receives it', 'support direction reveals whether the paragraph narrows or generalizes'],
    ['Find the broad claim.', 'Mark examples and evidence.', 'Choose the direction of support.', 'Keep examples beside their explanation.'],
    hierarchyVisual, linkVisual),
  lesson('transition-words-sentence-links', 'Transition Words and Sentence Links', 18,
    'Sentence links include pronouns, demonstratives, repeated key ideas, logical transitions, and paired terms. This, these, it, they, such, and another need clear earlier references; transitions must connect the relationship they name.',
    'named idea → reference; target idea → transition → related idea',
    'Order: The office introduced an appointment system. This system schedules visits. However, walk-in help remains available.',
    ['Appointment system supplies the antecedent.', 'This system must follow it.', 'However contrasts scheduling with walk-in access.'],
    'Name → reference → contrast.',
    'A distractor begins “These documents were checked carefully” before identifying any documents.',
    ['These documents points backward.', 'No earlier sentence names the documents.', 'The opening is not independent.'],
    'Place the sentence naming the documents first.',
    'Do not connect sentences only because they repeat a noun. Check whether the reference, transition, and meaning all point to the same relationship.',
    ['Name before reference', 'Put the full noun before this, these, it, they, or such', 'reference words cannot identify a target the reader has not met'],
    ['Circle reference words.', 'Find each antecedent.', 'Label transition meaning.', 'Join forced pairs before arranging the rest.'],
    linkVisual, methodVisual),
  lesson('best-opening-closing-sentence', 'Identifying the Best Opening and Closing Sentence', 18,
    'A strong opening introduces the subject independently and points forward. A strong closing follows from the paragraph, summarizes or states a supported result, and does not add a major new idea.',
    'opening = independent context; closing = backward-supported result or synthesis',
    'Arrange a commute paragraph: planning saves time; check route and schedule; prepare an alternate route; preparation makes travel predictable.',
    ['The first sentence introduces commute planning.', 'The middle details explain the plan.', 'The final sentence states the supported benefit.'],
    'Independent opening → support → supported closing.',
    '“This plan also reduces uncertainty” is offered as the opening.',
    ['This plan needs an earlier named plan.', 'Also implies previous support.', 'The sentence cannot orient the reader independently.'],
    'Use it only after the plan is introduced.',
    'Do not choose a dramatic sentence as the conclusion if it introduces a new program, person, cause, or recommendation not developed earlier.',
    ['Open forward; close backward', 'Make the opening prepare what follows and the closing depend on what came before', 'direction exposes unexplained beginnings and unsupported endings'],
    ['Test opening independence.', 'Reject unexplained references.', 'Test closing support.', 'Reread the complete paragraph.'],
    openingClosingVisual, paragraphMapVisual),
  lesson('mixed-paragraph-organization-problems', 'Mixed Paragraph Organization Problems', 20,
    'Mixed CSE items combine topic control, support, chronology, causality, comparison, hierarchy, references, transitions, openings, and conclusions. One primary pattern usually controls the paragraph while smaller links determine exact placement.',
    examMethod,
    'Order: introduce a recycling program; students separate materials; reusable waste decreases; the school expands the program.',
    ['The program must be introduced before students use it.', 'Student action causes the reduction.', 'Expansion is supported by the result.'],
    'Introduction → action → result → supported expansion.',
    'A distractor keeps “program” sentences together but places expansion before the measured result.',
    ['Repeated vocabulary creates a tempting pair.', 'The expansion lacks its reason.', 'The cause-result dependency is broken.'],
    'Reject word matching when logic fails.',
    'Do not solve mixed items by hunting only for the first sentence. Build forced pairs and verify the complete chain.',
    ['Links before letters', 'Build the sentence chain before comparing A, B, C, and D orders', 'evidence remains stable while option labels are designed to distract'],
    ['Name the main pattern.', 'Mark every forced link.', 'Build the chain.', 'Eliminate one broken dependency at a time.', 'Reread for unity.'],
    methodVisual, paragraphMapVisual),
  lesson('mixed-paragraph-organization-practice', 'Mixed Paragraph Organization Practice', 20,
    'This authoritative fixed practice combines every Paragraph Organization skill. Use one repeatable method even when the surface topic changes from public service to school, transport, workplace, or community situations.',
    examMethod,
    'Which sentence must precede “The clerk checks these documents”?',
    ['These documents needs a named plural antecedent.', 'Applicants submit identification and proof of address names two documents.', 'Other choices do not supply the reference.'],
    'Applicants submit identification and proof of address.',
    'A tempting choice says “These documents are useful.”',
    ['It repeats the same demonstrative.', 'It still does not name the documents.', 'Two unresolved references cannot support each other.'],
    'Reject it because the antecedent remains missing.',
    'Do not change methods between questions or accept a merely possible order. Prove the unique best answer by testing every dependency.',
    ['Prove every arrow', 'State what each sentence depends on before choosing', 'a unique correct order must preserve every required arrow'],
    ['Identify the primary pattern.', 'Resolve references.', 'Trace sequence and logic.', 'Check opening and closing.', 'Choose only the fully supported order.'],
    linkVisual, methodVisual),
  lesson('paragraph-organization-topic-quiz', 'Paragraph Organization Topic Quiz', 25,
    'The topic quiz checks independent control of the full method: central idea, topic and support, time, cause, comparison, hierarchy, sentence links, openings, conclusions, and one uniquely coherent full order.',
    'one item → one primary pattern → all dependencies → one best order',
    'Which order is best? Introduce online appointments; explain this system; contrast walk-in help; conclude that both options improve access.',
    ['The system is named before this system.', 'The contrast follows the scheduled option.', 'The conclusion covers both access methods.'],
    'Introduction → reference → contrast → conclusion.',
    'An option opens with “However, walk-in help remains available.”',
    ['However has no earlier target.', 'Remains assumes prior context.', 'The opening does not introduce the central idea.'],
    'Reject the unexplained contrast opening.',
    'Do not choose an answer after verifying only one strong pair. A distractor can preserve one pair while breaking the timeline, reference, support, or conclusion elsewhere.',
    ['One chain, all links', 'Verify every arrow before accepting the answer', 'the CSE asks for the single fully coherent order, not a partly correct sequence'],
    ['Read all sentences.', 'Name the primary pattern.', 'Join forced pairs.', 'Eliminate broken orders.', 'Reread the final paragraph.'],
    methodVisual, openingClosingVisual),
]

export const paragraphOrganizationLessonBySlug = new Map(paragraphOrganizationLessonSpecs.map((lessonSpec) => [lessonSpec.slug, lessonSpec]))
