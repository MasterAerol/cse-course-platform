import { describe,expect,it } from 'vitest'

import { scoreAssessment } from '../src/worker/domain/assessment-scoring'
import { environmentBankV1 } from '../src/worker/domain/environment-management/environment-management.bank'
import { scenarioSafe,validEnvironmentProvision } from '../src/worker/domain/environment-management/environment-management.rules'
import { validateEnvironmentBank } from '../src/worker/domain/environment-management/environment-management.validation'
import { peaceHumanRightsBankV1 } from '../src/worker/domain/peace-human-rights/peace-human-rights.bank'
import { validatePeaceHumanRightsBank } from '../src/worker/domain/peace-human-rights/peace-human-rights.validation'
import { validateConstitutionBank } from '../src/worker/domain/philippine-constitution/philippine-constitution-validation'
import { ra6713BankV1 } from '../src/worker/domain/ra-6713/ra-6713.bank'
import { validRa6713Reference } from '../src/worker/domain/ra-6713/ra-6713.rules'
import { validateRa6713Bank } from '../src/worker/domain/ra-6713/ra-6713.validation'
import {
  generalInformationAssessmentSlug,
  generalInformationBlueprintV1,
  generalInformationSubjectSlug,
  generateSubjectAssessmentQuestions,
  isGeneratorAllowedForTopic,
  validateSubjectAssessmentBlueprint,
} from '../src/worker/domain/subject-assessment-blueprint'
import { calculateSubjectAssessmentBreakdown } from '../src/worker/domain/subject-assessment-results'
import { getRegisteredGenerators } from '../src/worker/generators/generator.registry'
import { generalInformationBlueprintV1 as publisherBlueprint } from '../scripts/general-information-assessment-blueprint.mjs'

function sourceMetadata(question:{parameters:Record<string,unknown>}):Record<string,unknown>{
  const source=question.parameters.source
  expect(source).toBeTypeOf('object')
  expect(source).not.toBeNull()
  return source as Record<string,unknown>
}

describe('General Information subject assessment blueprint',()=>{
  it('defines four exact 10-question topic allocations with a 4/4/2 mix and valid ownership',()=>{
    expect(generalInformationAssessmentSlug).toBe('general-information-subject-assessment')
    expect(generalInformationBlueprintV1).toEqual(publisherBlueprint)
    expect(validateSubjectAssessmentBlueprint(generalInformationBlueprintV1)).toEqual({valid:true,errors:[]})
    expect(generalInformationBlueprintV1).toMatchObject({subjectSlug:generalInformationSubjectSlug,version:1,totalQuestions:40,passingScorePercent:70})
    expect(generalInformationBlueprintV1.topics).toHaveLength(4)
    const registered=new Set(getRegisteredGenerators().map((generator)=>`${generator.slug}@${generator.version}`))
    for(const topic of generalInformationBlueprintV1.topics){
      expect(topic.count).toBe(10)
      expect(topic.difficulty).toEqual({easy:4,medium:4,hard:2})
      expect(topic.generators).toHaveLength(10)
      expect(new Set(topic.generators.map((generator)=>generator.slug)).size).toBe(10)
      for(const generator of topic.generators){
        expect(registered.has(`${generator.slug}@${generator.version}`)).toBe(true)
        expect(isGeneratorAllowedForTopic(topic.topicSlug,generator.slug,generalInformationSubjectSlug)).toBe(true)
      }
    }
  })

  it('rejects invalid totals, duplicate or missing topics, invalid difficulty, zero counts, and cross-topic generators',()=>{
    const duplicate={...generalInformationBlueprintV1,topics:[...generalInformationBlueprintV1.topics.slice(0,3),generalInformationBlueprintV1.topics[0]]}
    const missing={...generalInformationBlueprintV1,topics:generalInformationBlueprintV1.topics.slice(0,3)}
    const wrongTotal={...generalInformationBlueprintV1,totalQuestions:39}
    const wrongDifficulty={...generalInformationBlueprintV1,topics:generalInformationBlueprintV1.topics.map((topic,index)=>index===0?{...topic,difficulty:{easy:5,medium:3,hard:2}}:topic)}
    const zeroCount={...generalInformationBlueprintV1,topics:generalInformationBlueprintV1.topics.map((topic,index)=>index===0?{...topic,count:0,difficulty:{easy:0,medium:0,hard:0}}:topic)}
    const wrongGenerator={...generalInformationBlueprintV1,topics:generalInformationBlueprintV1.topics.map((topic,index)=>index===0?{...topic,generators:[{...topic.generators[0],slug:'ra6713-norms-of-conduct' as const}]}:topic)}
    for(const invalid of [duplicate,missing,wrongTotal,wrongDifficulty,zeroCount,wrongGenerator])expect(validateSubjectAssessmentBlueprint(invalid).valid).toBe(false)
  })
})

