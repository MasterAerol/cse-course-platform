import { generateValidatedQuestion, getGenerator } from '../generators/generator.registry'
import { createSeededRandom } from '../generators/generator-random'
import type { GeneratedQuestion, GeneratorDifficulty, GeneratorSlug } from '../generators/generator.types'

export const numericalAbilityAssessmentSlug = 'numerical-ability-subject-assessment'
export const numericalAbilitySubjectSlug = 'numerical-ability'
export const analyticalAbilityAssessmentSlug = 'analytical-ability-subject-assessment'
export const analyticalAbilitySubjectSlug = 'analytical-ability'
export type SubjectAssessmentSubjectSlug = typeof numericalAbilitySubjectSlug | typeof analyticalAbilitySubjectSlug

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

const numericalTitles: Record<string,string> = { percentages:'Percentages', fractions:'Fractions', decimals:'Decimals', 'ratio-and-proportion':'Ratio and Proportion', average:'Average', 'number-problems':'Number Problems', 'age-problems':'Age Problems', 'work-and-rate-problems':'Work and Rate Problems', 'distance-speed-and-time':'Distance, Speed, and Time', 'simple-interest':'Simple Interest' }
const analyticalTitles: Record<string,string> = { 'logical-reasoning-fundamentals':'Logical Reasoning Fundamentals', 'analogy-and-classification':'Analogy and Classification', 'number-series':'Number Series', 'letter-series':'Letter Series', 'coding-and-decoding':'Coding and Decoding', 'ordering-and-ranking':'Ordering and Ranking', syllogisms:'Syllogisms', 'seating-and-arrangement-problems':'Seating and Arrangement Problems', 'data-interpretation':'Data Interpretation' }

const definitions = {
  [numericalAbilitySubjectSlug]: { total: 50, ownership: numericalOwnership, titles: numericalTitles },
  [analyticalAbilitySubjectSlug]: { total: 45, ownership: analyticalOwnership, titles: analyticalTitles },
} as const

function configs(slugs: readonly GeneratorSlug[]): SubjectAssessmentGeneratorConfig[] { return slugs.map((slug,index)=>({slug,version:1,rotationPosition:index+1,selectionWeight:1})) }
function blueprint(subjectSlug: keyof typeof definitions): SubjectAssessmentBlueprint { const definition=definitions[subjectSlug]; return { subjectSlug,version:1,totalQuestions:definition.total,passingScorePercent:70,topics:Object.keys(definition.ownership).map((topicSlug,index)=>({topicSlug,topicTitle:definition.titles[topicSlug] ?? topicSlug,position:index+1,count:5,difficulty:{easy:2,medium:2,hard:1},generators:configs(definition.ownership[topicSlug as keyof typeof definition.ownership])})) } }

export const numericalAbilityBlueprintV1 = blueprint(numericalAbilitySubjectSlug)
export const analyticalAbilityBlueprintV1 = blueprint(analyticalAbilitySubjectSlug)

