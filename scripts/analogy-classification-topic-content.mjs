export const topicSlug = 'analogy-and-classification'
export const topicTitle = 'Analogy and Classification'
export const topicDescription = 'A structured course on identifying relationships between words, numbers, symbols, objects, and categories, including analogy completion and odd-one-out classification.'

export const generatedByLesson = {
  'synonym-and-antonym-relationships': 'synonym-antonym-analogy',
  'part-to-whole-relationships': 'part-whole-analogy',
  'function-and-purpose-relationships': 'function-purpose-analogy',
  'cause-and-effect-relationships': 'cause-effect-analogy',
  'degree-and-intensity-relationships': 'degree-intensity-analogy',
  'symbol-and-number-analogies': 'symbol-number-analogy',
  'finding-the-odd-one-out': 'odd-one-out',
  'category-and-classification-rules': 'category-classification',
  'mixed-analogy-and-classification-problems': 'mixed-analogy-classification',
}

export const lessonSpecs = [
  ['Understanding Analogies', 'understanding-analogies', 'reading', 13],
  ['Synonym and Antonym Relationships', 'synonym-and-antonym-relationships', 'practice', 13],
  ['Part-to-Whole Relationships', 'part-to-whole-relationships', 'practice', 13],
  ['Function and Purpose Relationships', 'function-and-purpose-relationships', 'practice', 14],
  ['Cause and Effect Relationships', 'cause-and-effect-relationships', 'practice', 14],
  ['Degree and Intensity Relationships', 'degree-and-intensity-relationships', 'practice', 14],
  ['Symbol and Number Analogies', 'symbol-and-number-analogies', 'practice', 15],
  ['Finding the Odd One Out', 'finding-the-odd-one-out', 'practice', 13],
  ['Category and Classification Rules', 'category-and-classification-rules', 'practice', 14],
  ['Mixed Analogy and Classification Problems', 'mixed-analogy-and-classification-problems', 'practice', 17],
  ['Mixed Analogy and Classification Practice', 'mixed-analogy-and-classification-practice', 'practice', 18],
  ['Analogy and Classification Topic Quiz', 'analogy-and-classification-topic-quiz', 'quiz', 22],
].map(([title, slug, lessonType, minutes], index) => ({ title, slug, lessonType, minutes, position: index + 1 }))

