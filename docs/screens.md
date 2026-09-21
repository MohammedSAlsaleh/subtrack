# Screens Reference

All screens use Expo Router file-based routing. The bottom tab bar is always visible on the main screens.

---

## Tab Screens

| File | Route | Tab label |
|---|---|---|
| `app/(tabs)/index.tsx` | `/` | Dashboard |
| `app/(tabs)/subscriptions.tsx` | `/subscriptions` | Subscriptions |
| `app/(tabs)/bills.tsx` | `/bills` | Bills |
| `app/(tabs)/loans.tsx` | `/loans` | Loans |
| `app/(tabs)/analytics.tsx` | `/analytics` | Analytics |
| `app/(tabs)/banks.tsx` | `/banks` | Banks |
| `app/(tabs)/goals.tsx` | `/goals` | Goals |
| `app/(tabs)/settings.tsx` | `/settings` | Settings |

---

## Stack Screens (pushed modally or via link)

| File | Route | Description |
|---|---|---|
| `app/subscription/[id].tsx` | `/subscription/:id` | Full detail view for a single subscription |
| `app/agent.tsx` | `/agent` | AI financial advisor chat |
| `app/budgets.tsx` | `/budgets` | Category-by-category monthly budget caps |
| `app/premium.tsx` | `/premium` | Premium upgrade / downgrade screen |
| `app/lean-setup.tsx` | `/lean-setup` | Lean Technologies API token setup |

---

## Auth Screens

| File | Route | Description |
|---|---|---|
| `app/auth/index.tsx` | `/auth` | Auth landing (login / register choice) |
| `app/auth/login.tsx` | `/auth/login` | Login form |
| `app/auth/register.tsx` | `/auth/register` | Registration form |

---

## Utility

| File | Route | Description |
|---|---|---|
| `app/+not-found.tsx` | `*` | 404 fallback screen |

---

## Navigation Guards

- **Subscriptions screen** — requires at least one connected bank account before the list is shown; otherwise displays a "Connect a bank" gate.
- **Budgets screen** — wrapped in `<PremiumGate>`; non-premium users see an upgrade prompt instead of the budget list.
- **Bills screen** — wrapped in `<PremiumGate>`.
- **AI Advisor** — wrapped in `<PremiumGate>`.
- **Loans screen** — wrapped in `<PremiumGate>`.
