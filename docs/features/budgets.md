# Budgets

**Route:** `/budgets` · **File:** `app/budgets.tsx`
**Premium:** Yes — wrapped in `<PremiumGate>`

---

## Overview

The Budgets screen lets users set a monthly spending cap for each subscription category. Visual health indicators make it immediately obvious when a category is on track or over limit.

---

## Setting a Budget Cap

Tap any category row to open an inline editor. Enter a SAR amount and save. The cap is stored via `BudgetContext.setCap(category, amount)`.

To remove a cap, clear the field and save.

---

## Categories

| Category | Icon |
|---|---|
| Streaming | 📺 |
| Software | 💻 |
| Fitness | 🏋️ |
| Food | 🍔 |
| Gaming | 🎮 |
| Utilities | ⚡ |
| Education | 📚 |
| Other | 📦 |

---

## Health Indicators

Each category row shows a progress bar and a status label.

| Spend vs. Cap | Status | Bar colour |
|---|---|---|
| < 80% | Normal | Green |
| 80–100% | Near limit | Amber |
| > 100% | Over limit | Red |

The overall spend figure shown per category is the **normalised monthly total** — weekly subscriptions are multiplied by 4.33, annual subscriptions are divided by 12 — so caps are always compared on a like-for-like monthly basis.

---

## Integration

- Budget caps are read by the Analytics screen to overlay cap lines on category charts.
- The AI Advisor is aware of budget caps and will flag categories where the user is near or over their limit.
- Caps persist in AsyncStorage; they survive app restarts.
