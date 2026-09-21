<div align="center">
  <img src="app-icon.png" alt="SubTrack app icon" width="160" />
  <h1>SubTrack</h1>
  <p><strong>Your subscriptions, bills, and financial goals in one place.</strong></p>
  <p>A personal finance app built around Saudi Riyal spending, with Arabic and English support.</p>
  <p><a href="https://subtrack-budget.replit.app/">Open the live app</a> · <a href="docs/README.md">Explore the documentation</a> · <a href="docs/SETUP.md">Installation &amp; setup</a></p>
</div>

![SubTrack dashboard with monthly outflow and upcoming payments](docs/screenshots/dashboard.png)

## Overview

SubTrack brings recurring payments and savings planning into a single Expo / React Native app, with a web experience available through the live link above.

- **Dashboard:** monthly outflow, upcoming payments, and spending categories.
- **Subscriptions:** searchable recurring services, category filters, and renewal tracking.
- **Bills and loans:** recurring expenses, credit cards, and buy-now-pay-later tracking.
- **Analytics:** spending breakdowns, monthly snapshots, and savings-rate views.
- **Planning:** savings goals and category budgets.
- **Personalization:** Arabic / English, RTL layouts, and appearance settings.

Some features require Premium or additional service configuration. Bank-linking flows currently include simulated behavior; see the [bank connections documentation](docs/features/banks.md).

## Screenshots

Captured from the [live web app](https://subtrack-budget.replit.app/) on September 21, 2026. These are actual interface captures; figures and availability reflect the session shown. The deployed app may differ from this source snapshot.

### Subscription management

Search services, filter categories, and see recurring costs at a glance.

![SubTrack subscriptions screen with service costs and category filters](docs/screenshots/subscriptions.png)

### Spending analytics

Review monthly outflow and the split between subscriptions, fixed bills, and loan payments.

![SubTrack analytics screen with spending totals and a category breakdown](docs/screenshots/analytics.png)

## Technology

| Layer | Technology |
| --- | --- |
| App | Expo, React Native, Expo Router, TypeScript |
| API | Node.js, Express |
| Database | PostgreSQL, Drizzle ORM |
| Workspace | pnpm |
| AI integration | OpenAI-compatible integration configured through environment variables |

## Installation

Use **Node.js 24** and **pnpm 10**, matching the repository’s CI configuration.

```bash
git clone https://github.com/MohammedSAlsaleh/subtrack.git
cd subtrack
npm install --global pnpm@10
pnpm install --frozen-lockfile
```

Continue with the **[installation and setup guide](docs/SETUP.md)** for PostgreSQL setup, environment configuration, app startup, health checks, and troubleshooting on macOS, Linux, and Windows through WSL.

## Project status

The screenshots show the deployed web experience. Some features require Premium, bank linking includes simulated behavior, and AI functionality requires a configured provider. This repository contains source code, not an app-store installation package.

## Repository map

```text
artifacts/mobile/           Mobile app and Expo web experience
artifacts/api-server/       Express API
artifacts/subtrack-deck/    Product presentation
artifacts/subtrack-guide/   Product walkthrough
artifacts/mockup-sandbox/   Component previews
lib/                       Shared database, API, and integration packages
docs/                      Feature documentation and screenshots
scripts/                   Supporting scripts
```

## Documentation

- [Installation and setup](docs/SETUP.md)
- [Feature and screen documentation](docs/README.md)
- [API reference](docs/api/README.md)
- [Authentication](docs/authentication.md)
- [Localization](docs/localization.md)
