import { generateValidatedQuestion, getGenerator } from '../generators/generator.registry'
import { createSeededRandom } from '../generators/generator-random'
import type { GeneratedQuestion, GeneratorDifficulty, GeneratorSlug } from '../generators/generator.types'

export const numericalAbilityAssessmentSlug = 'numerical-ability-subject-assessment'
export const numericalAbilitySubjectSlug = 'numerical-ability'
export const analyticalAbilityAssessmentSlug = 'analytical-ability-subject-assessment'
export const analyticalAbilitySubjectSlug = 'analytical-ability'
export const verbalAbilityAssessmentSlug = 'verbal-ability-subject-assessment'
export const verbalAbilitySubjectSlug = 'verbal-ability'
export const generalInformationAssessmentSlug = 'general-information-subject-assessment'
export const generalInformationSubjectSlug = 'general-information'
export type SubjectAssessmentSubjectSlug = typeof numericalAbilitySubjectSlug | typeof analyticalAbilitySubjectSlug | typeof verbalAbilitySubjectSlug | typeof generalInformationSubjectSlug

export type SubjectAssessmentTopicSlug = string
export type NumericalAbilityTopicSlug = SubjectAssessmentTopicSlug

export interface SubjectAssessmentGeneratorConfig { slug: GeneratorSlug; version: number; rotationPosition: number; selectionWeight: number }
export interface SubjectAssessmentTopicConfig { topicSlug: SubjectAssessmentTopicSlug; topicTitle: string; position: number; count: number; difficulty: Record<GeneratorDifficulty, number>; generators: SubjectAssessmentGeneratorConfig[] }
export interface SubjectAssessmentBlueprint { subjectSlug: SubjectAssessmentSubjectSlug; version: number; totalQuestions: number; passingScorePercent: number; topics: SubjectAssessmentTopicConfig[] }

const numericalOwnership = {
  percentages: ['finding-percentage','finding-base','finding-rate'],
  fractions: ['equivalent-fractions','simplifying-fractions','comparing-fractions','adding-fractions','subtracting-fractions','multiplying-fractions','dividing-fractions'],
  decimals: ['comparing-decimals','rounding-decimals','adding-decimals','subtracting-decimals','multiplying-decimals','dividing-decimals','decimal-conversions'],
  'ratio-and-proportion': ['simplifying-ratios','equivalent-ratios','comparing-ratios','solving-proportions','direct-proportion','inverse-proportion','ratio-sharing','ratio-word-problems'],
  average: ['finding-average','missing-value-average','combined-average','weighted-average','average-after-adding','average-after-removing','average-age','average-score-salary'],
  'number-problems': ['consecutive-integers','consecutive-odd-even-integers','sum-difference-numbers','product-quotient-numbers','two-digit-number-problems','reversed-digit-problems','remainder-number-problems','fractional-part-number-problems','mixed-number-relationships'],
  'age-problems': ['present-age-equations','past-age-problems','future-age-problems','age-difference','sum-of-ages','age-ratios','parent-child-ages','sibling-group-ages','mixed-age-relationships'],
  'work-and-rate-problems': ['individual-work-rate','combined-work-rate','worker-joins-later','worker-leaves-early','pipes-filling','pipes-filling-draining','efficiency-work-rates','unknown-work-time','mixed-work-rate'],
  'distance-speed-and-time': ['distance-from-speed-time','speed-from-distance-time','time-from-distance-speed','travel-unit-conversions','average-speed','same-direction-relative-speed','opposite-direction-relative-speed','meeting-and-overtaking','mixed-distance-speed-time'],
  'simple-interest': ['simple-interest','principal-from-interest','rate-from-interest','time-from-interest','maturity-value','interest-time-conversions','compare-interest-options','loan-savings-applications','mixed-simple-interest'],
} as const satisfies Record<string, readonly GeneratorSlug[]>

