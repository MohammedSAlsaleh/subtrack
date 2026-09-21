# Subscriptions

**Route:** `/subscriptions` · **File:** `app/(tabs)/subscriptions.tsx`
**Detail route:** `/subscription/:id` · **File:** `app/subscription/[id].tsx`

---

## Overview

The Subscriptions screen lists all recurring services the user pays for. It is the core feature of SubTrack. A connected bank account is required before the list is shown (the screen shows a "Connect a bank" gate otherwise).

---

## Adding a Subscription

Tap the **＋** FAB to open the creation modal. All fields:

| Field | Type | Notes |
|---|---|---|
| **Name** | Text | Service name, e.g. "Netflix" |
| **Category** | Picker | Streaming, Software, Fitness, Food, Gaming, Utilities, Education, Other |
| **Amount** | Number | Base price in SAR |
| **Billing Period** | Picker | Weekly · Monthly · Annual |
| **Start Date** | Date (DD/MM/YYYY) | First charge date |
| **Include VAT** | Toggle | Adds 15% on top of the base amount |
| **Shared** | Toggle | Reveals member count stepper (1–6) |
| **Trial** | Toggle | Marks subscription as a free trial |
| **Trial End Date** | Date (DD/MM/YYYY) | Visible only when Trial is on |

---

## List & Filtering

- **Summary pill** — shows active subscription count and combined monthly spend at the top.
- **Status tabs** — All · Active · Cancelled
- **Category chips** — horizontal scroll of category filters; selecting one narrows the list.
- **Search** — full-text search across subscription names.

---

## Duplicate Detection

SubTrack automatically scans for possible duplicate subscriptions (same service added more than once).

| State | Behaviour |
|---|---|
| **Banner** | A yellow banner appears at the top: "Possible duplicates found — Review" |
| **Review mode** | Tapping "Review" filters the list to only the suspected duplicates |
| **Highlight mode** | A 4-second visual pulse highlights the duplicate cards in the list |
| **Dismiss** | The banner can be dismissed; it reappears if a new duplicate is added |
| **Archive resolution** | A duplicate can be resolved by archiving (cancelling) it directly from the review view |

---

## Subscription Detail Screen

Tap any subscription card to open its full detail view (`/subscription/:id`).

### Hero Section
- Large service icon, name, merchant name, and status badges (category, shared, trial).

### Amount Card (gradient)
- Period amount (e.g. SAR 34.99/month)
- **Share amount** — the user's personal cost when `isShared` is true: `amount / sharedMembers`
- Yearly equivalent: `monthlyAmount × 12`
- Next billing countdown in days

### Controls
| Control | Description |
|---|---|
| Shared member stepper | 1–6 people; updates share cost live |
| Include VAT switch | Adds 15% to displayed amounts |
| Trial switch | Toggles trial state |
| Trial end date input | DD/MM/YYYY; only visible when trial is on |

### Payment History
Up to 4 recent payment entries are shown, derived from the start date and billing cycle.

### Actions
| Action | Description |
|---|---|
| **How to Cancel This** | Opens AI advisor pre-loaded with a cancellation query for this specific service |
| **Mark as Cancelled / Active** | Toggles `status` between `active` and `cancelled` |
| **Remove from SubTrack** | Permanently deletes the subscription after confirmation |

---

## Shared Cost Splitting

When `isShared` is `true`:
- The user specifies how many people share the subscription (1 = just them, up to 6).
- `shareCost = amount / sharedMembers`
- The dashboard and analytics always use `shareCost` for this subscription, never the full amount.
- The AI Advisor also receives `shareCost` rather than the full price.

---

## Trial Tracking

- Subscriptions can be marked as free trials with an end date.
- A **Trial** badge appears on the card and detail screen.
- The end date is displayed in a human-readable relative format (e.g. "Ends in 5 days").
- No automatic cancellation — the app reminds, the user acts.

---

## VAT

Saudi Arabia applies 15% VAT to most digital services. When `includeVat` is toggled on:
- All displayed amounts show the VAT-inclusive price.
- Analytics and totals use the VAT-inclusive figure.