export interface BlueprintValidationResult { valid:boolean; errors:string[] }
export function validateSubjectAssessmentBlueprint(input: SubjectAssessmentBlueprint): BlueprintValidationResult {
  const errors:string[]=[]; const definition=definitions[input.subjectSlug]
  if (definition === undefined) return {valid:false,errors:[`Unsupported assessment subject ${input.subjectSlug}.`]}
  if (input.version!==1) errors.push('Subject assessment blueprint version must be 1.')
  const required=Object.keys(definition.ownership)
  if(input.topics.length!==required.length) errors.push(`The blueprint must contain exactly ${required.length} topics.`)
  const seen=new Set<string>()
  for(const topic of input.topics){ if(seen.has(topic.topicSlug)) errors.push(`Topic ${topic.topicSlug} is duplicated.`); seen.add(topic.topicSlug); if(!required.includes(topic.topicSlug)) errors.push(`Topic ${topic.topicSlug} does not belong to ${input.subjectSlug}.`); if(topic.count!==5) errors.push(`Topic ${topic.topicSlug} must contain five questions.`); if(topic.difficulty.easy!==2||topic.difficulty.medium!==2||topic.difficulty.hard!==1||topic.difficulty.easy+topic.difficulty.medium+topic.difficulty.hard!==topic.count) errors.push(`Topic ${topic.topicSlug} must use a 2/2/1 difficulty mix.`); if(topic.generators.length===0) errors.push(`Topic ${topic.topicSlug} needs at least one generator.`); const allowed=new Set<GeneratorSlug>((definition.ownership as Record<string,readonly GeneratorSlug[]>)[topic.topicSlug] ?? []); const generatorsSeen=new Set<string>(); for(const config of topic.generators){const key=`${config.slug}:${config.version}`; if(generatorsSeen.has(key)) errors.push(`Generator ${key} is duplicated for ${topic.topicSlug}.`); generatorsSeen.add(key); if(!allowed.has(config.slug)) errors.push(`Generator ${config.slug} does not belong to ${topic.topicSlug}.`); const generator=getGenerator(config.slug,config.version); if(generator===null) errors.push(`Generator ${key} is not registered.`); else for(const difficulty of ['easy','medium','hard'] as const) if(topic.difficulty[difficulty]>0&&!generator.supportedDifficulties.includes(difficulty)) errors.push(`${key} does not support ${difficulty}.`) } }
  for(const topic of required) if(!seen.has(topic)) errors.push(`Required topic ${topic} is missing.`)
  const total=input.topics.reduce((value,topic)=>value+topic.count,0); if(total!==input.totalQuestions||total!==definition.total) errors.push(`Blueprint topic counts must total exactly ${definition.total}.`)
  return {valid:errors.length===0,errors}
}

export interface GeneratedSubjectAssessmentQuestion { topicSlug:SubjectAssessmentTopicSlug; topicTitle:string; topicPosition:number; position:number; question:GeneratedQuestion }
function difficultyPlan(topic:SubjectAssessmentTopicConfig):GeneratorDifficulty[]{return [...Array<GeneratorDifficulty>(topic.difficulty.easy).fill('easy'),...Array<GeneratorDifficulty>(topic.difficulty.medium).fill('medium'),...Array<GeneratorDifficulty>(topic.difficulty.hard).fill('hard')]}
export function generateSubjectAssessmentQuestions(input:SubjectAssessmentBlueprint,attemptSeed:string):GeneratedSubjectAssessmentQuestion[]{const validation=validateSubjectAssessmentBlueprint(input);if(!validation.valid)throw new Error(`Invalid assessment blueprint: ${validation.errors.join(' ')}`);const signatures=new Set<string>();const prompts=new Set<string>();const generated:GeneratedSubjectAssessmentQuestion[]=[];for(const topic of [...input.topics].sort((a,b)=>a.position-b.position)){const random=createSeededRandom(`${attemptSeed}|${topic.topicSlug}|generator-rotation`);const plan=random.shuffle([...topic.generators].sort((a,b)=>a.rotationPosition-b.rotationPosition));const difficulties=difficultyPlan(topic);for(let index=0;index<difficulties.length;index+=1){const config=plan[index%plan.length];const difficulty=difficulties[index];if(config===undefined||difficulty===undefined)throw new Error(`Incomplete generator plan for ${topic.topicSlug}.`);const question=generateValidatedQuestion({attemptSeed:`${attemptSeed}|${topic.topicSlug}`,generatorSlug:config.slug,generatorVersion:config.version,difficulty,position:index+1,existingSignatures:signatures,existingPrompts:prompts,maxRetries:40});signatures.add(question.metadata.canonicalSignature);prompts.add(question.prompt.trim().toLowerCase());generated.push({topicSlug:topic.topicSlug,topicTitle:topic.topicTitle,topicPosition:topic.position,position:0,question:{...question,choices:createSeededRandom(`${attemptSeed}|${topic.topicSlug}|${index+1}|choices`).shuffle(question.choices)}})}}return createSeededRandom(`${attemptSeed}|question-order`).shuffle(generated).map((item,index)=>({...item,position:index+1}))}
export function isGeneratorAllowedForTopic(topicSlug:SubjectAssessmentTopicSlug,generatorSlug:GeneratorSlug,subjectSlug?:string):boolean{const definitionsToCheck=subjectSlug===undefined?Object.values(definitions):[definitions[subjectSlug as keyof typeof definitions]].filter((item)=>item!==undefined);return definitionsToCheck.some((definition)=>((definition.ownership as Record<string,readonly GeneratorSlug[]>)[topicSlug]??[]).includes(generatorSlug))}
