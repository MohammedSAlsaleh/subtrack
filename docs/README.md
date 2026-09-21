# SubTrack — Documentation

SubTrack is a personal finance mobile app built for the Saudi Arabian market. It helps users track subscriptions, recurring bills, BNPL loans, savings goals, and monthly budgets — all in one place, with full Arabic/English bilingual support.

---

## Table of Contents

| Document | Description |
|---|---|
| [Architecture](./architecture.md) | Monorepo layout, tech stack, data flow |
| [Screens Reference](./screens.md) | Every screen, its route, and what it renders |
| [Data Models](./data-models.md) | TypeScript interfaces for every entity |
| [Authentication](./authentication.md) | Registration, login, JWT, cloud sync |
| [Features — Dashboard](./features/dashboard.md) | Home screen and spending summary |
| [Features — Subscriptions](./features/subscriptions.md) | Subscription tracking, filters, duplicates |
| [Features — Bills](./features/bills.md) | Recurring bills and due-date tracking |
| [Features — Loans](./features/loans.md) | Credit cards, BNPL, payoff simulator |
| [Features — Savings Goals](./features/goals.md) | Goal setting, contributions, Hijri dates |
| [Features — Budgets](./features/budgets.md) | Category spending caps |
| [Features — Bank Connections](./features/banks.md) | Lean Technologies open-banking integration |
| [Features — Analytics](./features/analytics.md) | Charts, trends, savings rate |
| [Features — AI Advisor](./features/ai-advisor.md) | GPT-powered financial chat assistant |
| [Features — Premium](./features/premium.md) | Free vs. Premium feature comparison |
| [Features — Settings](./features/settings.md) | Profile, appearance, export, data management |
| [API Reference](./api/README.md) | All server endpoints with request/response shapes |
| [Localization](./localization.md) | Arabic/English i18n, RTL layout, locale keys |

---

## Quick Facts

| Property | Value |
|---|---|
| Platform | iOS · Android · Web (Expo SDK 53) |
| Primary market | Kingdom of Saudi Arabia |
| Currency | SAR (Saudi Riyal) |
| Languages | English · Arabic (RTL) |
| Backend | Node.js / Fastify + PostgreSQL |
| AI | OpenAI GPT-4o (streaming SSE) |
| Open banking | Lean Technologies |
| Monetization | Freemium — SAR 14.99 / month |
