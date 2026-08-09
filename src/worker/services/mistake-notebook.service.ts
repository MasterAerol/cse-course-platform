import {
  formatMistakePattern,
  normalizeMistakeNotebookRow,
  type MistakeNotebookEntry,
  type MistakeNotebookSkillStatus,
  type MistakeNotebookSummary,
} from '../domain/mistake-notebook'
import { findPublishedCourseEnrollment } from '../repositories/course.repository'
import {
  findMistakeNotebookEntry,
  findMistakeNotebookPage,
  findMistakeNotebookSummaryRows,
  type MistakeNotebookFilters,
} from '../repositories/mistake-notebook.repository'
import { AppError } from '../utils/app-error'
import { getSmartRecoverySkillDetails } from './smart-recovery.service'

const COURSE_SLUG = 'cse-professional'

async function assertEnrollment(database: D1Database, userId: number): Promise<void> {
  const enrollment = await findPublishedCourseEnrollment(database, userId, COURSE_SLUG)
  if (enrollment === null || enrollment.has_active_access !== 1) {
    throw new AppError(
      403,
      'MISTAKE_NOTEBOOK_ENROLLMENT_REQUIRED',
      'An active CSE Professional enrollment is required.',
    )
  }
}

export async function getMistakeNotebookSummary(
  database: D1Database,
  userId: number,
): Promise<MistakeNotebookSummary> {
  await assertEnrollment(database, userId)
  const rows = await findMistakeNotebookSummaryRows(database, userId)
  return {
    totalMistakes: rows.totals.total_mistakes,
    recentMistakes: rows.totals.recent_mistakes,
    latestMistakeAt: rows.totals.latest_mistake_at,
    reviewedSourceCount: rows.totals.reviewed_source_count,
    mistakesBySubject: rows.subjects,
    topMistakeSkills: rows.skills,
    repeatedMistakePatterns: rows.patterns.map((item) => ({
      pattern: formatMistakePattern(item.pattern) ?? item.pattern,
      count: item.count,
    })),
  }
}

export async function getMistakeNotebookPage(
  database: D1Database,
  userId: number,
  input: {
    filters: MistakeNotebookFilters
    page: number
    limit: number
  },
) {
  await assertEnrollment(database, userId)
  const result = await findMistakeNotebookPage(
    database,
    userId,
    input.filters,
    input.limit,
    (input.page - 1) * input.limit,
  )
  const entries = result.rows
    .map(normalizeMistakeNotebookRow)
    .filter((entry): entry is MistakeNotebookEntry => entry !== null)
  return {
    entries,
    pagination: {
      page: input.page,
      limit: input.limit,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / input.limit)),
      hasPreviousPage: input.page > 1,
      hasNextPage: input.page * input.limit < result.total,
    },
    appliedFilters: input.filters,
  }
}

async function currentSkillStatus(
  database: D1Database,
  userId: number,
  skillSlug: string | null,
): Promise<MistakeNotebookSkillStatus | null> {
  if (skillSlug === null) return null
  try {
    const details = await getSmartRecoverySkillDetails(database, userId, skillSlug)
    return details.summary.status
  } catch (error: unknown) {
    if (error instanceof AppError && error.status === 404) return null
    throw error
  }
}

export async function getMistakeNotebookEntry(
  database: D1Database,
  userId: number,
  entryId: string,
): Promise<MistakeNotebookEntry> {
  await assertEnrollment(database, userId)
  const row = await findMistakeNotebookEntry(database, userId, entryId)
  const entry = row === null ? null : normalizeMistakeNotebookRow(row)
  if (entry === null) {
    throw new AppError(
      404,
      'MISTAKE_NOTEBOOK_ENTRY_NOT_FOUND',
      'The mistake notebook entry was not found.',
    )
  }
  return {
    ...entry,
    currentSkillStatus: await currentSkillStatus(
      database,
      userId,
      entry.skill?.slug ?? null,
    ),
  }
}