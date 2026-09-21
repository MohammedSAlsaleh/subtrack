# SubTrack — Business Plan
*Version 1.0 · July 2026*

---

## 1. Executive Summary

SubTrack is a personal finance management mobile application purpose-built for the Saudi Arabian market. It gives users a single place to track subscriptions, recurring bills, BNPL loans, and savings goals — with optional bank connectivity via the Lean Technologies open-banking API. The app is available in English and Arabic and is optimised for right-to-left layout.

**Mission:** Eliminate financial blind spots for Saudi consumers by making every recurring charge visible, predictable, and under control.

**Stage:** MVP launched. Monetised through a freemium model (SubTrack Premium).

---

## 2. Problem & Opportunity

### The Problem
- The average Saudi household subscribes to 6–10 digital services (streaming, cloud, SaaS) plus recurring utility bills and BNPL instalments.
- Charges are spread across multiple cards and bank accounts, making it easy to forget or double-pay.
- No Arabic-first app addresses subscriptions, bills, AND loans in one place.

### Market Opportunity
| Metric | Value |
|--------|-------|
| Saudi internet users | 36 million |
| Smartphone penetration | 98 % |
| Digital subscription CAGR (MENA) | 18 % (2024–2028) |
| BNPL adoption in KSA | Top 3 globally per capita |
| Addressable app users (TAM) | ~12 million |

---

## 3. Product Overview

SubTrack is a React Native (Expo) mobile app with an Express/PostgreSQL backend.

### Core Modules
| Module | Free | Premium |
|--------|------|---------|
| Subscription tracker (unlimited) | ✓ | ✓ |
| Bills tracker | ✓ | ✓ |
| Loan & BNPL payoff simulator | ✓ | ✓ |
| Savings goals | ✓ | ✓ |
| Analytics dashboard | ✓ | ✓ |
| Bank auto-detection (Lean API) | — | ✓ |
| Duplicate charge detection | — | ✓ |
| AI financial advisor | — | ✓ |
| CSV/PDF export | — | ✓ |
| Hijri calendar support | — | ✓ |

---

## 4. Business Model

### Revenue Streams

**1. SubTrack Premium (primary)**
- Monthly: SAR 19.99/month
- Annual: SAR 149.99/year (37 % saving)
- Offered via Apple In-App Purchase, Google Play Billing, and direct web checkout

**2. Affiliate Referrals (secondary)**
- Cashback/switching offers when users cancel a subscription via the app
- Estimated SAR 8–15 per conversion

**3. B2B White-Label (future — Year 2)**
- Sell a whitelabelled version to Saudi banks and fintech platforms
- Projected licence fee: SAR 80,000–200,000/year per partner

### Unit Economics (Year 1 targets)
| Metric | Target |
|--------|--------|
| Monthly free users | 50,000 |
| Conversion to Premium | 6 % |
| Paying subscribers | 3,000 |
| ARPU (blended) | SAR 155/year |
| Annual Recurring Revenue | SAR 465,000 |

---

## 5. Go-to-Market Strategy

### Phase 1 — Seeding (Months 1–3)
- Launch on App Store and Google Play with a 30-day free Premium trial.
- Influencer seeding: 10 Saudi personal-finance creators (YouTube/TikTok/X).
- Target communities: r/saudiarabia, LinkedIn Saudi Finance groups.

### Phase 2 — Growth (Months 4–9)
- Performance marketing on Meta and Snapchat (high penetration in KSA).
- Google UAC campaigns targeting "subscription tracker", "BNPL Saudi", "مصاريف".
- Referral programme: give 1 free month for each friend who subscribes Premium.

### Phase 3 — Scale (Months 10–18)
- Partner with Lean Technologies for co-marketing.
- Corporate HR benefit packages (expense tracking for employees).
- Expand to UAE and Bahrain.

---

## 6. Competitive Analysis

| App | KSA-specific | Arabic RTL | Loans | Bank sync | AI advisor |
|-----|-------------|-----------|-------|-----------|------------|
| **SubTrack** | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mint / YNAB | ❌ | ❌ | Partial | ✅ | ❌ |
| Sharafdg Wallet | Partial | ✅ | ❌ | ❌ | ❌ |
| Spendings (generic) | ❌ | ❌ | ❌ | ❌ | ❌ |

**Moat:** Lean open-banking integration + Arabic-first UX + Hijri calendar support is a combination no competitor currently offers.

---

## 7. Operations & Team

| Role | Status |
|------|--------|
| CEO / Product | Founder |
| Lead Engineer | Founder |
| Marketing | To hire (Month 3) |
| Customer Support | Outsourced (Zendesk) |
| Legal / Compliance | External counsel |

### Technology Stack
- **Mobile:** React Native (Expo), TypeScript
- **Backend:** Node.js, Express, PostgreSQL (Drizzle ORM)
- **Auth:** JWT + bcrypt
- **Banking:** Lean Technologies API
- **AI:** OpenAI GPT-4o (advisor feature)
- **Hosting:** Cloud VPS (scalable to AWS/GCP)

---

## 8. Financial Summary

### Funding Ask
Seeking **SAR 750,000 (seed round)** to fund:

| Use of Funds | Amount | % |
|-------------|--------|---|
| Marketing & UA | SAR 300,000 | 40 % |
| Engineering (2 hires) | SAR 225,000 | 30 % |
| Infrastructure & APIs | SAR 112,500 | 15 % |
| Legal, compliance, misc | SAR 112,500 | 15 % |

### Runway
18 months at current burn rate of ~SAR 41,000/month.

---

## 9. Risk Analysis

| Risk | Probability | Mitigation |
|------|------------|------------|
| Low Premium conversion | Medium | A/B test pricing; extend trial |
| Lean API pricing change | Low | Negotiate multi-year contract |
| SAMA regulatory change | Low | Monitor SAMA sandbox bulletins |
| App Store fee (30 %) | Certain | Offer direct web subscription at discount |
| Competition from banks | Medium | Focus on cross-bank view — banks won't build this |

---

## 10. Milestones

| Date | Milestone |
|------|-----------|
| Q3 2026 | App Store & Play Store launch |
| Q4 2026 | 10,000 registered users |
| Q1 2027 | 3,000 Premium subscribers |
| Q2 2027 | Break-even on operating costs |
| Q3 2027 | UAE & Bahrain expansion |
| Q4 2027 | Series A raise / B2B pilot |
