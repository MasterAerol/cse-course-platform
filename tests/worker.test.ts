import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/worker/services/database.service', () => ({
  checkDatabaseConnection: vi.fn().mockResolvedValue({
    status: 'ok',
    database: 'connected',
  }),
}))

import { app } from '../src/worker'
import { checkDatabaseConnection } from '../src/worker/services/database.service'
import type { Bindings } from '../src/worker/types/bindings'

const unavailableDatabase = null as unknown as D1Database
const checkDatabaseConnectionMock = vi.mocked(checkDatabaseConnection)

function createBindings(
  environment: Bindings['ENVIRONMENT'],
): Bindings {
  return {
    DB: unavailableDatabase,
    ENVIRONMENT: environment,
  }
}

describe('Worker API', () => {
  beforeEach(() => {
    checkDatabaseConnectionMock.mockResolvedValue({
      status: 'ok',
      database: 'connected',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the standard health response', async () => {
    const response = await app.request(
      '/api/health',
      undefined,
      createBindings('production'),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('x-request-id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        status: 'ok',
      },
    })
  })

  it('returns a consistent not-found response with a matching request ID', async () => {
    const response = await app.request(
      '/api/missing',
      undefined,
      createBindings('production'),
    )
    const requestId = response.headers.get('x-request-id')
    const body: unknown = await response.json()

    expect(response.status).toBe(404)
    expect(requestId).toBeTruthy()
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'NOT_FOUND',
        requestId,
        details: null,
      },
    })
  })

  it('keeps the database check unavailable outside development', async () => {
    const response = await app.request(
      '/api/dev/database-check',
      undefined,
      createBindings('production'),
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'NOT_FOUND',
      },
    })
  })

  it('runs the database check in development', async () => {
    const response = await app.request(
      '/api/dev/database-check',
      undefined,
      createBindings('development'),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        status: 'ok',
        database: 'connected',
      },
    })
  })

  it('does not expose internal errors from the database check', async () => {
    const internalMessage = 'sensitive database failure'
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    checkDatabaseConnectionMock.mockRejectedValueOnce(
      new Error(internalMessage),
    )

    const response = await app.request(
      '/api/dev/database-check',
      undefined,
      createBindings('development'),
    )
    const responseText = await response.text()
    const body: unknown = JSON.parse(responseText)

    expect(response.status).toBe(500)
    expect(responseText).not.toContain(internalMessage)
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
        requestId: response.headers.get('x-request-id'),
        details: null,
      },
    })
    expect(consoleError).toHaveBeenCalledOnce()
  })
})
