import { describe,expect,it } from 'vitest'

import { adminSubjectAssessmentInputSchema } from '../src/worker/schemas/subject-assessment.schemas'
import { generatorPools,generalInformationBlueprintV1,requiredTopics } from '../scripts/general-information-assessment-blueprint.mjs'
import { assessmentSlug,baseInput,confirmation,passwordEnvironmentName,shouldRestorePublishedStatus } from '../scripts/general-information-assessment-publisher-config.mjs'

describe('General Information assessment publisher contract',()=>{
  it('builds the exact draft and published payload accepted by the shared schema',()=>{
    expect(adminSubjectAssessmentInputSchema.safeParse({...baseInput,status:'draft'}).success).toBe(true)
    expect(requiredTopics).toEqual(['philippine-constitution-fundamentals','ra-6713-code-of-conduct','peace-and-human-rights','environment-management-and-protection'])
    expect(generatorPools).toHaveLength(4)
    expect(generatorPools.every((pool)=>pool.length===10)).toBe(true)
    expect(generalInformationBlueprintV1.topics.every((topic)=>topic.count===10&&topic.difficulty.easy===4&&topic.difficulty.medium===4&&topic.difficulty.hard===2)).toBe(true)
  })

  it('restores only a previously published status after a failed draft validation',()=>{
    expect(shouldRestorePublishedStatus('published')).toBe(true)
    expect(shouldRestorePublishedStatus('draft')).toBe(false)
    expect(shouldRestorePublishedStatus(undefined)).toBe(false)
  })
  it('exposes a guarded credential-free publisher identity',()=>{
    expect(assessmentSlug).toBe('general-information-subject-assessment')
    expect(confirmation).toBe('create-validate-publish-general-information-assessment')
    expect(passwordEnvironmentName).toBe('CSE_GENERAL_INFORMATION_ASSESSMENT_ADMIN_PASSWORD')
    expect(baseInput).toMatchObject({position:5,questionCount:40,passingScore:70,maximumAttempts:null,timeLimitMinutes:null,showExplanations:true})
    expect(baseInput).not.toHaveProperty('password')
  })
})
