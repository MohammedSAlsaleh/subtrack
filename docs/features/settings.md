# Settings

**Route:** `/settings` · **File:** `app/(tabs)/settings.tsx`

---

## Overview

Settings is the control centre for account management, financial profile, app preferences, data export, and Lean integration. It is organised into labelled sections.

---

## Profile

Displays the user's name, email, and account type (Guest / Registered). If not logged in, a **Sign in / Register** button is shown.

---

## Financial Profile

### Monthly Income

| State | Display |
|---|---|
| Not set | "Tap to set your income" |
| Set manually | Shows SAR amount + "Set manually" subtitle |
| Lean verified | Shows SAR amount + 🛡️ **"Lean verified"** badge |

Tapping the row opens an income edit modal. Enter a SAR amount and tap **Save**. Manual saves do not set `leanVerifiedAt`.

An information banner is shown inside the modal when income is Lean-verified:
> "Auto-filled from Lean · You can override this at any time"

---

## Premium

| Row | Action |
|---|---|
| SubTrack Premium | Opens `/premium` |
| Restore Purchase | Calls the restore flow and shows an alert with the result |

---

## Appearance

**Theme** toggle with three options:

| Option | Behaviour |
|---|---|
| System | Follows the device's system light/dark setting |
| Light | Forces light mode |
| Dark | Forces dark mode |

---

## Language & Region

| Setting | Options |
|---|---|
| Language | 🇬🇧 English · 🇸🇦 Arabic |
| Region | KSA (fixed) |
| Currency | SAR (fixed) |

Switching language instantly re-renders all screens in the selected language and flips the layout direction to RTL for Arabic.

---

## Lean Token

For users with a custom Lean app token (developers / advanced users):

1. Tap **Lean Token** to open the token modal.
2. Paste the token from the Lean developer dashboard.
3. Tap **Save** — SubTrack calls `POST /customers/v1/` to create a Lean customer and stores the `customer_id`.
4. The row shows a status badge: **Connected** (customer ID present) or **Token saved**.

---

## Export

Tap **Export Data** to open the export preview modal.

### Export Preview Modal

Shows a summary of what will be exported:

| Section | Items counted |
|---|---|
| Subscriptions | Active + cancelled |
| Bills | All bills |
| Loans | All loans |
| Goals | All goals |

Tapping **Export CSV** generates a comma-separated file containing all items across all categories and opens the native **Share sheet** (iOS share dialog / Android send sheet). The file can be saved to Files, emailed, or sent to any app.

A **count badge** on the Export row shows the total number of items at a glance without opening the modal.

---

## Data Management

### Clear All Data

Tap **Clear All Data** to permanently delete:
- All subscriptions (and linked banks)
- All bills
- All loans
- All budgets
- All goals

A confirmation alert must be accepted before deletion. The app resets to its empty state immediately — no restart required. Goals and budget caps disappear without needing to navigate away.

---

## About

Shows the app version number and build number.
