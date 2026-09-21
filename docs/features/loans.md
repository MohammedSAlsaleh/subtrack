# Loans & Debt Tracker

**Route:** `/loans` · **File:** `app/(tabs)/loans.tsx`
**Premium:** Yes — wrapped in `<PremiumGate>`

---

## Overview

The Loans screen tracks all forms of debt: credit cards, BNPL (Buy Now Pay Later) plans, personal loans, and any other obligation. It shows current balances, repayment progress, and a **Payoff Simulator** to model extra payments.

---

## Supported Loan Types

| Type | Key behaviour |
|---|---|
| **Credit Card** | Shows credit utilisation (`currentBalance / creditLimit`); APR-based interest accrual |
| **BNPL** | Zero-interest instalment tracking (e.g. Tabby, Tamara); shows paid vs. remaining instalments |
| **Personal Loan** | APR-based; standard amortisation payoff projection |
| **Other** | Generic APR-based tracking |

---

## Adding a Loan

Tap **＋** to open the creation modal.

| Field | Type | Applies to |
|---|---|---|
| **Name** | Text | All |
| **Lender** | Text | All |
| **Type** | Picker | All |
| **Current Balance** | Number (SAR) | All |
| **Original Amount** | Number (SAR) | Personal, BNPL |
| **Credit Limit** | Number (SAR) | Credit Card |
| **APR** | Number (%) | Credit Card, Personal |
| **Minimum Payment** | Number (SAR) | Credit Card, Personal |
| **Next Due Date** | Date | All |
| **Installment Amount** | Number (SAR) | BNPL |
| **Total Instalments** | Number | BNPL |
| **Paid Instalments** | Number | BNPL |

---

## Loan Card

Each loan card shows:
- Loan name, lender, and type badge
- Current balance and (for credit cards) credit limit
- **Progress bar**: credit utilisation for cards; repayment progress for instalment loans
- **Next Payment** countdown (days until `nextDueDate`)
- Monthly minimum payment amount

---

## Payoff Simulator

Tap **Payoff Simulator** on any loan card (available for APR-based loans) to open the simulation sheet.

### Inputs
- **Extra monthly payment** — SAR amount above the minimum

### Outputs

| Output | Description |
|---|---|
| **Months to payoff** | Projected months until balance reaches zero |
| **Payoff date** | Projected calendar date |
| **Total interest saved** | Difference in interest paid vs. minimum-only path |
| **Interactive chart** | SVG line chart showing balance trajectory over time |

### Edge cases
- If the monthly payment is **less than the monthly interest**, the simulator displays a "Never payoff" warning — the balance would grow indefinitely.
- BNPL loans (0% APR) use a simple instalment division: `remaining instalments × instalment amount`.
- Projections are capped at **50 years (600 months)** to avoid runaway calculations.

### Share Payoff Plan

Tapping **Share** on the simulator captures the payoff chart as an image and opens the native share sheet. The payoff date is localised to the app's active language.

---

## Aggregate View

At the top of the Loans screen:
- **Total outstanding debt** — sum of all `currentBalance` values
- **Total monthly obligations** — sum of all minimum payments / instalment amounts

---

## Integration

- Loan minimum payments feed into the **Total Monthly Outflow** on the Dashboard.
- The AI Advisor receives the full loan list including balance, APR, and type.
- Analytics includes loan payments in the monthly spend breakdown.
