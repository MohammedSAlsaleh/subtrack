# Bills

**Route:** `/bills` · **File:** `app/(tabs)/bills.tsx`
**Premium:** Yes — wrapped in `<PremiumGate>`

---

## Overview

The Bills screen tracks fixed recurring payments that aren't subscription services — rent, insurance, utilities, phone, and internet. Unlike subscriptions (which have a billing cycle), bills are anchored to a **day of the month**.

---

## Adding a Bill

Tap the **＋** FAB to open the creation modal.

| Field | Type | Notes |
|---|---|---|
| **Name** | Text | e.g. "SASO Electricity" |
| **Amount** | Number | SAR |
| **Due Day** | Number (1–31) | Day of the month the bill is due |
| **Category** | Picker | Rent · Insurance · Utilities · Phone · Internet · Other |

---

## Bill List

- Bills are sorted by **due day** ascending (soonest due first).
- A **total monthly bills** pill is shown at the top.
- Each bill card shows the category icon, name, amount, and due day.

### Due Soon Badge

Bills with a due day within **5 days** of today display a coloured **"Due Soon"** badge. The badge colour matches the bill's category.

---

## Categories

| Category | Typical use |
|---|---|
| Rent | Monthly apartment or office rent |
| Insurance | Health, car, or property insurance premiums |
| Utilities | Electricity (SASO/Saudi Electricity Company), water, gas |
| Phone | Mobile plan |
| Internet | Home broadband |
| Other | Any fixed monthly obligation not in the above |

Each category has a distinct icon and accent colour used throughout the card and progress bar.

---

## Deleting a Bill

Long-press a bill card, or tap the delete icon, to remove it. A confirmation prompt appears before deletion.

---

## Integration with Dashboard & Analytics

- Bill amounts feed directly into the **Total Monthly Outflow** on the Dashboard.
- Bills are included in the **Category breakdown** on the Analytics screen.
- The AI Advisor receives the full bills list as context.
