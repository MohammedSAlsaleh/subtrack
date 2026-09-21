# Dashboard

**Route:** `/` · **File:** `app/(tabs)/index.tsx`

The Dashboard is the first screen the user sees after launch. It provides a single-glance summary of the user's complete financial picture.

---

## Summary Cards

| Card | Description |
|---|---|
| **Total Monthly Outflow** | Sum of all active subscriptions (at share cost), bills, and loan minimum payments for the current month |
| **Subscriptions** | Active subscription count and their combined monthly cost |
| **Bills** | Total monthly bill obligations |
| **Loans** | Total minimum monthly loan payments and aggregate outstanding debt |

---

## Top Spending Category

Shows the single highest-spend category across subscriptions, bills, and loans — displayed with a colour-coded icon and the monthly amount attributed to it.

---

## Upcoming Payments

A chronological list of the next payments due within the current month, including:
- Subscription renewal dates (derived from `startDate` + billing cycle)
- Bill due days
- Loan next-due dates

Each row shows the service name, amount, and days remaining.

---

## Savings Rate Indicator

When the user has set their monthly income (manually or via Lean), the dashboard shows a savings rate chip:

| Rate | Colour | Label |
|---|---|---|
| ≥ 20% | Green | Healthy |
| 10–19% | Amber | Fair |
| < 10% | Red | Low |

Savings rate = `(income − totalMonthlyOutflow) / income × 100`

---

## Quick Actions

- **Add Subscription** — opens the subscription creation modal directly from the home screen
- **Connect Bank** — deep-links to the Banks tab if no bank is connected

---

## Behaviour Notes

- All amounts are shown in SAR.
- Shared subscriptions display the user's **share cost**, not the full price.
- VAT (15%) is added to any subscription where `includeVat` is true before it is counted toward the total.
- The dashboard updates reactively whenever any context (subscriptions, bills, loans) changes — no pull-to-refresh needed.
