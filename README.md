# CSE Course Platform

Milestone 0 foundation for a Civil Service Examination learning platform. The
repository combines a React single-page application, a Hono API, and Cloudflare
D1 in one Cloudflare Worker deployment.

This milestone intentionally contains no authentication, course pages, admin
screens, quizzes, payments, or R2 integration.

## Architecture

```text
Browser
  ├── React + TypeScript SPA
  └── fetch /api/*
          └── Hono Worker
                ├── routes
                ├── services
                ├── repositories
                └── Cloudflare D1 (DB binding)
```

- Vite and the Cloudflare Vite plugin run the frontend and Worker together.
- Wrangler deploys the Worker and `dist/client` static assets as one unit.
- `/api/*` requests run through Hono before the SPA asset fallback.
- SQL is isolated in repository modules and always uses D1 prepared statements.
- `ENVIRONMENT` controls access to development-only routes.

## Prerequisites

- Node.js 20.19 or newer
- npm 10 or newer
- A Cloudflare account for remote D1 and deployment
- Wrangler authentication for remote commands

Check the local tool versions:

```bash
node --version
npm --version
```

## Installation

```bash
git clone <repository-url>
cd cse-course-platform
npm install
```

Generate binding types after installing packages:

```bash
npm run cf-typegen
```

## Local development

Create the local Worker variable file:

PowerShell:

```powershell
Copy-Item .dev.vars.example .dev.vars
```

macOS or Linux:

```bash
cp .dev.vars.example .dev.vars
```

Apply the schema to the local D1 database:

```bash
npm run db:migrate:local
```

Start the integrated Vite and Workers development server:

```bash
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

Available foundation endpoints:

- `GET /api/health` returns the public health response.
- `GET /api/dev/database-check` runs `SELECT 1` through the D1 repository. It
  returns 404 unless `ENVIRONMENT=development`.

Local D1 state is stored under `.wrangler/` and is intentionally ignored by
Git.

## D1 creation

Authenticate Wrangler:

```bash
npx wrangler login
```

Create the production database:

```bash
npx wrangler d1 create cse-course-platform
```

Wrangler prints the database binding configuration, including a generated
`database_id`.

## D1 binding setup

The Worker expects a binding named `DB`. Replace the placeholder
`database_id` in `wrangler.jsonc` with the ID returned by `wrangler d1 create`:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "cse-course-platform",
      "database_id": "<cloudflare-d1-database-id>",
      "migrations_dir": "migrations"
    }
  ]
}
```

Keep the binding name as `DB`; application code accesses D1 as `env.DB`.

## Migrations

Migration files live in `migrations/` and are applied in filename order.

Apply all pending migrations to the local database:

```bash
npm run db:migrate:local
```

Apply all pending migrations to the remote database:

```bash
npm run db:migrate:remote
```

Remote migrations require Wrangler authentication and a real D1
`database_id`. Review migration output before confirming changes to a
production database.

Create future migrations with sequential names rather than modifying a
migration that has already been applied:

```bash
npx wrangler d1 migrations create DB descriptive_name
```

## Cloudflare binding type generation

Generate `worker-configuration.d.ts` from `wrangler.jsonc`:

```bash
npm run cf-typegen
```

Run this command again whenever Worker bindings or variables change. The Worker
also uses the focused `Bindings` interface in
`src/worker/types/bindings.ts`, so binding use remains explicit at application
boundaries.

## Quality checks

Run each locally testable check:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The production build writes client assets and Worker output beneath `dist/`.

## Deployment

Before deploying:

1. Log in with `npx wrangler login`.
2. Create the D1 database.
3. Replace the placeholder D1 `database_id` in `wrangler.jsonc`.
4. Apply remote migrations with `npm run db:migrate:remote`.

Build and deploy:

```bash
npm run deploy
```

Wrangler uploads the Hono Worker and Vite client assets together. The production
configuration sets `ENVIRONMENT=production`, so the database-check route
remains unavailable.

## npm scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start React and the Worker in the integrated local runtime |
| `npm run build` | Type-check and create the production bundle |
| `npm run deploy` | Build and deploy with Wrangler |
| `npm run typecheck` | Check strict TypeScript projects |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest once |
| `npm run cf-typegen` | Generate Cloudflare binding declarations |
| `npm run db:migrate:local` | Apply pending migrations to local D1 |
| `npm run db:migrate:remote` | Apply pending migrations to remote D1 |

## API response conventions

Successful endpoints return:

```json
{
  "success": true,
  "data": {}
}
```

Errors return a safe request identifier without database errors or stack
traces:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred.",
    "requestId": "generated-request-id",
    "details": null
  }
}
```

## Official references

- [Cloudflare Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare React and Vite guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/)
- [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Hono on Cloudflare Workers](https://hono.dev/docs/getting-started/cloudflare-workers)
