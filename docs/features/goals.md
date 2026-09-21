# Savings Goals

**Route:** `/goals` · **File:** `app/(tabs)/goals.tsx`

---

## Overview

The Goals screen lets users set financial savings targets, track progress, and log contributions. Goals display both Gregorian and Hijri dates to serve the Saudi market.

---

## Creating a Goal

Tap **＋** to open the goal creation modal.

| Field | Type | Notes |
|---|---|---|
| **Emoji** | Picker | Visual icon from a curated set |
| **Name** | Text | e.g. "Hajj Fund", "New Car" |
| **Target Amount** | Number (SAR) | Total amount to save |
| **Target Date** | Date (DD/MM/YYYY) | Deadline (Gregorian) |

### Goal Templates

Quick-start presets appear at the top of the creation modal:

| Template | Emoji |
|---|---|
| Hajj Fund | 🕌 |
| New Car | 🚗 |
| Emergency Fund | 🛡️ |
| Wedding | 💍 |
| Travel | ✈️ |
| Home | 🏠 |
| Education | 🎓 |
| Electronics | 📱 |

Selecting a template pre-fills the name and emoji.

---

## Goal Card

Each goal card displays:
- Emoji and goal name
- Progress bar (colour-coded, customisable per goal)
- Current amount vs. target amount (SAR)
- Deadline — shown in both **Gregorian** and **Hijri** calendars
- **Monthly rate needed** — `(targetAmount − currentAmount) / monthsRemaining`
- **At-risk indicator (🟡 Amber)** — shown when the required monthly rate exceeds 20% of the user's income

---

## Logging a Contribution

Tap the **＋** button on a goal card to open the contribution modal:

1. Enter the SAR amount to add.
2. Tap **Save** — `currentAmount` is incremented and the progress bar updates immediately.
3. Haptic feedback confirms the save.

---

## Hijri Date Display

Every goal deadline is displayed alongside its Hijri equivalent using `formatHijriDate()`. For example:

> 15/08/2026 · 22 Muharram 1448

This is rendered on the goal card and in the contribution modal.

---

## Editing & Deleting

- **Edit** — tap the edit icon on a card to reopen the creation modal pre-filled with the goal's current values.
- **Delete** — tap the delete icon and confirm. The goal and all its contribution history are permanently removed.

---

## Integration

- The Goals screen is accessible to all users (free and premium).
- The Dashboard surfaces total savings progress when goals exist.
- The AI Advisor receives goal data (title, target, current amount, deadline) as part of its context.
