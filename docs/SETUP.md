# Installation and setup

[Back to SubTrack](../README.md)

Run the Expo app and Express API locally with a dedicated PostgreSQL development database. All commands below run from the repository root.

## Prerequisites

- **Node.js 24 and pnpm 10**, matching this repository’s CI configuration.
- **Git** to clone the source.
- **PostgreSQL**, with a development database and a user allowed to create tables.
- **AI provider credentials**: the server initializes its AI integration at startup.

The commands use a POSIX shell (macOS, Linux, or WSL on Windows). The API development script uses shell syntax that does not run unchanged in native PowerShell. On Windows, keep the repository and tools inside WSL.

## 1. Install dependencies

```bash
git clone https://github.com/MohammedSAlsaleh/subtrack.git
cd subtrack
npm install --global pnpm@10.34.5
node --version
pnpm --version
pnpm install --frozen-lockfile
```

Skip the pnpm installation command if version 10 is already installed. Use pnpm for this workspace; the preinstall script rejects other package managers. Preserve the committed lockfile.

## 2. Prepare the database

Create an empty development database named `subtrack`. With local PostgreSQL client tools and an account that has database-creation privileges:

```bash
createdb subtrack
```

Alternatively, create a development database through your hosting provider and use its connection string. Follow the provider’s TLS requirements.

## 3. Configure the API environment

Set these variables in the terminal that will start the API. Replace every angle-bracket placeholder with your own value.

```bash
export PORT=3001
export DATABASE_URL='postgresql://<user>:<password>@localhost:5432/subtrack'
export SESSION_SECRET='<a long randomly generated secret>'
export AI_INTEGRATIONS_OPENAI_BASE_URL='<provider API base URL>'
export AI_INTEGRATIONS_OPENAI_API_KEY='<provider API key>'
```

Generate a suitable session secret locally with `openssl rand -hex 32`, then use its output as `SESSION_SECRET`. Keep it stable between restarts; changing it invalidates existing tokens. Encode reserved characters in database credentials when constructing the connection URL.

| Variable | Purpose |
| --- | --- |
| `PORT` | API listening port; this guide uses 3001 |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Authentication token signing |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI-compatible provider endpoint |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | Server-side provider credential |

Both AI variables are required at startup, even if you do not open the advisor screen. The advisor currently requests `gpt-5.6-luna` in `artifacts/api-server/src/routes/agent.ts`. Your provider must support that model, or the server must be adapted to a supported model. Replit integration credentials are not automatically available outside Replit.

These instructions explicitly export variables. Creating an `.env` file alone does not guarantee that the API scripts load it. Keep credentials outside Git and never put secrets in `EXPO_PUBLIC_*` variables.

### Get an OpenAI API key

For a direct OpenAI connection:

