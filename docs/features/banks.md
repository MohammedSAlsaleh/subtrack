# Bank Connections

**Route:** `/banks` · **File:** `app/(tabs)/banks.tsx`

---

## Overview

The Banks screen connects the user's Saudi bank accounts via **Lean Technologies** open-banking. Linking a bank enables automatic detection of subscriptions and bills from transaction data, and populates the user's verified monthly income.

---

## Connection Flow (Wizard)

### Step 1 — KYC (First connection only)

| Field | Validation |
|---|---|
| **National ID** | Exactly 10 digits |
| **Birth Date** | DD/MM/YYYY format |
| **Consent checkbox** | Must be checked |

Once validated, the KYC data is sent to Lean and `kycCompleted` is set on the user profile. Subsequent bank connections skip this step.

### Step 2 — Fetching Accounts

A 2.2-second simulated fetch (production: live Lean API call) retrieves all accounts linked to the user's National ID. During this step, SubTrack also calls the **Lean income API** to retrieve the user's verified salary and stores it as `income` on the user profile, marked `leanVerifiedAt`.

> **Note:** In the current build, income is simulated deterministically from the NID's last 6 digits, producing a salary in the SAR 8,000–40,000 range. A production build would call the real Lean identity/income endpoint.

### Step 3 — Select Accounts

The user sees all discovered accounts (bank name, account type, last 4 digits). Each is pre-selected; the user can deselect any they don't want to link. A "Select all / Deselect all" toggle is available.

### Step 4 — Connect

Tapping **Connect** adds each selected account to `SubscriptionContext.banks`. Each bank account receives a `leanEntityId` for future API calls.

On the first-ever connection, SubTrack auto-imports a set of sample subscriptions and bills from the connected accounts as a starting point.

---

## Supported Banks (Simulated)

| Bank | Account types |
|---|---|
| Al Rajhi Bank | Current, Savings |
| Saudi National Bank | Current |
| Riyad Bank | Current |
| Alinma Bank | Savings |
| Banque Saudi Fransi | Current |
| Arab National Bank | Current |
| SABB | Current |
| Bank Albilad | Current |

---

## Bank Card

Each connected bank is shown as a card with:
- Bank logo colour (per `BANK_COLORS` palette)
- Account type and last 4 digits
- Number of active subscriptions linked to this account
- **Disconnect** button (removes the bank and unlinks its subscriptions)

---

## Income Verification via Lean

When a bank is connected:
1. The NID is passed to `simulateLeanIncome()` (production: Lean identity/income API).
2. A monthly salary is computed and saved via `saveIncome(salary, true)`.
3. `AuthContext.user.leanVerifiedAt` is set to the current ISO timestamp.
4. In **Settings → Monthly Income**, a **"Lean verified"** badge (🛡️) appears next to the income figure.

Income is always refreshed on connection — it is not guarded by whether income was already set.

---

## Lean App Token

Advanced users and developers can supply a custom **Lean app token** via **Settings → Lean Token** to connect to their own Lean sandbox or production environment.

| Field | Description |
|---|---|
| Token input | Paste the token from the Lean dashboard |
| Customer creation | On save, SubTrack calls `POST /customers/v1/` to create a Lean customer and stores the returned `customer_id` |
| Status badge | "Connected" (if customer ID is present) or "Token saved" |

---

## Privacy

- The National ID and birth date entered during KYC are used only to perform the Lean identity check. They are not stored in AsyncStorage after the wizard completes.
- The Lean app token is stored locally in AsyncStorage under the user profile and never sent to the SubTrack API server.
