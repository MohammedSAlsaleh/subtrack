# Analytics

**Route:** `/analytics` · **File:** `app/(tabs)/analytics.tsx`

---

## Overview

The Analytics screen gives users a visual breakdown of where their money goes — by category, by month, and relative to their income. All data is derived from the subscriptions, bills, and loans stored on-device; no server call is made.

---

## Spending by Category (Donut Chart)

An SVG donut chart shows each spending category as a proportional arc. Tapping a segment highlights it and shows the exact SAR amount and percentage share.

Categories included: Streaming · Software · Fitness · Food · Gaming · Utilities · Education · Other · Rent · Insurance · Phone · Internet · Loans.

The center of the donut shows total monthly outflow.

---

## Monthly Spend Trend (Bar Chart)

A 6-month bar chart plots total monthly spend for each of the past six months. Data comes from `useMonthlySnapshots`, which reconstructs historical totals from current subscription start dates and billing cycles.

- Hovering / tapping a bar shows the exact month and total.
- The current month bar is accent-coloured; past months are muted.

---

## Subscription Creep Score

Tracks the percentage growth in subscription spending over the past 3 months.

| Score | Label | Colour |
|---|---|---|
| < 5% growth | Stable | Green |
| 5–15% growth | Creeping | Amber |
| > 15% growth | Creeping fast | Red |

This helps users notice gradual subscription cost increases they might not have spotted month-to-month.

---

## Savings Rate

When the user has a monthly income set, the Savings Rate gauge is displayed.

```
Savings Rate = (income − totalMonthlyOutflow) / income × 100
```

| Rate | Label | Colour |
|---|---|---|
| ≥ 20% | Healthy | Green |
| 10–19% | Fair | Amber |
| < 10% | Low | Red |
| Negative | Over budget | Deep red |

A sparkline below the gauge shows savings rate trend across the last 6 months.

If income is not set, a **"Set Income"** prompt is shown in place of the gauge, with a link to Settings.

---

## Income vs. Spending Breakdown

A horizontal bar per category shows the category's spend as a fraction of monthly income. This makes it immediately clear which spending areas consume the most of the user's salary.

---

## Top Insights

Below the charts, SubTrack surfaces up to 3 plain-language insights, for example:
- "Your largest category is Streaming at SAR 420/month (22% of spend)."
- "Your subscriptions grew by 12% over the last 3 months."
- "You're saving 8% of your income — consider reviewing non-essential subscriptions."

---

## Data Sources

| Data | Source context |
|---|---|
| Subscriptions | `SubscriptionContext` — uses `shareCost` for shared items; VAT-inclusive if `includeVat` |
| Bills | `BillsContext` |
| Loan payments | `LoanContext` — uses `minimumPayment` or `installmentAmount` |
| Income | `AuthContext.user.income` |
| Historical snapshots | `useMonthlySnapshots` hook |