const analyticalOwnership = {
  'logical-reasoning-fundamentals': ['statement-classification','fact-opinion-conclusion','valid-conclusion','assumption-identification','conditional-reasoning','necessary-sufficient-condition','negation-contradiction','basic-deduction','logical-equivalence','mixed-logical-reasoning'],
  'analogy-and-classification': ['synonym-antonym-analogy','part-whole-analogy','function-purpose-analogy','cause-effect-analogy','degree-intensity-analogy','symbol-number-analogy','odd-one-out','category-classification','mixed-analogy-classification'],
  'number-series': ['addition-subtraction-series','multiplication-division-series','alternating-operation-series','increasing-difference-series','squares-cubes-powers-series','fibonacci-recursive-series','interleaved-two-pattern-series','missing-term-series','mixed-number-series'],
  'letter-series': ['forward-letter-series','backward-letter-series','skipping-letter-series','alternating-letter-series','increasing-gap-letter-series','grouped-letter-series','letter-number-series','missing-term-letter-series','mixed-letter-series'],
  'coding-and-decoding': ['letter-shift-codes','reverse-alphabet-codes','letter-position-codes','word-substitution-codes','symbol-replacement-codes','mixed-letter-number-codes','infer-coding-rule','multi-step-coding-rules','mixed-coding-decoding'],
  'ordering-and-ranking': ['left-right-ranking','total-from-two-ranks','rearranged-position','comparative-ordering','before-after-order','middle-position','multi-rank-comparison','queue-line-ranking','mixed-ordering-ranking'],
  syllogisms: ['universal-affirmative-syllogism','universal-negative-syllogism','particular-affirmative-syllogism','mixed-quantifier-syllogism','valid-conclusion-syllogism','venn-diagram-syllogism','possibility-conclusion-syllogism','either-or-syllogism','mixed-syllogism'],
  'seating-and-arrangement-problems': ['linear-row-seating','left-right-neighbor','fixed-gap-seating','circular-seating','facing-direction-seating','rearrangement-swap','schedule-slot-arrangement','object-shelf-arrangement','mixed-seating-arrangement'],
  'data-interpretation': ['table-interpretation','bar-chart-interpretation','line-graph-interpretation','pie-chart-interpretation','percentage-ratio-data','totals-differences-comparisons','average-weighted-data','multi-step-data-interpretation','mixed-data-interpretation'],
} as const satisfies Record<string, readonly GeneratorSlug[]>
const verbalOwnership = {
  'vocabulary-and-word-meaning': ['root-word-meaning','prefix-meaning','suffix-meaning','word-family-form','denotation-connotation','multiple-meaning-word','definition-example-match','commonly-confused-words','mixed-vocabulary-word-meaning'],
  'synonyms-and-antonyms': ['basic-synonym','basic-antonym','context-sensitive-synonym','context-sensitive-antonym','degree-intensity-synonym','connotation-tone-synonym','formal-informal-equivalent','sentence-synonym-antonym','mixed-synonyms-antonyms'],
  'context-clues': ['definition-context-clue','synonym-context-clue','antonym-contrast-clue','example-illustration-clue','cause-effect-context-clue','general-sense-context-clue','multiple-meaning-context-clue','two-sentence-context-clue','mixed-context-clues'],
  'sentence-completion': ['grammar-fit-completion','meaning-fit-completion','transition-word-completion','cause-effect-completion','contrast-comparison-completion','parallel-idea-completion','tone-formality-completion','double-blank-completion','mixed-sentence-completion'],
  'grammar-and-correct-usage': ['part-of-speech-usage','verb-tense-consistency','article-determiner-usage','preposition-usage','conjunction-usage','comparative-superlative-usage','commonly-misused-expression','correct-sentence-usage','mixed-grammar-usage'],
  'subject-verb-agreement': ['basic-subject-verb-agreement','compound-subject-agreement','either-or-neither-nor-agreement','indefinite-pronoun-agreement','collective-quantity-agreement','intervening-phrase-agreement','inverted-sentence-agreement','special-case-agreement','mixed-subject-verb-agreement'],
  'pronouns-and-modifiers': ['pronoun-reference-agreement','pronoun-case','possessive-reflexive-pronoun','relative-pronoun-usage','adjective-adverb-modifier','comparative-modifier','misplaced-modifier','dangling-modifier','mixed-pronouns-modifiers'],
  'sentence-structure-and-error-identification': ['subject-predicate-clause-identification','sentence-type-classification','sentence-fragment-detection','run-on-comma-splice-detection','coordination-subordination-error','parallel-structure-error','unclear-illogical-sentence','sentence-part-error-identification','mixed-sentence-structure-errors'],
  'paragraph-organization': ['topic-sentence-identification','supporting-detail-order','chronological-paragraph-order','cause-effect-paragraph-order','comparison-contrast-order','general-specific-order','transition-link-order','opening-closing-sentence','mixed-paragraph-organization'],
  'reading-comprehension': ['main-idea-comprehension','supporting-detail-comprehension','sequence-organization-comprehension','cause-effect-comprehension','vocabulary-in-context-comprehension','inference-comprehension','author-purpose-tone-comprehension','fact-opinion-conclusion-comprehension','mixed-reading-comprehension'],
} as const satisfies Record<string, readonly GeneratorSlug[]>
const generalInformationOwnership = {
  'philippine-constitution-fundamentals': ['constitution-structure-principles','bill-of-rights','citizenship-suffrage','legislative-department','executive-department','judicial-department','constitutional-commissions','public-officer-accountability','local-government-economy-amendments','mixed-philippine-constitution'],
  'ra-6713-code-of-conduct': ['ra6713-policy-coverage-definitions','ra6713-norms-of-conduct','ra6713-public-facing-duties','ra6713-saln-disclosure','ra6713-conflict-divestment','ra6713-financial-material-interests','ra6713-outside-employment-information','ra6713-gifts-favors','ra6713-incentives-penalties','mixed-ra6713-ethics'],
  'peace-and-human-rights': ['human-dignity-universality','civil-political-rights','economic-social-cultural-rights','equality-nondiscrimination','rights-duties-responsibilities','peace-conflict-nonviolence','conflict-prevention-resolution','peacebuilding-concepts','human-rights-institutions','mixed-peace-human-rights'],
  'environment-management-and-protection': ['environmental-rights-sustainability','clean-air-management','clean-water-management','ecological-solid-waste','toxic-hazardous-substances','biodiversity-wildlife-protected-areas','environmental-impact-assessment','climate-mitigation-adaptation','environmental-institutions-action','mixed-environment-management'],
} as const satisfies Record<string, readonly GeneratorSlug[]>
const numericalTitles: Record<string,string> = { percentages:'Percentages', fractions:'Fractions', decimals:'Decimals', 'ratio-and-proportion':'Ratio and Proportion', average:'Average', 'number-problems':'Number Problems', 'age-problems':'Age Problems', 'work-and-rate-problems':'Work and Rate Problems', 'distance-speed-and-time':'Distance, Speed, and Time', 'simple-interest':'Simple Interest' }
const analyticalTitles: Record<string,string> = { 'logical-reasoning-fundamentals':'Logical Reasoning Fundamentals', 'analogy-and-classification':'Analogy and Classification', 'number-series':'Number Series', 'letter-series':'Letter Series', 'coding-and-decoding':'Coding and Decoding', 'ordering-and-ranking':'Ordering and Ranking', syllogisms:'Syllogisms', 'seating-and-arrangement-problems':'Seating and Arrangement Problems', 'data-interpretation':'Data Interpretation' }
const verbalTitles: Record<string,string> = { 'vocabulary-and-word-meaning':'Vocabulary and Word Meaning', 'synonyms-and-antonyms':'Synonyms and Antonyms', 'context-clues':'Context Clues', 'sentence-completion':'Sentence Completion', 'grammar-and-correct-usage':'Grammar and Correct Usage', 'subject-verb-agreement':'Subject–Verb Agreement', 'pronouns-and-modifiers':'Pronouns and Modifiers', 'sentence-structure-and-error-identification':'Sentence Structure and Error Identification', 'paragraph-organization':'Paragraph Organization', 'reading-comprehension':'Reading Comprehension' }