const heading = (text, level = 2) => ({ blockType: 'heading', content: { level, text } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const example = (title, problem, steps, answer) => ({ blockType: 'example', content: { title, problem, steps, answer } })
const summary = (items) => ({ blockType: 'summary', content: { items } })

const teaching = {
  'synonym-and-antonym-relationships': ['Synonyms share a meaning; antonyms express opposites. Analogy pairs must use the same relationship and grammatical role.', 'Name the first relationship, check the part of speech, then apply both to the second pair.', ['Synonym pair', 'Rapid : Fast :: Silent : ?', ['Rapid and fast are adjectives with similar meanings.', 'Silent needs an adjective with the same relationship.'], 'Quiet completes the analogy.'], ['Antonym pair', 'Ancient : Modern :: Scarce : ?', ['Ancient and modern are opposites.', 'Scarce needs its adjective opposite.'], 'Abundant completes the analogy.'], 'Avoid associated words, opposite relationship types, weaker meanings, and noun forms where an adjective or verb is required.'],
  'part-to-whole-relationships': ['Part-to-whole analogies connect a structural component with the object that contains it. Whole-to-part reverses that direction.', 'State the direction explicitly before evaluating choices.', ['Part to whole', 'Finger : Hand :: Toe : ?', ['A finger is a structural part of a hand.', 'A toe is a structural part of a foot.'], 'Foot completes the analogy.'], ['Whole to part', 'Book : Page :: Flower : ?', ['A book contains pages.', 'A flower contains petals.'], 'Petal completes the analogy.'], 'Do not choose a location, category label, related object, or reversed pair when a structural component is required.'],
  'function-and-purpose-relationships': ['Function analogies connect a tool, worker, object, or place with its primary action or purpose.', 'Keep object-to-action direction and grammatical form consistent.', ['Tool to function', 'Knife : Cut :: Pen : ?', ['A knife is primarily used to cut.', 'A pen is primarily used to write.'], 'Write completes the analogy.'], ['Worker to activity', 'Teacher : Teach :: Driver : ?', ['Teacher and driver are workers.', 'Teach and drive are their matching activities.'], 'Drive completes the analogy.'], 'Avoid an object location, material, secondary use, reversed actor-action pair, or merely associated word.'],
  'cause-and-effect-relationships': ['Cause-effect analogies connect an event or action to a characteristic direct result.', 'Confirm that the first item produces the second, then preserve that direction.', ['Natural cause', 'Rain : Wet Ground :: Fire : ?', ['Rain can directly produce wet ground.', 'Fire characteristically produces smoke.'], 'Smoke completes the analogy.'], ['Action and result', 'Study : Learning :: Practice : ?', ['Study supports learning.', 'Practice supports improvement.'], 'Improvement completes the analogy.'], 'Do not reverse cause and effect or choose a condition that is only associated or merely possible.'],
  'degree-and-intensity-relationships': ['Degree analogies compare the strength of related meanings, such as weaker-to-stronger or stronger-to-weaker.', 'Place both pairs on the same intensity scale and preserve direction.', ['Weaker to stronger', 'Warm : Hot :: Tired : ?', ['Hot is stronger than warm.', 'Exhausted is stronger than tired.'], 'Exhausted completes the analogy.'], ['Stronger to weaker', 'Downpour : Drizzle :: Hate : ?', ['Drizzle is weaker than downpour.', 'Dislike is weaker than hate.'], 'Dislike completes the analogy.'], 'Do not select an antonym, reverse intensity, use equal-strength wording, or switch to a different category.'],
  'symbol-and-number-analogies': ['Numeric and symbol analogies apply one visible transformation to both pairs.', 'Test one exact operation, keep values bounded, and reject rules that create competing answers.', ['Numeric rule', '5 : 15 :: 7 : ?', ['The first number is multiplied by 3.', 'Apply ×3 to 7.'], '21 completes the analogy.'], ['Symbol rule', '▲ : ▲▲ :: ■ : ?', ['The triangle is repeated twice.', 'Repeat the square twice.'], '■■ completes the analogy.'], 'Avoid inverse operations, wrong constants, reusing the first output, or confusing squaring with doubling.'],
  'finding-the-odd-one-out': ['Odd-one-out questions identify the single item outside the strongest objective category shared by three items.', 'Name the shared rule first and verify exactly one item violates it.', ['Object category', 'pen, pencil, marker, notebook', ['Pen, pencil, and marker are writing tools.', 'A notebook is written on rather than used to make marks.'], 'Notebook is the unique outlier.'], ['Number property', '2, 4, 6, 9', ['2, 4, and 6 are even.', '9 is odd.'], '9 is the unique outlier.'], 'Do not choose by appearance, familiarity, a secondary grouping, or a category that overlaps several choices.'],
  'category-and-classification-rules': ['Classification places items into objective categories based on membership, not loose association.', 'Use the narrow stated category and test each item directly against it.', ['Category member', 'Which is a unit of length: meter, liter, second, kilogram?', ['The requested category is measurement of length.', 'Meter measures length.'], 'Meter is the member.'], ['Same category', 'Which pair consists of office storage items?', ['A folder and cabinet both store documents or supplies.', 'Other pairings mix unrelated categories.'], 'Folder and cabinet belong together.'], 'Avoid adjacent categories, broad groupings, function-category confusion, and associated nonmembers.'],
  'mixed-analogy-and-classification-problems': ['Mixed problems require identifying whether the task tests relation, transformation, category membership, or an outlier.', 'Classify the question type before applying a specific rule.', ['Mixed verbal', 'Page : Book :: Petal : ?', ['Recognize a part-to-whole relationship.', 'A petal belongs to a flower.'], 'Flower completes the analogy.'], ['Mixed classification', 'bus, car, bicycle, spoon', ['The first three are road vehicles.', 'Spoon is not a vehicle.'], 'Spoon is the outlier.'], 'Do not combine two relationship rules, change direction, import trivia, or accept a merely related option.'],
}

export function blocksFor(slug) {
  if (slug === 'understanding-analogies') return [
    heading('Analogies compare relationships'), paragraph('An analogy asks whether two pairs share the same kind of connection. The goal is not merely to find related words, but to preserve one exact relationship.'),
    callout('General form', 'A is to B as C is to D. First describe how A relates to B; then require C to relate to D in the same direction.'),
    heading('What must stay consistent', 3), callout('Relationship table', 'Synonym: rapid→fast. Antonym: hot→cold. Part→whole: finger→hand. Tool→function: knife→cut. Cause→effect: rain→wet ground. Degree: warm→hot. Category: robin→bird. Number rule: 3→9 by squaring.'),
    example('Location relationship', 'Bird : Nest :: Bee : ?', ['A nest is the characteristic home of a bird.', 'A hive is the characteristic home of a bee.'], 'Hive completes the analogy.'),
    example('Function relationship', 'Knife : Cut :: Pen : ?', ['Knife and pen are tools.', 'Cut and write are their primary actions.'], 'Write completes the analogy.'),
    example('Part-to-whole relationship', 'Finger : Hand :: Toe : ?', ['A finger is part of a hand.', 'A toe is part of a foot.'], 'Foot completes the analogy.'),
    example('Antonym relationship', 'Hot : Cold :: Light : ?', ['Hot and cold are opposites.', 'Light needs its opposite adjective.'], 'Dark completes the analogy.'),
    heading('Direction, grammar, and specificity', 3), paragraph('A correct choice preserves direction, part of speech, relationship type, and level of specificity. A whole-to-part answer cannot replace part-to-whole, and a noun cannot replace a required verb merely because it is associated.'),
    callout('Common mistakes', 'Avoid words that are merely associated, reversed pairs, grammar changes, broader or narrower categories, and outside trivia not needed by the visible structure.', 'warning'),
    summary(['Name the A-to-B relationship first.', 'Preserve direction, grammar, and specificity.', 'Use one exact transformation or objective category.', 'Reject answers based only on association.']),
  ]
  const item = teaching[slug]
  if (item !== undefined) return [heading(item[0]), paragraph(item[0]), callout('Recognition strategy', item[1]), example(...item[2]), example(...item[3]), callout('Common mistakes', item[4], 'warning'), heading('Practice checklist', 3), paragraph('Name the relationship, confirm its direction and grammatical role, then eliminate each distractor by its specific mistake.'), summary([item[1], item[4], 'Choose the only answer that preserves the complete rule.'])]
  return [heading('Assessment review'), paragraph('Review relationship direction, grammatical role, category precision, outlier uniqueness, and exact numeric or symbol transformations.'), callout('No outside trivia', 'Each item uses familiar vocabulary or an explicitly visible rule. Select the structural answer, not an associated fact.'), example('Analogy review', 'Wheel : Car :: Page : ?', ['Wheel is part of a car.', 'Page is part of a book.'], 'Book completes the analogy.'), example('Classification review', 'triangle, square, rectangle, circle', ['The first three have straight sides only.', 'Circle has no straight side.'], 'Circle is the outlier.'), callout('Common mistakes', 'Do not reverse a pair, change grammar, broaden the category, or switch arithmetic operations.', 'warning'), heading('Ready check', 3), paragraph('For every answer, state the exact relationship or category rule in one sentence.'), summary(['Preserve relationship direction.', 'Require one objective answer.', 'Recompute numeric rules exactly.'])]
}

export const mixedQuestions = [
  ['Rapid : Fast :: Silent : ?', ['Quiet', 'Noisy', 'Silence', 'Sound'], 0, 'Rapid and fast are adjective synonyms; silent and quiet preserve that relationship and grammar.'],
  ['Ancient : Modern :: Scarce : ?', ['Abundant', 'Rare', 'Scarcity', 'Supply'], 0, 'Ancient and modern are opposites; scarce and abundant are opposites.'],
  ['Finger : Hand :: Toe : ?', ['Foot', 'Shoe', 'Leg', 'Walk'], 0, 'A finger is part of a hand; a toe is part of a foot.'],
  ['Knife : Cut :: Pen : ?', ['Write', 'Paper', 'Ink', 'Store'], 0, 'Knife and pen are tools matched with their primary actions.'],
  ['Warm : Hot :: Tired : ?', ['Exhausted', 'Rested', 'Sleep', 'Tiring'], 0, 'Both pairs move from a weaker condition to a stronger one.'],
  ['5 : 15 :: 7 : ?', ['21', '12', '35', '15'], 0, 'Both inputs are multiplied by 3.'],
  ['Which is the odd one out: pen, pencil, marker, notebook?', ['Notebook', 'Pen', 'Pencil', 'Marker'], 0, 'Pen, pencil, and marker are writing tools; notebook is the writing surface.'],
  ['Which item is a unit of length?', ['Meter', 'Liter', 'Second', 'Kilogram'], 0, 'Meter measures length; the others measure different quantities.'],
]

export const quizQuestions = [
  ['What is the main goal when solving an analogy?', ['Match the same relationship between both pairs', 'Choose any associated word', 'Choose the longest word', 'Use outside trivia'], 0, 'An analogy compares relationship structure, not loose association.'],
  ['Finger : Hand :: Toe : Foot preserves which feature?', ['Relationship direction', 'Word length', 'Alphabetical order', 'Spelling pattern'], 0, 'Both pairs move from a part to its whole.'],
  ['Begin : Start :: End : ?', ['Finish', 'Continue', 'Ending', 'Middle'], 0, 'Begin/start and end/finish are verb synonyms.'],
  ['Accept : Reject :: Include : ?', ['Exclude', 'Contain', 'Inclusion', 'Group'], 0, 'Both pairs are verb antonyms.'],
  ['Page : Book :: Petal : ?', ['Flower', 'Garden', 'Leaf', 'Color'], 0, 'A page is part of a book; a petal is part of a flower.'],
  ['Book : Page :: House : ?', ['Room', 'Street', 'Building', 'Live'], 0, 'Both pairs move from the whole to a structural part.'],
  ['Broom : Sweep :: Key : ?', ['Unlock', 'Door', 'Metal', 'Pocket'], 0, 'Each tool is paired with its primary function.'],
  ['Teacher : Teach :: Driver : ?', ['Drive', 'Vehicle', 'Road', 'Passenger'], 0, 'Each worker is paired with the matching activity.'],
  ['Rain : Wet Ground :: Fire : ?', ['Smoke', 'Water', 'Heat Source', 'Alarm'], 0, 'Both pairs express a direct characteristic cause and effect.'],
  ['Warm : Hot :: Tired : ?', ['Exhausted', 'Rested', 'Tiring', 'Sleep'], 0, 'Both pairs increase in intensity.'],
  ['3 : 9 :: 4 : ?', ['16', '12', '8', '9'], 0, 'Each input is squared.'],
  ['▲ : ▲▲ :: ■ : ?', ['■■', '■', '■■■', '▲▲'], 0, 'The visible symbol is repeated twice.'],
  ['Which is the odd one out: bus, car, bicycle, spoon?', ['Spoon', 'Bus', 'Car', 'Bicycle'], 0, 'Bus, car, and bicycle are road vehicles; spoon is not.'],
  ['Which grouping rule correctly describes meter, centimeter, and kilometer?', ['Units of length', 'Units of volume', 'Office tools', 'Time measurements'], 0, 'All three are units used to express length.'],
  ['Wheel : Car :: Page : ?; then identify the category of the answer.', ['Book, a bound reading item', 'Road, a travel place', 'Ink, a writing material', 'Shelf, a storage location'], 0, 'Wheel-to-car and page-to-book are part-to-whole pairs; book is the matching whole.'],
]

export function fixedQuestion(item, position, quiz = false) { return { ...(quiz ? { questionType: 'multiple_choice' } : {}), prompt: item[0], explanation: item[3], points: 1, position, status: 'active', choices: item[1].map((text, index) => ({ text, isCorrect: index === item[2], position: index + 1 })) } }
export function validateQuestions(label, questions, expected) { const failures = []; if (questions.length !== expected) failures.push(`${label} must have ${expected} questions.`); for (const question of questions) { if (question.choices.length !== 4) failures.push(`${label} question ${question.position} needs four choices.`); if (question.choices.filter((choice) => choice.isCorrect).length !== 1) failures.push(`${label} question ${question.position} needs exactly one answer.`); if (new Set(question.choices.map((choice) => choice.text.trim().toLowerCase())).size !== 4) failures.push(`${label} question ${question.position} has duplicate visible choices.`); if ((question.explanation ?? '').trim().length < 15) failures.push(`${label} question ${question.position} lacks a verified explanation.`) } return failures }
