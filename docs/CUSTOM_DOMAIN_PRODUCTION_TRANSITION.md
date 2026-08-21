# PasaWise Custom Domain Production Transition

## Production origin policy

- Canonical production origin: `https://pasawise.com`
- Temporary transition fallback:
  `https://cse-course-platform.master-course.workers.dev`
- Local development remains `http://localhost:5173` or the explicit local
  origin selected by the developer.

The custom domain is attached to the existing `cse-course-platform` Worker.
Do not redirect, disable, or remove the workers.dev hostname during this
transition. Release output, health checks, QA examples, content publishers, and
teaching publishers use `https://pasawise.com` canonically. Safe Release also
checks the fallback health endpoint so compatibility cannot disappear silently.

Both browser hosts serve the same Worker and D1 data. Browser API calls,
navigation, payment/receipt requests, exam flows, and authentication are
same-origin and use relative paths. No cross-origin API permission is enabled.

## Authentication and cookies

Production authentication cookies are `Secure`, `HttpOnly`,
`SameSite=Lax`, scoped to `Path=/`, and intentionally omit a `Domain`
attribute. A session created on `pasawise.com` is therefore sent only to
`pasawise.com`. The fallback hostname may issue its own host-only cookie while
it remains available; both use the same server-side single-session policy.

Mutation protection compares the browser `Origin` header with the request's
own origin. Same-origin requests on either production hostname work, while a
request from one hostname to the other remains cross-origin and is rejected.

## Google Identity Services

Use one Google Web OAuth client ID through the centralized
`GOOGLE_CLIENT_ID` configuration. Configure these exact Authorized
JavaScript origins:

1. `https://pasawise.com`
2. `https://cse-course-platform.master-course.workers.dev`
3. `http://localhost:5173`

Keep the workers.dev origin until transition testing is formally complete.
This ID-token flow does not require a redirect URI, Google API scopes, or a
Google Client Secret. Never add a client secret to source or Wrangler vars.

## Commercial and registration controls

The domain transition does not change product availability:

- `REGISTRATION_MODE=closed`
- Admin Public Signup OFF
- Show Pricing OFF
- Public Checkout OFF
- Premium Enforcement OFF

No database migration, repair, seed, payment mutation, or content publication
is part of this transition.

## Release and verification

Safe Release validates, commits, pushes, deploys the existing Worker, and checks:

- `https://pasawise.com/api/health`
- `https://cse-course-platform.master-course.workers.dev/api/health`

Both must return HTTP 200 with `success: true` and `data.status: "ok"`.
Post-release smoke checks cover the landing and Login shells, protected learner
and Admin shells, public configuration, security headers, same-origin cookies,
and closed pricing/checkout/registration behavior. Authenticated content or
commercial mutations require a controlled account and are not inferred from a
public HTTP 200 response.
