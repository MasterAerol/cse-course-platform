import type { WeaknessStatus } from './smart-recovery-weakness'

export const CSE_READINESS_FORMULA_VERSION = 1 as const
export const CSE_READINESS_WEIGHTS = Object.freeze({ fullMock: 35, subjectAssessments: 30, skillStrength: 20, recentPractice: 10, improvementConsistency: 5 })
export const CSE_SUBJECT_DISTRIBUTION = Object.freeze({ 'verbal-ability': 50, 'numerical-ability': 40, 'analytical-ability': 40, 'general-information': 20 })
export type ReadinessBand = 'building_foundations' | 'developing' | 'getting_closer' | 'nearly_ready' | 'strong_readiness'
export type ReadinessConfidence = 'low' | 'moderate' | 'strong'
export type ReadinessSubjectSlug = keyof typeof CSE_SUBJECT_DISTRIBUTION
export interface ReadinessAssessmentEvidence { subjectSlug: ReadinessSubjectSlug; subjectTitle: string; assessmentSlug: string; latestScorePercent: number; previousScorePercent: number | null; attemptCount: number; latestSubmittedAt: string }
export interface ReadinessMockEvidence { latestScorePercent: number; previousScorePercent: number | null; bestScorePercent: number; attemptCount: number; latestSubmittedAt: string }
export interface ReadinessPracticeItem { wasCorrect: boolean; submittedAt: string }
export interface ReadinessSkillEvidence { slug: string; title: string; subjectSlug: ReadinessSubjectSlug; status: WeaknessStatus; evidenceCount: number }
export interface ReadinessCalculationInput { mock: ReadinessMockEvidence | null; assessments: ReadinessAssessmentEvidence[]; recentPractice: ReadinessPracticeItem[]; skills: ReadinessSkillEvidence[]; totalSkillEvidenceCount: number; generatedAt: Date }
export interface ReadinessComponent { key: keyof typeof CSE_READINESS_WEIGHTS; title: string; contribution: number; maximum: number; evidenceAvailable: boolean; explanation: string }
export interface SubjectReadiness { slug: ReadinessSubjectSlug; title: string; readinessPercent: number | null; readinessLabel: 'Not enough evidence' | 'Needs attention' | 'Developing' | 'Strong'; latestAssessmentScorePercent: number | null; assessmentAttemptCount: number; skillStatusCounts: Record<WeaknessStatus, number> }
export interface ReadinessSignal { title: string; detail: string }
export interface ReadinessRecommendation { title: string; detail: string; actionLabel: string; route: string }
export interface CseReadinessResult {
  formulaVersion: typeof CSE_READINESS_FORMULA_VERSION; score: number; hasSufficientEvidence: boolean; readinessBand: ReadinessBand; confidence: ReadinessConfidence; confidenceExplanation: string
  evidence: { mockAttemptCount: number; subjectAssessmentCount: number; subjectsAssessed: number; observedSkillCount: number; classifiedSkillCount: number; skillEvidenceCount: number; recentPracticeQuestionCount: number }
  components: ReadinessComponent[]; subjects: SubjectReadiness[]; limiters: ReadinessSignal[]; positiveSignals: ReadinessSignal[]; recommendation: ReadinessRecommendation; generatedAt: string; disclaimer: string
}
const SUBJECTS = [
  { slug: 'verbal-ability', title: 'Verbal Ability', assessmentSlug: 'verbal-ability-subject-assessment' },
  { slug: 'numerical-ability', title: 'Numerical Ability', assessmentSlug: 'numerical-ability-subject-assessment' },
  { slug: 'analytical-ability', title: 'Analytical Ability', assessmentSlug: 'analytical-ability-subject-assessment' },
  { slug: 'general-information', title: 'General Information', assessmentSlug: 'general-information-subject-assessment' },
] as const
function clamp(value: number, minimum = 0, maximum = 100) { return Math.min(maximum, Math.max(minimum, value)) }
function roundOne(value: number) { return Math.round(value * 10) / 10 }
function points(percent: number, maximum: number) { return roundOne(clamp(percent) * maximum / 100) }
export function readinessBandFor(score: number): ReadinessBand { if (score < 40) return 'building_foundations'; if (score < 60) return 'developing'; if (score < 75) return 'getting_closer'; if (score < 85) return 'nearly_ready'; return 'strong_readiness' }
function skillValue(status: WeaknessStatus): number | null { return status === 'strong' ? 100 : status === 'improving' ? 70 : status === 'needs_more_practice' ? 40 : null }
function statusCounts(skills: ReadinessSkillEvidence[]): Record<WeaknessStatus, number> { const counts = { not_enough_data: 0, needs_more_practice: 0, improving: 0, strong: 0 }; for (const skill of skills) counts[skill.status] += 1; return counts }
function average(values: number[]): number | null { return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length }
function practiceAccuracy(items: ReadinessPracticeItem[]) { return items.length === 0 ? null : items.filter((item) => item.wasCorrect).length * 100 / items.length }
function subjectLabel(score: number | null): SubjectReadiness['readinessLabel'] { return score === null ? 'Not enough evidence' : score < 60 ? 'Needs attention' : score < 75 ? 'Developing' : 'Strong' }
function subjectReadiness(assessment: ReadinessAssessmentEvidence | undefined, skills: ReadinessSkillEvidence[], subject: typeof SUBJECTS[number]): SubjectReadiness {
  const classifiable = skills.map((skill) => skillValue(skill.status)).filter((value): value is number => value !== null)
  const skillPercent = average(classifiable)
  const percent = assessment === undefined ? skillPercent : skillPercent === null ? assessment.latestScorePercent : assessment.latestScorePercent * 0.7 + skillPercent * 0.3
  const readinessPercent = percent === null ? null : roundOne(clamp(percent))
  return { slug: subject.slug, title: subject.title, readinessPercent, readinessLabel: subjectLabel(readinessPercent), latestAssessmentScorePercent: assessment?.latestScorePercent ?? null, assessmentAttemptCount: assessment?.attemptCount ?? 0, skillStatusCounts: statusCounts(skills) }
}
function confidenceFor(input: ReadinessCalculationInput, subjectsAssessed: number) {
  const meaningfulSkills = input.totalSkillEvidenceCount >= 40
  if (input.mock !== null && subjectsAssessed === 4 && meaningfulSkills && input.recentPractice.length >= 30) return { confidence: 'strong' as const, explanation: 'Your estimate includes a full mock, all four subject assessments, and broad recent skill and practice evidence.' }
  if (input.mock !== null && subjectsAssessed >= 3 && meaningfulSkills) return { confidence: 'moderate' as const, explanation: 'Your estimate includes a full mock, at least three subject assessments, and meaningful skill evidence.' }
  return { confidence: 'low' as const, explanation: 'Complete more subject assessments, recent practice, and a full mock to improve confidence in this estimate.' }
}
function recommendationFor(input: ReadinessCalculationInput, subjects: SubjectReadiness[], score: number): ReadinessRecommendation {
  if (input.mock === null) return { title: 'Take a Full Mock Examination', detail: 'A submitted full mock is the most important missing readiness signal.', actionLabel: 'Open Full Mock', route: '/mock-examinations/full-cse-professional-mock-examination' }
  const missing = SUBJECTS.find((subject) => !input.assessments.some((item) => item.subjectSlug === subject.slug))
  if (missing !== undefined) return { title: `Complete the ${missing.title} assessment`, detail: 'Complete every subject assessment to improve coverage and confidence.', actionLabel: 'Open assessment', route: `/assessments/${missing.assessmentSlug}` }
  const needsPractice = input.skills.filter((skill) => skill.status === 'needs_more_practice')
  if (needsPractice.length >= 3) return { title: 'Start Smart Recovery', detail: `${needsPractice.length} observed skills currently need more practice.`, actionLabel: 'Open Smart Recovery', route: '/smart-recovery' }
  const ordered = subjects.filter((item) => item.readinessPercent !== null).sort((a, b) => (a.readinessPercent ?? 101) - (b.readinessPercent ?? 101))
  const weakest = ordered[0]; const strongest = ordered.at(-1)
  if (weakest !== undefined && strongest !== undefined && (strongest.readinessPercent ?? 0) - (weakest.readinessPercent ?? 0) >= 15) {
    const assessmentSlug = SUBJECTS.find((subject) => subject.slug === weakest.slug)?.assessmentSlug
    return { title: `Focus on ${weakest.title}`, detail: 'This subject currently trails your strongest area by at least 15 points.', actionLabel: 'Review assessment', route: assessmentSlug === undefined ? '/courses/cse-professional' : `/assessments/${assessmentSlug}` }
  }
  if (score >= 75) return { title: 'Take another timed full mock', detail: 'Use exam conditions to confirm that your readiness remains consistent.', actionLabel: 'Open Full Mock', route: '/mock-examinations/full-cse-professional-mock-examination' }
  return { title: 'Continue targeted practice', detail: 'Build more recent evidence, then check how your readiness changes.', actionLabel: 'Continue course', route: '/courses/cse-professional' }
}
export function calculateCseReadiness(input: ReadinessCalculationInput): CseReadinessResult {
  if (!Number.isFinite(input.generatedAt.getTime())) throw new Error('Readiness calculation date is invalid.')
  const assessments = new Map(input.assessments.map((item) => [item.subjectSlug, item])); const subjectsAssessed = assessments.size
  const observedSkills = input.skills.filter((skill) => skill.evidenceCount > 0); const classifiedSkills = observedSkills.filter((skill) => skill.status !== 'not_enough_data')
  const mockPercent = input.mock === null ? null : input.mock.latestScorePercent * 0.8 + input.mock.bestScorePercent * 0.2
  const assessmentPercent = SUBJECTS.reduce((total, subject) => total + (assessments.get(subject.slug)?.latestScorePercent ?? 0) * CSE_SUBJECT_DISTRIBUTION[subject.slug] / 150, 0)
  const skillPercent = average(classifiedSkills.map((skill) => skillValue(skill.status) ?? 0)); const recentPracticePercent = practiceAccuracy(input.recentPractice)
  const trends: number[] = []
  if (input.mock?.previousScorePercent != null) trends.push(input.mock.latestScorePercent - input.mock.previousScorePercent)
  for (const assessment of input.assessments) if (assessment.previousScorePercent !== null) trends.push(assessment.latestScorePercent - assessment.previousScorePercent)
  if (input.recentPractice.length >= 20) { const midpoint = Math.floor(input.recentPractice.length / 2); const recent = practiceAccuracy(input.recentPractice.slice(0, midpoint)); const earlier = practiceAccuracy(input.recentPractice.slice(midpoint)); if (recent !== null && earlier !== null) trends.push(recent - earlier) }
  const averageTrend = average(trends); const improvementPercent = averageTrend === null ? 0 : clamp((clamp(averageTrend, -20, 20) + 20) * 2.5) * Math.min(1, trends.length / 2)
  const components: ReadinessComponent[] = [
    { key: 'fullMock', title: 'Full Mock', contribution: mockPercent === null ? 0 : points(mockPercent, 35), maximum: 35, evidenceAvailable: mockPercent !== null, explanation: mockPercent === null ? 'No submitted full mock yet.' : 'Uses 80% latest mock performance and 20% historical best.' },
    { key: 'subjectAssessments', title: 'Subject Assessments', contribution: points(assessmentPercent, 30), maximum: 30, evidenceAvailable: subjectsAssessed > 0, explanation: 'Latest submitted scores are weighted 50/40/40/20 using the platform mock distribution; missing subjects add no points.' },
    { key: 'skillStrength', title: 'Skill Strength', contribution: skillPercent === null ? 0 : points(skillPercent, 20), maximum: 20, evidenceAvailable: classifiedSkills.length > 0, explanation: 'Uses observed Smart Recovery skill statuses only; unobserved skills are not treated as failures.' },
    { key: 'recentPractice', title: 'Recent Practice', contribution: recentPracticePercent === null ? 0 : points(recentPracticePercent, 10), maximum: 10, evidenceAvailable: recentPracticePercent !== null, explanation: `Uses the latest ${input.recentPractice.length} submitted generated-practice questions, up to 50.` },
    { key: 'improvementConsistency', title: 'Improvement and Consistency', contribution: points(improvementPercent, 5), maximum: 5, evidenceAvailable: trends.length > 0, explanation: trends.length === 0 ? 'More repeated submitted attempts are needed for a trend.' : `Uses ${trends.length} bounded recent-versus-previous comparison${trends.length === 1 ? '' : 's'}; limited evidence is scaled down.` },
  ]
  const score = Math.round(clamp(components.reduce((total, item) => total + item.contribution, 0))); const subjectResults = SUBJECTS.map((subject) => subjectReadiness(assessments.get(subject.slug), observedSkills.filter((skill) => skill.subjectSlug === subject.slug), subject)); const confidence = confidenceFor(input, subjectsAssessed)
  const limiters: ReadinessSignal[] = []
  if (input.mock === null) limiters.push({ title: 'Full mock not completed', detail: 'No submitted full mock currently supports this estimate.' })
  for (const subject of subjectResults.filter((item) => item.latestAssessmentScorePercent === null)) limiters.push({ title: `${subject.title} assessment missing`, detail: 'This subject has no submitted assessment score.' })
  if (input.mock !== null && input.mock.latestScorePercent < 80) limiters.push({ title: `Latest full mock: ${roundOne(input.mock.latestScorePercent)}%`, detail: 'The platform mock passing target is 80%; readiness is a separate estimate.' })
  for (const skill of input.skills.filter((item) => item.status === 'needs_more_practice').sort((a, b) => b.evidenceCount - a.evidenceCount).slice(0, 2)) limiters.push({ title: `${skill.title} needs more practice`, detail: `Based on ${skill.evidenceCount} recent eligible evidence items.` })
  const positiveSignals: ReadinessSignal[] = []; const strongestAssessment = [...input.assessments].sort((a, b) => b.latestScorePercent - a.latestScorePercent)[0]
  if (strongestAssessment !== undefined) positiveSignals.push({ title: `${strongestAssessment.subjectTitle}: ${roundOne(strongestAssessment.latestScorePercent)}%`, detail: 'This is your strongest latest subject-assessment result.' })
  const strongCount = input.skills.filter((skill) => skill.status === 'strong').length; const improvingCount = input.skills.filter((skill) => skill.status === 'improving').length
  if (strongCount > 0) positiveSignals.push({ title: `${strongCount} observed skill${strongCount === 1 ? '' : 's'} strong`, detail: 'These Smart Recovery skills are currently classified as strong.' })
  if (improvingCount > 0) positiveSignals.push({ title: `${improvingCount} observed skill${improvingCount === 1 ? '' : 's'} improving`, detail: 'Recent evidence shows developing performance in these skills.' })
  if (averageTrend !== null && averageTrend > 0) positiveSignals.push({ title: 'Recent performance is improving', detail: `Bounded comparison signals improved by an average of ${roundOne(averageTrend)} points.` })
  return { formulaVersion: CSE_READINESS_FORMULA_VERSION, score, hasSufficientEvidence: input.mock !== null || subjectsAssessed >= 2 || input.totalSkillEvidenceCount >= 40 || input.recentPractice.length >= 30, readinessBand: readinessBandFor(score), confidence: confidence.confidence, confidenceExplanation: confidence.explanation,
    evidence: { mockAttemptCount: input.mock?.attemptCount ?? 0, subjectAssessmentCount: input.assessments.reduce((total, item) => total + item.attemptCount, 0), subjectsAssessed, observedSkillCount: observedSkills.length, classifiedSkillCount: classifiedSkills.length, skillEvidenceCount: input.totalSkillEvidenceCount, recentPracticeQuestionCount: input.recentPractice.length },
    components, subjects: subjectResults, limiters: limiters.slice(0, 5), positiveSignals: positiveSignals.slice(0, 5), recommendation: recommendationFor(input, subjectResults, score), generatedAt: input.generatedAt.toISOString(), disclaimer: 'This readiness estimate is based on submitted platform evidence and does not guarantee a passing CSE result.' }
}
