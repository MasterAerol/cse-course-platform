# PasaWise Google Account Registration & Sign-In v1

## Architecture

PasaWise uses the current Google Identity Services browser library and its
official rendered button. The browser sends only Google's ID-token credential
to `POST /api/auth/google`; it never asks for or receives a Google password or
Google API access scope.

The Worker verifies the JWT signature against Google's remote JWKS with
`jose`, and validates the configured audience, either accepted Google issuer,
expiration, issued-at claim, stable `sub`, normalized email, and
`email_verified=true`. Production authentication does not use Google's
`tokeninfo` endpoint.

External identities are stored in `user_identities` with unique
`(provider, provider_subject)` and `(user_id, provider)` constraints.
`provider_subject` stores Google's `sub`; email is not the identity key.

A linked subject signs in even when registration is closed. A new subject can
create a learner only when both `REGISTRATION_MODE=open` and the Admin Public
Signup control are enabled. New Google learners use the normal account,
CSE Professional enrollment, and learner-session transaction. They are
students with FREE access, fresh progress, and no password hash.

A verified-email collision is not automatically linked. The learner must sign
in with the existing password and use Profile & Account to connect a Google
credential with the same verified email. Unlinking is intentionally not
implemented, so the feature cannot remove a learner's last authentication
method.

## Google Cloud configuration

1. In Google Cloud Console, open **Google Auth Platform** for the selected
   project.
2. Configure **Branding** (application name, support email, logo/domain details
   as appropriate) and the external/internal **Audience**. While the app is in
   testing, add the intended Google accounts as test users; publish only after
   the consent configuration is ready.
3. Open **Clients**, create an OAuth client, and choose **Web application**.
4. Add these exact **Authorized JavaScript origins**:
   - `https://pasawise.com`
   - `https://cse-course-platform.master-course.workers.dev`
   - `http://localhost:5173`
5. Redirect URIs are not required for this popup ID-token flow.
6. Copy the Web client ID. No Google client secret is used.

For local development, copy `.dev.vars.example` to the ignored `.dev.vars`
file. The public Web client ID is already configured for the authorized
`http://localhost:5173` origin.

Production and local development use this single public Web client ID from the
centralized `vars` object in `wrangler.jsonc`:

```json
"GOOGLE_CLIENT_ID": "247375246816-10qnqrcf5c2sarc6gvbpdbtdocbs5p1o.apps.googleusercontent.com"
```

Wrangler configuration is the production source of truth. Do not add or expose
a Google client secret. The public `/api/config` response intentionally sends
the client ID to the browser so Google Identity Services can initialize.

## Migration and release approval

Migration `0018_google_account_authentication.sql`:

- changes `users.password_hash` to nullable in place, avoiding a parent-table
  rebuild that could cascade into dependent records;
- preserves existing user IDs, password hashes, timestamps, learner session
  generations, activity timestamps, and foreign-key relationships;
- creates `user_identities` and its uniqueness constraints.

Before any production release:

1. Create the Google Web OAuth client and supply its client ID.
2. Add that ID to `wrangler.jsonc` as described above and regenerate/check
   Worker types.
3. Review and explicitly approve remote migration `0018`.
4. Take/verify the normal D1 recovery backup required by the release runbook.
5. Apply the migration remotely using the approved migration workflow
   (`npm.cmd run db:migrate:remote`).
6. Run Safe Release for the code only after migration success.
7. Verify Login with an already-linked test learner before changing any signup
   controls.

Keep these production controls unchanged during the release:

- `REGISTRATION_MODE=closed`
- Public Signup OFF
- Show Pricing OFF
- Public Checkout OFF
- Premium Enforcement OFF

The Google button may sign in an already-linked learner under these controls,
but it cannot create a new public learner until both registration gates are
explicitly opened later.
