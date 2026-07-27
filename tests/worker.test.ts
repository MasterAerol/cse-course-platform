import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/worker/services/database.service', () => ({
  checkDatabaseConnection: vi.fn().mockResolvedValue({
    status: 'ok',
    database: 'connected',
  }),
}))

import { app } from '../src/worker'
import type { Bindings } from '../src/worker/types/bindings'

const unavailableDatabase = null as unknown as D1Database

function createBindings(
  environment: Bindings['ENVIRONMENT'],
): Bindings {
  return {
    DB: unavailableDatabase,
    ENVIRONMENT: environment,
  }
}

describe('Worker API', () => {
  it('returns the standard health response', async () => {
    const response = await app.request(
      '/api/health',
      undefined,
      createBindings('test'),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        status: 'ok',
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
})
