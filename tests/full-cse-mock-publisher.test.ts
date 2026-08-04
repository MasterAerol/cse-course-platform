import { describe,expect,it } from 'vitest'
import { adminMockExamInputSchema } from '../src/worker/schemas/mock-exam.schemas'
import { allMockGeneratorSlugs,fullCseMockBlueprintV1 } from '../scripts/full-cse-mock-blueprint.mjs'
import { baseInput,confirmation,mockSlug,passwordEnvironmentName,shouldRestorePublishedStatus } from '../scripts/full-cse-mock-publisher-config.mjs'

describe('Full CSE mock publisher contract',()=>{
  it('builds a credential-free draft/published payload accepted by the admin schema',()=>{
    expect(adminMockExamInputSchema.safeParse({...baseInput,status:'draft'}).success).toBe(true)
    expect(adminMockExamInputSchema.safeParse({...baseInput,status:'published'}).success).toBe(true)
    expect(baseInput).not.toHaveProperty('password')
    expect(mockSlug).toBe('full-cse-professional-mock-examination')
    expect(confirmation).toBe('create-validate-publish-full-cse-professional-mock')
    expect(passwordEnvironmentName).toBe('CSE_MOCK_ADMIN_PASSWORD')
    expect(shouldRestorePublishedStatus('published')).toBe(true)
    expect(shouldRestorePublishedStatus('draft')).toBe(false)
  })
  it('contains the exact versioned allocation and all reusable generators',()=>{
    expect(fullCseMockBlueprintV1).toMatchObject({version:1,label:'PassPath Simulation Distribution v1',totalQuestions:150,passingScorePercent:80,timedDurationMinutes:190,difficulty:{easy:45,medium:75,hard:30}})
    expect(fullCseMockBlueprintV1.subjects.map((item)=>item.count)).toEqual([50,40,40,20])
    expect(fullCseMockBlueprintV1.subjects.flatMap((item)=>item.topics)).toHaveLength(33)
    expect(new Set(allMockGeneratorSlugs).size).toBeGreaterThan(250)
  })
})
