# Architecture

## Monorepo Layout

SubTrack is a pnpm workspace monorepo. Each directory under `artifacts/` is an independent package with its own `package.json`.

```
/
├── artifacts/
│   ├── mobile/          # Expo React Native app (@workspace/mobile)
│   ├── api-server/      # Fastify REST API + AI proxy (@workspace/api-server)
│   ├── subtrack-deck/   # Pitch deck slides artifact
│   └── mockup-sandbox/  # Component preview server (dev only)
├── packages/
│   └── db/              # Shared Drizzle ORM schema + migrations (@workspace/db)
├── docs/                # This documentation
└── pnpm-workspace.yaml
```

---

## Mobile App (`artifacts/mobile/`)

**Framework:** Expo SDK 53 · React Native · Expo Router (file-based routing)

### Directory Structure

```
artifacts/mobile/
├── app/
│   ├── (tabs)/          # Bottom-tab screens (index, subscriptions, banks, analytics, settings, …)
│   ├── auth/            # Login, register screens
│   ├── subscription/    # [id].tsx — subscription detail
│   ├── agent.tsx        # AI advisor chat
│   ├── budgets.tsx      # Category budget caps
│   ├── lean-setup.tsx   # Lean bank-connection wizard
│   └── premium.tsx      # Premium upgrade screen
├── components/          # Shared UI components
├── context/             # React context providers (state management)
├── hooks/               # Custom hooks
├── locales/             # en.ts · ar.ts translation strings
└── assets/              # Icons, splash, fonts
```

### State Management

All app state is managed via React Context + AsyncStorage (local-first). There is no Redux or Zustand.

| Context | Responsibility |
|---|---|
| `AuthContext` | User profile, login/logout, Lean tokens, income, premium status |
| `SubscriptionContext` | Subscriptions list, connected banks, `monthlyTotal` |
| `BillsContext` | Recurring bills |
| `LoanContext` | Credit cards, BNPL, personal loans |
| `GoalsContext` | Savings goals and contribution history |
| `BudgetContext` | Per-category spending caps |
| `LanguageContext` | Active language (`en`/`ar`), `t()` translation function, `isRTL` flag |
| `ThemeContext` | Theme override (`system`/`light`/`dark`), `resolvedScheme` |

### Data Persistence

- **Local:** All financial data (subscriptions, bills, loans, goals, budgets) is stored in AsyncStorage on-device. No network request is required to use the app.
- **Cloud sync:** When a user registers and logs in, their profile (name, email, premium status) is synced with the API server. Financial data itself is not synced to the cloud in the current version.

---

## API Server (`artifacts/api-server/`)

**Framework:** Node.js · Fastify · Drizzle ORM · PostgreSQL

```
artifacts/api-server/src/
├── routes/
│   ├── auth.ts      # Register, login, profile
│   ├── premium.ts   # Premium entitlement check / grant / revoke
│   ├── agent.ts     # AI advisor SSE streaming endpoint
│   └── health.ts    # Health check
├── middlewares/
│   └── jwtAuth.ts   # Bearer token validation
└── index.ts         # Server entry point
```

### External Services

| Service | Purpose |
|---|---|
| OpenAI GPT-4o | AI advisor responses (via Replit AI Integrations proxy) |
| Lean Technologies | Open-banking: bank account connection, income verification |
| PostgreSQL | User accounts and premium entitlements |

---

## Database (`packages/db/`)

Shared schema package used by the API server via Drizzle ORM.

### Tables

| Table | Purpose |
|---|---|
| `server_users` | Identity: email (PK), password hash, display name, device user ID |
| `premium_entitlements` | Premium status: email (PK), `is_premium`, `granted_at`, `updated_at` |

---

## Request Flow

```
Mobile App (Expo)
      │
      │  HTTPS (REST + SSE)
      ▼
API Server (Fastify)          ←──── JWT middleware on protected routes
      │
      ├──── PostgreSQL (Drizzle ORM)
      │
      └──── OpenAI API (AI advisor)  ←── Replit AI Integrations proxy
```

---

## Environment Variables

| Variable | Where set | Purpose |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Mobile (development + production) | Base URL for API calls — ends in `/api` |
| `SESSION_SECRET` | API server | JWT signing secret |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | API server | OpenAI proxy key |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | API server | OpenAI proxy base URL |
| `DATABASE_URL` | API server | PostgreSQL connection string |