describe('General Information source integrity',()=>{
  it('accepts all four active source banks and rejects invalid legal or unsafe content',()=>{
    expect(validateConstitutionBank()).toEqual([])
    expect(validateRa6713Bank(ra6713BankV1)).toEqual([])
    expect(validatePeaceHumanRightsBank(peaceHumanRightsBankV1)).toEqual([])
    expect(validateEnvironmentBank(environmentBankV1)).toEqual([])
    expect(validRa6713Reference('Section 99',null)).toBe(false)
    expect(validEnvironmentProvision('Blog, Section 1')).toBe(false)
    expect(scenarioSafe('Learners must capture wildlife and evade inspection.')).toBe(false)
  })
})

describe('General Information full-attempt quality gate',()=>{
  it('generates 300 reproducible attempts totaling 12,000 source-locked questions',()=>{
    for(let attempt=1;attempt<=300;attempt+=1){
      const seed=`general-information-quality-${attempt}`
      const questions=generateSubjectAssessmentQuestions(generalInformationBlueprintV1,seed)
      expect(questions).toHaveLength(40)
      expect(generateSubjectAssessmentQuestions(generalInformationBlueprintV1,seed)).toEqual(questions)
      expect(new Set(questions.map(({question})=>question.seed)).size).toBe(40)
      expect(new Set(questions.map(({question})=>question.prompt.trim().toLowerCase())).size).toBe(40)
      for(const topic of generalInformationBlueprintV1.topics){
        const selected=questions.filter((item)=>item.topicSlug===topic.topicSlug)
        expect(selected).toHaveLength(10)
        expect(selected.filter(({question})=>question.difficulty==='easy')).toHaveLength(4)
        expect(selected.filter(({question})=>question.difficulty==='medium')).toHaveLength(4)
        expect(selected.filter(({question})=>question.difficulty==='hard')).toHaveLength(2)
        expect(selected.every(({question})=>isGeneratorAllowedForTopic(topic.topicSlug,question.generatorSlug,generalInformationSubjectSlug))).toBe(true)
      }
      for(const {question} of questions){
        expect(question.choices).toHaveLength(4)
        expect(new Set(question.choices.map((choice)=>choice.text.trim().toLowerCase())).size).toBe(4)
        expect(question.choices.filter((choice)=>choice.isCorrect)).toHaveLength(1)
        expect(question.explanation.finalAnswer).toBe(question.choices.find((choice)=>choice.isCorrect)?.text)
        const source=sourceMetadata(question)
        expect(source.sourceTitle).toBeTypeOf('string')
        expect(source.classification).toBeTypeOf('string')
        expect(source.verificationDate).toBe('2026-08-04')
        expect(source.provisionId).toBeTypeOf('string')
        expect(source.contentVersion??source.historicalVersion).toBeTypeOf('string')
      }
    }
  },240_000)
})

describe('General Information scoring and topic results',()=>{
  const generated=generateSubjectAssessmentQuestions(generalInformationBlueprintV1,'general-information-boundaries')
  const questions=generated.map((item,index)=>({id:index+1,points:1,choices:item.question.choices.map((choice,choiceIndex)=>({id:index*4+choiceIndex+1,isCorrect:choice.isCorrect}))}))
  const answers=(correct:number)=>questions.map((question,index)=>({question_id:question.id,selected_choice_id:question.choices.find((choice)=>choice.isCorrect===(index<correct))!.id}))

  it('enforces 40/40, 28/40, 27/40, wrong, and unanswered boundaries on the Worker',()=>{
    expect(scoreAssessment(questions,answers(40),70)).toMatchObject({earnedPoints:40,totalPoints:40,scorePercent:100,passed:true})
    expect(scoreAssessment(questions,answers(28),70)).toMatchObject({earnedPoints:28,scorePercent:70,passed:true})
    expect(scoreAssessment(questions,answers(27),70)).toMatchObject({earnedPoints:27,scorePercent:67.5,passed:false})
    expect(scoreAssessment(questions,answers(0),70)).toMatchObject({earnedPoints:0,scorePercent:0,passed:false})
    expect(scoreAssessment(questions,[],70)).toMatchObject({earnedPoints:0,scorePercent:0,passed:false})
  })

  it('creates four exact topic results with deterministic strongest and weakest ties',()=>{
    const items=generalInformationBlueprintV1.topics.flatMap((topic)=>Array.from({length:10},(_,index)=>({topicSlug:topic.topicSlug,topicTitle:topic.topicTitle,topicPosition:topic.position,selectedChoiceId:index<6?index+1:null,isCorrect:index<6})))
    const result=calculateSubjectAssessmentBreakdown(items)
    expect(result.topics).toHaveLength(4)
    expect(result.topics.every((topic)=>topic.totalQuestions===10&&topic.correctCount===6&&topic.unansweredCount===4&&topic.percentage===60&&topic.status==='Developing')).toBe(true)
    expect(result.strongestTopic.topicSlug).toBe(generalInformationBlueprintV1.topics[0].topicSlug)
    expect(result.weakestTopic.topicSlug).toBe(generalInformationBlueprintV1.topics[0].topicSlug)
  })
})
