# SubTrack — Features & Stakeholders
*Version 1.0 · July 2026*

---

## Part A: Feature Catalogue

### Tier 1 — Free Features

#### 1.1 Subscription Tracker
Track unlimited subscriptions with name, logo, cost, billing cycle, and renewal date.
- Billing cycles: Monthly, Quarterly, Semi-annual, Annual, Weekly, Custom
- Shared plan support: split cost among family members, display per-person share
- Renewal alerts: push notification 7, 3, and 1 day before charge
- Status management: Active, Paused, Cancelled, Trial
- SAR currency with auto-conversion display

#### 1.2 Bills Tracker
Track recurring household and utility bills.
- Categories: Electricity, Water, Internet, Phone, Rent, Insurance, Other
- Due date reminders with customisable lead time
- Paid/unpaid toggle per billing cycle

#### 1.3 Loan & BNPL Manager
Manage personal loans and buy-now-pay-later instalments.
- Fields: Principal, interest rate, instalment amount, payment day, remaining payments
- Payoff simulator: extra payment impact visualisation
- Supported BNPL providers: Tamara, Tabby, Tabby, Spotii, custom
- Trial end date tracking for promotional 0 % periods

#### 1.4 Savings Goals
Set and track progress toward savings targets.
- Custom goal name, icon, target amount, deadline (Gregorian and Hijri)
- Manual contribution with history log
- Progress ring with percentage and days remaining
- Home screen quick-contribute shortcut

#### 1.5 Analytics Dashboard
Visual spending breakdown across all categories.
- Total monthly outflow (subscriptions + bills + loan instalments)
- Category breakdown (donut chart)
- Top spending category highlight
- Monthly trend (6-month line chart)
- Income vs. spending ratio
- Year-over-year comparison

#### 1.6 Multi-language & RTL Support
- Full English and Arabic localisation
- Right-to-left layout when Arabic is selected
- Language toggle accessible from any screen
- All date formats, number formats, and currency respect locale

#### 1.7 Theme Support
- Light and dark mode
- Follows system preference or manual override

---

### Tier 2 — Premium Features

#### 2.1 Bank Auto-Detection (Lean Technologies)
Connect Saudi bank accounts via Lean's open-banking API (read-only, no credentials stored).
- Supported banks: Al Rajhi, SNB, Riyad Bank, SABB, ANB, Alinma, BSF, STC Pay
- Automatic detection of recurring subscription charges from transaction history
- Smart matching: maps bank charges to known subscription providers
- Duplicate charge detection with resolution workflow
- Prompt to add newly detected charges to tracker

#### 2.2 AI Financial Advisor
Conversational AI powered by GPT-4o.
- Context-aware: sees user's actual subscriptions, bills, and loan data
- Calculates actual per-user share cost for shared plans
- Suggests cancellations based on usage patterns
- Answers: "Can I afford this subscription?", "How long to pay off my loan?"
- Available in English and Arabic

#### 2.3 Duplicate Detection
Surface potential duplicate charges across connected bank data.
- Banner alert when duplicates are found
- Review screen with side-by-side comparison
- Resolution options: keep, archive, or cancel one entry
- Filter persistence across status tabs

#### 2.4 Export
Export spending data for records or tax purposes.
- Formats: CSV, PDF
- Scope: per-category or all data, date-range filter
- Real-time preview before export
- Count badge showing number of items in scope

#### 2.5 Hijri Calendar
- Hijri date picker for savings goal deadlines
- Hijri renewal date display for subscriptions
- Ramadan-aware spending insights (planned)

#### 2.6 Advanced Sharing
- Shareable payoff plan (loan) with localised date format
- Share current spending summary as image card
- Language-respecting share dialog titles and messages

---

### Tier 3 — Planned Features (Roadmap)