const generalInformationTitles: Record<string,string> = { 'philippine-constitution-fundamentals':'Philippine Constitution Fundamentals', 'ra-6713-code-of-conduct':'RA 6713: Code of Conduct and Ethical Standards', 'peace-and-human-rights':'Peace and Human Rights Issues and Concepts', 'environment-management-and-protection':'Environment Management and Protection' }
const definitions = {
  [numericalAbilitySubjectSlug]: { assessmentSlug:numericalAbilityAssessmentSlug, total:50, count:5, difficulty:{easy:2,medium:2,hard:1}, ownership:numericalOwnership, titles:numericalTitles },
  [analyticalAbilitySubjectSlug]: { assessmentSlug:analyticalAbilityAssessmentSlug, total:45, count:5, difficulty:{easy:2,medium:2,hard:1}, ownership:analyticalOwnership, titles:analyticalTitles },
  [verbalAbilitySubjectSlug]: { assessmentSlug:verbalAbilityAssessmentSlug, total:50, count:5, difficulty:{easy:2,medium:2,hard:1}, ownership:verbalOwnership, titles:verbalTitles },
  [generalInformationSubjectSlug]: { assessmentSlug:generalInformationAssessmentSlug, total:40, count:10, difficulty:{easy:4,medium:4,hard:2}, ownership:generalInformationOwnership, titles:generalInformationTitles },
} as const

