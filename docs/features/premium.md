# Premium

**Route:** `/premium` · **File:** `app/premium.tsx`

---

## Overview

SubTrack uses a freemium model. The core dashboard and subscription tracking are free. Premium unlocks all advanced financial management features for **SAR 14.99 / month**.

---

## Free vs. Premium

| Feature | Free | Premium |
|---|---|---|
| Dashboard & spending summary | ✅ | ✅ |
| Subscription tracking | ✅ | ✅ |
| Bank connections via Lean | ✅ | ✅ |
| Savings Goals | ✅ | ✅ |
| Analytics & charts | ✅ | ✅ |
| **Bills & Reminders** | ❌ | ✅ |
| **Category Budgets** | ❌ | ✅ |
| **AI Budget Advisor** | ❌ | ✅ |
| **Loans & Debt Tracker** | ❌ | ✅ |

---

## Premium Screen

The upgrade screen displays:
- A dark hero card with animated gradient orbs
- A bulleted feature comparison list
- Current price: **SAR 14.99 / month**
- **Activate Premium** CTA button
- **Restore Purchase** link (for users who subscribed on another device)

If the user is already premium, the screen shows an **Active** badge and a **Downgrade** option instead.

---

## PremiumGate Component

Any screen or section that requires premium is wrapped in `<PremiumGate>`. Non-premium users see a styled upgrade prompt with a **"Unlock Premium"** button instead of the feature content.

The gate overlays correctly above the bottom navigation bar using `useSafeAreaInsets` (native: `insets.bottom + 80`; web: `100`).

---

## Granting & Restoring Premium

### In-app upgrade
Tapping **Activate Premium** calls `AuthContext.upgradeToPremium()`, which:
1. Sends `POST /api/premium/:email` (requires JWT).
2. On success, sets `user.isPremium = true` in AsyncStorage.

### Restore
Tapping **Restore Purchase** calls `AuthContext.restorePremium()`, which:
1. Calls `GET /api/premium/:email`.
2. If `isPremium: true` is returned, updates local state.
3. Returns a boolean — the screen shows a success or "no active subscription" alert accordingly.

### Dev-only grant/revoke
`POST /api/premium/:email` and `DELETE /api/premium/:email` are disabled in production (return `403`). They are only usable in the development environment.