1. Sign in to the [OpenAI API platform](https://platform.openai.com/).
2. Open [API keys](https://platform.openai.com/api-keys), choose the intended project, and create a secret key. Save it privately.
3. Check your project’s API billing and available credits before making a request. A key alone does not guarantee available quota.
4. Use `https://api.openai.com/v1` as the base URL. This is a public address, not an account-specific secret.

See the [official OpenAI quickstart](https://developers.openai.com/api/docs/quickstart) for API key setup.

### Store credentials in a local file

A fresh clone intentionally contains no `.env` file. Create a file named **`.env` in the repository root**, beside `package.json`, and add:

```dotenv
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
AI_INTEGRATIONS_OPENAI_API_KEY=replace-with-your-own-secret-key
```

Replace the placeholder in your local editor. Do not paste a real key into the README, GitHub issues, screenshots, or chat. Confirm the file is ignored with `git check-ignore .env`; it should print `.env`. Never force-add this file to Git.

This file holds the two AI settings only. Keep the database, port, and session-secret exports from step 3 in the API terminal. To explicitly load the root `.env` with Node.js 24, build and start the server from the repository root:

```bash
pnpm --filter @workspace/api-server run build
node --env-file=.env --enable-source-maps artifacts/api-server/dist/index.mjs
```

Use these commands instead of the API `run dev` command in step 4 when your AI credentials are stored in `.env`. Existing exported environment variables take precedence over values in the file; clear stale AI exports if you intend to use the file’s values.

For Replit’s built-in AI integration, use the base URL and credentials configured by that integration, rather than assuming its key works with the direct OpenAI URL. Keep deployment secrets in the hosting environment’s secret settings.

### AI connection troubleshooting

| Error | What to check |
| --- | --- |
| Missing AI environment variable | Fill both settings and start the server with the explicit `.env` loading command above |
| Invalid API key / HTTP 401 | Verify the key belongs to the selected provider and has the necessary permissions |
| `credit_balance_exhausted` / HTTP 429 | Check API billing and replenish the available balance before retrying |
| Other HTTP 429 errors | Inspect the provider error code; request-rate limits and exhausted quota require different remedies |
| Model unavailable | Confirm your project can access the model configured in the advisor route |

## 4. Initialize the schema and start the API

In the terminal with the API environment configured:

```bash
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run dev
```

The schema command modifies the database selected by `DATABASE_URL`. Use a dedicated development database and review any proposed changes. The API development command builds the server, starts it, and checks database connectivity. Leave this terminal running.

From another terminal:

```bash
curl http://localhost:3001/api/healthz
curl http://localhost:3001/api/health
```

The liveness endpoint should return `{"status":"ok"}`. The readiness endpoint should report `status: "ok"` and `db: "reachable"`, along with connection statistics. Readiness confirms connectivity, not that every application table exists.

## 5. Start the app

Open a second terminal in the repository root:

```bash
export EXPO_PUBLIC_API_URL='http://localhost:3001/api'
pnpm --filter @workspace/mobile exec expo start --web --port 8081
```

Open the web URL printed by Expo. **The API URL must end with `/api`** because the client appends routes such as `/auth/login`.

For native development, omit `--web`:

```bash
pnpm --filter @workspace/mobile exec expo start --port 8081
```

Use an Expo-compatible simulator, emulator, or device workflow. On a physical phone, replace `localhost` in the API URL with your computer’s reachable LAN address. Allow the API port through your local firewall. Emulators may also need a host address instead of `localhost`.

Restart Expo after changing public environment variables; add `--clear` if cached configuration persists. The existing mobile `run dev` script assumes Replit proxy and host variables, so use the direct Expo commands above for local development.

## 6. Verify the setup

- Navigate between the dashboard and subscriptions.
- Register a development account and sign in to exercise API/database integration.
- Check the API terminal for connection or missing-table errors.
- Test the advisor after configuring provider access to the requested model. Provider requests may incur usage charges.

A fresh installation may display different data or empty states compared with the deployed screenshots. This repository contains no production database export. Some features require Premium, and bank linking includes simulated behavior.

## Development commands

| Command | Purpose |
| --- | --- |
| `pnpm --filter @workspace/api-server test` | API test suite used by CI |
| `pnpm run typecheck` | Workspace TypeScript checks |
| `pnpm --filter @workspace/mobile run build` | Export the web app to the mobile package’s `dist/` directory |
| `pnpm --filter @workspace/api-server run build` | Build the API |

## Troubleshooting

| Symptom | Resolution |
| --- | --- |
| Package manager rejected | Run pnpm 10 from the repository root |
| Frozen-lockfile install fails | Check the pnpm version and reported mismatch before modifying the lockfile |
| Missing environment variable | Export it in the same terminal used to start the API |
| Database connectivity failure | Check credentials, host, port, database availability, and TLS settings |
| Missing database tables | Apply the schema to the same database used by the API |
| Authentication routes return 404 | Ensure the client API URL ends in `/api` |
| Phone cannot reach the API | Use a reachable computer address instead of phone-local `localhost` |
| Advisor provider/model errors | Check provider URL, key, and access to the configured model |
| Port already in use | Choose an available port and update the API URL accordingly |
| Expo references Replit domains | Use the direct Expo command in step 5 |

## Validation scope

The frozen-lockfile install, API tests, workspace type checks, mobile regression scripts, API build, and web export are validated locally on macOS ARM64 with Node.js 24 and pnpm 10.34.5. API tests use local placeholder AI configuration; they do not require real provider credentials. CI also checks tests and types on Linux and macOS. Real database provisioning, registration/login against PostgreSQL, and live AI responses remain unverified. Production deployment requires separate configuration and review.
