import { describe, expect, it, vi } from 'vitest'

import { findUniqueBySlug, planAnalyticalSubject, rollbackStatusChanges } from '../scripts/logical-reasoning-publisher-helpers.mjs'

describe('logical-reasoning publisher safeguards', () => {
  it('plans subject creation immediately after Numerical Ability', () => {
    expect(planAnalyticalSubject([{ slug: 'numerical-ability', position: 1 }], 1)).toEqual({ existing: null, requiredPosition: 2 })
  })

  it('reuses the existing Analytical Ability subject without changing identity', () => {
    const subject = { id: 42, publicId: 'stable-id', slug: 'analytical-ability', position: 2 }
    expect(planAnalyticalSubject([subject], 1)).toEqual({ existing: subject, requiredPosition: 2 })
    expect(findUniqueBySlug([subject], 'analytical-ability', 'subject')).toBe(subject)
  })

  it('rejects duplicate subject or topic slugs instead of choosing one', () => {
    expect(() => planAnalyticalSubject([{ slug: 'analytical-ability' }, { slug: 'analytical-ability' }], 1)).toThrow('Duplicate')
    expect(() => findUniqueBySlug([{ slug: 'topic' }, { slug: 'topic' }], 'topic', 'topic')).toThrow('Duplicate')
  })

  it('rolls status changes back in reverse publication order and continues after an error', async () => {
    const order: number[] = []
    const onError = vi.fn()
    await rollbackStatusChanges([
      () => { order.push(1); return Promise.resolve() },
      () => { order.push(2); return Promise.reject(new Error('rollback failure')) },
      () => { order.push(3); return Promise.resolve() },
    ], onError)
    expect(order).toEqual([3, 2, 1])
    expect(onError).toHaveBeenCalledOnce()
  })
})
