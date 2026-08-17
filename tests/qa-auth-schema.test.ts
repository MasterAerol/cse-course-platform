import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let fetchCurrentUser: typeof import('../src/react-app/lib/api')['fetchCurrentUser']

describe('frontend auth schema', () => {
  const makeResponse = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })

  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()
    ;({ fetchCurrentUser } = await import('../src/react-app/lib/api'))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('accepts repaired UUID public IDs from /api/auth/me', async () => {
    const repairedId = '123e4567-e89b-12d3-a456-426614174000'

    fetchMock.mockResolvedValueOnce(
      makeResponse({
        success: true,
        data: {
          user: {
            id: repairedId,
            email: 'test@pasawise.com',
            firstName: 'QA',
            lastName: 'Student',
            role: 'student',
          },
        },
      }),
    )

    const user = await fetchCurrentUser()

    expect(user.id).toBe(repairedId)
  })

  it('rejects legacy non-UUID auth identifiers from /api/auth/me', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse({
        success: true,
        data: {
          user: {
            id: 'qa-student-legacy-abc',
            email: 'legacy@example.test',
            firstName: 'Legacy',
            lastName: 'Student',
            role: 'student',
          },
        },
      }),
    )

    await expect(fetchCurrentUser()).rejects.toMatchObject({
      name: 'ApiClientError',
      code: 'INVALID_API_RESPONSE',
    })
  })
})