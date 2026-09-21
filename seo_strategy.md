# SEO Strategy — SubTrack

## Product overview
SubTrack is a subscription and personal finance management mobile app built for Saudi Arabia. The project includes:
- A **React Native / Expo mobile app** (`artifacts/mobile/`) — not a web page; App Store / Play Store visibility applies, not web SEO.
- An **Express API server** (`artifacts/api-server/`) — backend only; no public web pages.
- A **SubTrack Deck** SPA (`artifacts/subtrack-deck/`) — pitch/product presentation, public web.
- A **SubTrack User Guide** SPA (`artifacts/subtrack-guide/`) — user-facing guide, public web.
- A **Mockup Canvas** SPA (`artifacts/mockup-sandbox/`) — internal design tool.

## In scope
- `artifacts/subtrack-deck/` — public pitch/product presentation
- `artifacts/subtrack-guide/` — public user guide

## Out of scope
- React Native mobile app (App Store SEO, not web SEO)
- Express API server (backend only)
- `artifacts/mockup-sandbox/` — internal design/prototyping tool

## Rendering classification
Both in-scope web artifacts are **SPAs** (Vite + React + Wouter). All slide content is rendered client-side; the static HTML shell is the only content visible to crawlers and social bots that do not execute JavaScript. Both apps include well-structured `<noscript>` blocks with H1, H2, and body content as a crawler fallback. Googlebot will execute JS and see the full slide content.

## Target audience
- Investors and stakeholders (SubTrack Deck)
- SubTrack mobile app users seeking onboarding help (User Guide)
- Saudi Arabia market focus

## Primary keywords
- Unknown — to be validated by user

## Dismissed categories
- (None yet)

## Known fixed issues (scan history)
- Guide `og:image` was a portrait screenshot (402×874) → fixed; now points to `og-image.png` (1200×630, ~703 KB). Confirmed in scan for task #163.
