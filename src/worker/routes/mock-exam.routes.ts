import { Hono } from 'hono'
import { requireAuthentication } from '../middleware/auth.middleware'
import { createMockAttemptSchema, markMockQuestionSchema, mockAttemptParamsSchema, mockExamSlugParamsSchema, mockQuestionParamsSchema, saveMockAnswerSchema } from '../schemas/mock-exam.schemas'
import { createMockExamAttempt, getMockExamAttempt, getMockExamResult, getMockExamReview, getMockExamSummary, getMockReviewSummary, markMockExamQuestion, saveMockExamAnswer, startMockExamProper, submitMockExam } from '../services/mock-exam.service'
import type { AppEnv } from '../types/app'
import { successResponse } from '../utils/responses'
import { parseJsonBody, parseValidatedInput } from '../utils/validation'

export const mockExamRoutes=new Hono<AppEnv>()
mockExamRoutes.use('*',requireAuthentication)
mockExamRoutes.get('/mock-examinations/:mockExamSlug',async(c)=>{const {mockExamSlug}=parseValidatedInput(mockExamSlugParamsSchema.safeParse(c.req.param()));return successResponse(c,await getMockExamSummary(c.env.DB,c.get('authUser').internalUserId,mockExamSlug))})
mockExamRoutes.post('/mock-examinations/:mockExamSlug/attempts',async(c)=>{const {mockExamSlug}=parseValidatedInput(mockExamSlugParamsSchema.safeParse(c.req.param()));const {mode}=await parseJsonBody(c,createMockAttemptSchema);return successResponse(c,await createMockExamAttempt(c.env.DB,c.get('authUser').internalUserId,mockExamSlug,mode),201)})
mockExamRoutes.get('/mock-exam-attempts/:attemptPublicId',async(c)=>{const {attemptPublicId}=parseValidatedInput(mockAttemptParamsSchema.safeParse(c.req.param()));return successResponse(c,await getMockExamAttempt(c.env.DB,c.get('authUser').internalUserId,attemptPublicId))})
mockExamRoutes.post('/mock-exam-attempts/:attemptPublicId/start',async(c)=>{const {attemptPublicId}=parseValidatedInput(mockAttemptParamsSchema.safeParse(c.req.param()));return successResponse(c,await startMockExamProper(c.env.DB,c.get('authUser').internalUserId,attemptPublicId))})
mockExamRoutes.put('/mock-exam-attempts/:attemptPublicId/answers/:snapshotPublicId',async(c)=>{const params=parseValidatedInput(mockQuestionParamsSchema.safeParse(c.req.param()));const input=await parseJsonBody(c,saveMockAnswerSchema);return successResponse(c,await saveMockExamAnswer(c.env.DB,c.get('authUser').internalUserId,{...params,...input}))})
mockExamRoutes.put('/mock-exam-attempts/:attemptPublicId/review-flags/:snapshotPublicId',async(c)=>{const params=parseValidatedInput(mockQuestionParamsSchema.safeParse(c.req.param()));const input=await parseJsonBody(c,markMockQuestionSchema);return successResponse(c,await markMockExamQuestion(c.env.DB,c.get('authUser').internalUserId,{...params,...input}))})
mockExamRoutes.get('/mock-exam-attempts/:attemptPublicId/submission-review',async(c)=>{const {attemptPublicId}=parseValidatedInput(mockAttemptParamsSchema.safeParse(c.req.param()));return successResponse(c,await getMockReviewSummary(c.env.DB,c.get('authUser').internalUserId,attemptPublicId))})
mockExamRoutes.post('/mock-exam-attempts/:attemptPublicId/submit',async(c)=>{const {attemptPublicId}=parseValidatedInput(mockAttemptParamsSchema.safeParse(c.req.param()));return successResponse(c,await submitMockExam(c.env.DB,c.get('authUser').internalUserId,attemptPublicId))})
mockExamRoutes.get('/mock-exam-attempts/:attemptPublicId/results',async(c)=>{const {attemptPublicId}=parseValidatedInput(mockAttemptParamsSchema.safeParse(c.req.param()));return successResponse(c,await getMockExamResult(c.env.DB,c.get('authUser').internalUserId,attemptPublicId))})
mockExamRoutes.get('/mock-exam-attempts/:attemptPublicId/review',async(c)=>{const {attemptPublicId}=parseValidatedInput(mockAttemptParamsSchema.safeParse(c.req.param()));return successResponse(c,await getMockExamReview(c.env.DB,c.get('authUser').internalUserId,attemptPublicId))})