function configs(slugs: readonly GeneratorSlug[]): SubjectAssessmentGeneratorConfig[] { return slugs.map((slug,index)=>({slug,version:1,rotationPosition:index+1,selectionWeight:1})) }
function blueprint(subjectSlug: keyof typeof definitions): SubjectAssessmentBlueprint { const definition=definitions[subjectSlug]; return { subjectSlug,version:1,totalQuestions:definition.total,passingScorePercent:70,topics:Object.keys(definition.ownership).map((topicSlug,index)=>({topicSlug,topicTitle:definition.titles[topicSlug] ?? topicSlug,position:index+1,count:definition.count,difficulty:{...definition.difficulty},generators:configs(definition.ownership[topicSlug as keyof typeof definition.ownership])})) } }

export const numericalAbilityBlueprintV1 = blueprint(numericalAbilitySubjectSlug)
export const analyticalAbilityBlueprintV1 = blueprint(analyticalAbilitySubjectSlug)
export const verbalAbilityBlueprintV1 = blueprint(verbalAbilitySubjectSlug)
export const generalInformationBlueprintV1 = blueprint(generalInformationSubjectSlug)

export function getSubjectAssessmentRequirement(subjectSlug:string):{assessmentSlug:string;totalQuestions:number;topicCount:number}|null{const definition=definitions[subjectSlug as keyof typeof definitions];return definition===undefined?null:{assessmentSlug:definition.assessmentSlug,totalQuestions:definition.total,topicCount:Object.keys(definition.ownership).length}}

export interface BlueprintValidationResult { valid:boolean; errors:string[] }
export function validateSubjectAssessmentBlueprint(input: SubjectAssessmentBlueprint): BlueprintValidationResult {
  const errors:string[]=[]; const definition=definitions[input.subjectSlug]
  if (definition === undefined) return {valid:false,errors:[`Unsupported assessment subject ${input.subjectSlug}.`]}
  if (input.version!==1) errors.push('Subject assessment blueprint version must be 1.')
  const required=Object.keys(definition.ownership)
  if(input.topics.length!==required.length) errors.push(`The blueprint must contain exactly ${required.length} topics.`)
  const seen=new Set<string>()
  for(const topic of input.topics){ if(seen.has(topic.topicSlug)) errors.push(`Topic ${topic.topicSlug} is duplicated.`); seen.add(topic.topicSlug); if(!required.includes(topic.topicSlug)) errors.push(`Topic ${topic.topicSlug} does not belong to ${input.subjectSlug}.`); if(topic.count!==definition.count) errors.push(`Topic ${topic.topicSlug} must contain ${definition.count} questions.`); if(topic.difficulty.easy!==definition.difficulty.easy||topic.difficulty.medium!==definition.difficulty.medium||topic.difficulty.hard!==definition.difficulty.hard||topic.difficulty.easy+topic.difficulty.medium+topic.difficulty.hard!==topic.count) errors.push(`Topic ${topic.topicSlug} must use a ${definition.difficulty.easy}/${definition.difficulty.medium}/${definition.difficulty.hard} difficulty mix.`); if(topic.generators.length===0) errors.push(`Topic ${topic.topicSlug} needs at least one generator.`); const allowed=new Set<GeneratorSlug>((definition.ownership as Record<string,readonly GeneratorSlug[]>)[topic.topicSlug] ?? []); const generatorsSeen=new Set<string>(); for(const config of topic.generators){const key=`${config.slug}:${config.version}`; if(generatorsSeen.has(key)) errors.push(`Generator ${key} is duplicated for ${topic.topicSlug}.`); generatorsSeen.add(key); if(!allowed.has(config.slug)) errors.push(`Generator ${config.slug} does not belong to ${topic.topicSlug}.`); const generator=getGenerator(config.slug,config.version); if(generator===null) errors.push(`Generator ${key} is not registered.`); else for(const difficulty of ['easy','medium','hard'] as const) if(topic.difficulty[difficulty]>0&&!generator.supportedDifficulties.includes(difficulty)) errors.push(`${key} does not support ${difficulty}.`) } }
  for(const topic of required) if(!seen.has(topic)) errors.push(`Required topic ${topic} is missing.`)
  const total=input.topics.reduce((value,topic)=>value+topic.count,0); if(total!==input.totalQuestions||total!==definition.total) errors.push(`Blueprint topic counts must total exactly ${definition.total}.`)
  return {valid:errors.length===0,errors}
}

