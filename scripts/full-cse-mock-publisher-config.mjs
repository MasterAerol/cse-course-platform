import { fullCseMockBlueprintV1 } from './full-cse-mock-blueprint.mjs'
export const confirmation='create-validate-publish-full-cse-professional-mock'
export const mockSlug='full-cse-professional-mock-examination'
export const baseInput={title:'Full CSE Professional Mock Examination',slug:mockSlug,description:'A complete 150-question cross-subject CSE Professional review simulation with official timed and untimed practice modes.',simulationLabel:'PassPath Simulation Distribution v1',position:1,passingScore:80,questionCount:150,timedDurationMinutes:190,maximumAttempts:null,showExplanations:true,sourceUrl:'https://csc.gov.ph/phocadownload/userupload/erpo/advisories/2026/ExamAdvisory_2026_02_School%20Assignment%20Impt%20Reminders%20for%2008%20March%202026%20CSE-PPT%20Sgd.pdf',blueprint:fullCseMockBlueprintV1}
export const passwordEnvironmentName='CSE_MOCK_ADMIN_PASSWORD'
export const shouldRestorePublishedStatus=(status)=>status==='published'
