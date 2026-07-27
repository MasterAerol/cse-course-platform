import type { Context } from 'hono'
import { deleteCookie, setCookie } from 'hono/cookie'

import type { AppEnv } from '../types/app'

export const AUTH_COOKIE_NAME = 'cse_session'

export function setAuthenticationCookie(
  context: Context<AppEnv>,
  token: string,
  expiresAt: Date,
): void {
  setCookie(context, AUTH_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: context.env.ENVIRONMENT === 'production',
    sameSite: 'Lax',
    expires: expiresAt,
    maxAge: Math.max(
      0,
      Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    ),
    priority: 'High',
  })
}

export function clearAuthenticationCookie(
  context: Context<AppEnv>,
): void {
  deleteCookie(context, AUTH_COOKIE_NAME, {
    path: '/',
    secure: context.env.ENVIRONMENT === 'production',
  })
}
