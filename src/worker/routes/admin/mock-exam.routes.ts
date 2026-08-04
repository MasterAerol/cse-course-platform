import { Hono } from 'hono'
import { adminMockExamInputSchema, mockExamSlugParamsSchema } from '../../schemas/mock-exam.schemas'
import { getAdminMockExam, saveAdminMockExam, validateAdminMockExam } from '../../services/mock-exam.service'
import type { AppEnv } from '../../types/app'
import { successResponse } from '../../utils/responses'
import { parseJsonBody, parseValidatedInput } from '../../utils/validation'
export const adminMockExamRoutes=new Hono<AppEnv>()
adminMockExamRoutes.get('/mock-examinations/:mockExamSlug',async(c)=>{const {mockExamSlug}=parseValidatedInput(mockExamSlugParamsSchema.safeParse(c.req.param()));return successResponse(c,await getAdminMockExam(c.env.DB,mockExamSlug))})
adminMockExamRoutes.put('/mock-examinations/:mockExamSlug',async(c)=>{const {mockExamSlug}=parseValidatedInput(mockExamSlugParamsSchema.safeParse(c.req.param()));const input=await parseJsonBody(c,adminMockExamInputSchema);if(input.slug!==mockExamSlug)return c.json({success:false,error:{code:'MOCK_SLUG_MISMATCH',message:'The route and body mock slugs must match.'}},400);return successResponse(c,await saveAdminMockExam(c.env.DB,c.get('authUser'),input))})
adminMockExamRoutes.post('/mock-examinations/:mockExamSlug/validate',async(c)=>{const {mockExamSlug}=parseValidatedInput(mockExamSlugParamsSchema.safeParse(c.req.param()));return successResponse(c,await validateAdminMockExam(c.env.DB,mockExamSlug))})
