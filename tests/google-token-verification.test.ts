import {
  generateKeyPair,
  SignJWT,
  type CryptoKey,
  type JWTVerifyGetKey,
} from 'jose'
import { beforeAll, describe, expect, it } from 'vitest'

import { verifyGoogleIdToken } from '../src/worker/auth/google'

const CLIENT_ID = 'pasawise-test.apps.googleusercontent.com'
const NOW = new Date('2026-08-21T06:00:00.000Z')
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000)

let privateKey: CryptoKey
let publicKey: CryptoKey
let otherPrivateKey: CryptoKey

beforeAll(async () => {
  const primary = await generateKeyPair('RS256')
  const other = await generateKeyPair('RS256')
  privateKey = primary.privateKey
  publicKey = primary.publicKey
  otherPrivateKey = other.privateKey
})

function testKeySet(key: CryptoKey = publicKey): JWTVerifyGetKey {
  return () => key
}

async function credential(input: {
  audience?: string
  emailVerified?: boolean
  expiresAt?: number
  issuer?: string
  signingKey?: CryptoKey
  subject?: string
} = {}): Promise<string> {
  return new SignJWT({
    email: '  Learner@Gmail.com ',
    email_verified: input.emailVerified ?? true,
    given_name: 'Ana',
    family_name: 'Ilagan',
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'pasawise-test' })
    .setIssuer(input.issuer ?? 'https://accounts.google.com')
    .setAudience(input.audience ?? CLIENT_ID)
    .setSubject(input.subject ?? 'google-subject-123')
    .setIssuedAt(NOW_SECONDS)
    .setExpirationTime(input.expiresAt ?? NOW_SECONDS + 300)
    .sign(input.signingKey ?? privateKey)
}

async function expectRejected(token: string): Promise<void> {
  await expect(
    verifyGoogleIdToken(token, CLIENT_ID, testKeySet(), NOW),
  ).rejects.toMatchObject({
    status: 401,
    code: 'GOOGLE_CREDENTIAL_INVALID',
  })
}

describe('Google ID-token verification', () => {
  it('cryptographically verifies a valid Google ID token and normalizes identity data', async () => {
    await expect(
      verifyGoogleIdToken(await credential(), CLIENT_ID, testKeySet(), NOW),
    ).resolves.toEqual({
      subject: 'google-subject-123',
      email: 'learner@gmail.com',
      firstName: 'Ana',
      lastName: 'Ilagan',
    })
  })

  it('rejects a bad signature', async () => {
    await expectRejected(await credential({ signingKey: otherPrivateKey }))
  })

  it('rejects the wrong audience', async () => {
    await expectRejected(await credential({ audience: 'another-client' }))
  })

  it('rejects a non-Google issuer', async () => {
    await expectRejected(await credential({ issuer: 'https://issuer.example' }))
  })

  it('rejects an expired credential', async () => {
    await expectRejected(await credential({ expiresAt: NOW_SECONDS - 1 }))
  })

  it('requires a verified email', async () => {
    await expectRejected(await credential({ emailVerified: false }))
  })

  it('requires the stable Google subject identifier', async () => {
    await expectRejected(await credential({ subject: '' }))
  })
})