| Feature | Target Quarter |
|---------|---------------|
| Budget envelope system | Q4 2026 |
| Ramadan spending mode | Q1 2027 |
| Family/household shared accounts | Q1 2027 |
| Merchant logo auto-fetch | Q2 2027 |
| Bill payment reminders (calendar integration) | Q2 2027 |
| Subscription price-change alerts | Q3 2027 |
| B2B expense report module | Q4 2027 |
| UAE & Bahrain bank connectivity | Q1 2028 |

---

## Part B: Stakeholder Map

### Internal Stakeholders

| Stakeholder | Role | Primary Interest |
|-------------|------|-----------------|
| Founders | Product vision, engineering, strategy | Product-market fit, ARR growth |
| Engineering team | Feature development, infrastructure | Code quality, scalability, delivery speed |
| Design team | UX/UI, Arabic RTL experience | Usability, accessibility, visual consistency |
| Customer support | User issue resolution | First-response time, CSAT score |
| Finance / Operations | Revenue tracking, cost management | Margin, burn rate, cash runway |

---

### External Stakeholders

#### Users
| Segment | Needs | Success Metric |
|---------|-------|---------------|
| Young professionals | Quick setup, visual clarity | DAU, time-in-app |
| Families | Bill tracking, goal progress | Goal completion rate |
| Freelancers / SMBs | Export, categorisation | CSV export frequency |
| Arabic-first users | Full RTL, Hijri dates | Arabic adoption rate |

#### Technology Partners

| Partner | Role | Dependency Level |
|---------|------|-----------------|
| **Lean Technologies** | Open-banking data API | High — core Premium feature |
| **Apple (App Store)** | iOS distribution, IAP processing | High — primary mobile channel |
| **Google (Play Store)** | Android distribution, IAP processing | High — primary mobile channel |
| **OpenAI** | GPT-4o for AI advisor | Medium — Premium feature |
| **Expo / Meta** | React Native framework | Medium — foundational |
| **Replit** | Development & hosting environment | Medium — dev infrastructure |
| **Drizzle / PostgreSQL** | Data layer | High — all user data |

#### Financial & Regulatory Stakeholders

| Stakeholder | Relevance |
|-------------|-----------|
| **SAMA (Saudi Central Bank)** | Open-banking regulation, data privacy compliance |
| **CITC** | App Store presence, telecom-related features |
| **Lean Technologies (licensed)** | PSD2-equivalent Saudi licence holder; SubTrack relies on their regulatory cover |
| **Apple / Google** | In-app purchase policy, 30 % platform fee, billing rules |
| **VAT Authority (ZATCA)** | 15 % VAT on digital services sold in KSA |

#### Investors & Financial Partners

| Type | Stage | Interest |
|------|-------|---------|
| Angel investors (KSA tech) | Seed | Traction, team, KSA focus |
| Venture capital (MENA fintech) | Series A (planned 2027) | ARR, retention, unit economics |
| Saudi Aramco Entrepreneurship (Wa'ed) | Grant / strategic | Saudi ecosystem impact |
| Monsha'at | SMB support grant | If B2B module launches |

#### Media & Community

| Stakeholder | Role |
|-------------|------|
| Saudi personal-finance creators | Influencer marketing, organic reach |
| Argaam / Arab News Tech | PR and product coverage |
| Wamda / Magnitt | Startup ecosystem visibility |
| App Store editorial team | Featured placement opportunity |
| Reddit / LinkedIn communities | Word-of-mouth, feedback loops |

---

## Part C: RACI Matrix (Key Decisions)

| Decision | CEO | Engineering | Marketing | Legal |
|----------|-----|-------------|-----------|-------|
| Feature prioritisation | A | C | C | — |
| Pricing changes | A | I | C | I |
| Lean API contract | A | C | — | C |
| Data privacy policy | A | C | I | R |
| Influencer partnerships | C | — | A | I |
| App Store submission | I | R | — | — |
| Investor communications | A | I | I | C |

*R = Responsible · A = Accountable · C = Consulted · I = Informed*