export interface GeneratedSubjectAssessmentQuestion { topicSlug:SubjectAssessmentTopicSlug; topicTitle:string; topicPosition:number; position:number; question:GeneratedQuestion }
function difficultyPlan(topic:SubjectAssessmentTopicConfig):GeneratorDifficulty[]{return [...Array<GeneratorDifficulty>(topic.difficulty.easy).fill('easy'),...Array<GeneratorDifficulty>(topic.difficulty.medium).fill('medium'),...Array<GeneratorDifficulty>(topic.difficulty.hard).fill('hard')]}
export function generateSubjectAssessmentQuestions(input:SubjectAssessmentBlueprint,attemptSeed:string):GeneratedSubjectAssessmentQuestion[]{const validation=validateSubjectAssessmentBlueprint(input);if(!validation.valid)throw new Error(`Invalid assessment blueprint: ${validation.errors.join(' ')}`);const signatures=new Set<string>();const prompts=new Set<string>();const generated:GeneratedSubjectAssessmentQuestion[]=[];for(const topic of [...input.topics].sort((a,b)=>a.position-b.position)){const random=createSeededRandom(`${attemptSeed}|${topic.topicSlug}|generator-rotation`);const plan=random.shuffle([...topic.generators].sort((a,b)=>a.rotationPosition-b.rotationPosition));const difficulties=difficultyPlan(topic);for(let index=0;index<difficulties.length;index+=1){const config=plan[index%plan.length];const difficulty=difficulties[index];if(config===undefined||difficulty===undefined)throw new Error(`Incomplete generator plan for ${topic.topicSlug}.`);const question=generateValidatedQuestion({attemptSeed:`${attemptSeed}|${topic.topicSlug}`,generatorSlug:config.slug,generatorVersion:config.version,difficulty,position:index+1,existingSignatures:signatures,existingPrompts:prompts,maxRetries:40});signatures.add(question.metadata.canonicalSignature);prompts.add(question.prompt.trim().toLowerCase());generated.push({topicSlug:topic.topicSlug,topicTitle:topic.topicTitle,topicPosition:topic.position,position:0,question:{...question,choices:createSeededRandom(`${attemptSeed}|${topic.topicSlug}|${index+1}|choices`).shuffle(question.choices)}})}}return createSeededRandom(`${attemptSeed}|question-order`).shuffle(generated).map((item,index)=>({...item,position:index+1}))}
export function isGeneratorAllowedForTopic(topicSlug:SubjectAssessmentTopicSlug,generatorSlug:GeneratorSlug,subjectSlug?:string):boolean{const definitionsToCheck=subjectSlug===undefined?Object.values(definitions):[definitions[subjectSlug as keyof typeof definitions]].filter((item)=>item!==undefined);return definitionsToCheck.some((definition)=>((definition.ownership as Record<string,readonly GeneratorSlug[]>)[topicSlug]??[]).includes(generatorSlug))}
