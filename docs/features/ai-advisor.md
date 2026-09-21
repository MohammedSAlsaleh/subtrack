# AI Advisor

**Route:** `/agent` · **File:** `app/agent.tsx`
**Premium:** Yes — wrapped in `<PremiumGate>`

---

## Overview

The AI Advisor is a chat interface powered by **GPT-4o** (via the SubTrack API server). It has full visibility of the user's financial data and provides personalised budgeting advice, spending analysis, and debt payoff guidance in both English and Arabic.

---

## Accessing the Advisor

- Tap the **AI** icon in the navigation bar, or
- Tap **"How to Cancel This"** on any subscription detail screen (pre-loads a cancellation query).

---

## Context Sent to the Model

Every message sends the following context object alongside the conversation history:

| Field | Source |
|---|---|
| `income` | `AuthContext.user.income` |
| `monthlySubTotal` | Total subscription spend (share cost, VAT-inclusive) |
| `monthlyBillTotal` | Total bill spend |
| `monthlyLoanPayments` | Sum of minimum payments / instalments |
| `totalDebt` | Sum of all `currentBalance` values |
| `language` | `"en"` or `"ar"` |
| `subscriptions[]` | Full list with name, amount, share cost, category, billing cycle, VAT flag |
| `bills[]` | Full list with name, amount, category, due day |
| `loans[]` | Full list with name, balance, APR, type, minimum payment |

The system prompt instructs the model to respond in the user's active language, use SAR for all amounts, and address the Saudi market context.

---

## Streaming

Responses stream via **Server-Sent Events (SSE)**. The client reads `data:` chunks as they arrive and appends them to the current assistant message in real time, giving a typewriter effect.

The stream ends with `data: {"done":true}`.

---

## Quick-Action Chips

Before the user types anything, a row of suggestion chips is shown:

| Chip | Pre-filled query |
|---|---|
| Spending overview | "Give me a summary of my monthly spending" |
| Savings tips | "How can I save more money this month?" |
| Subscription audit | "Which subscriptions should I consider cancelling?" |
| Debt strategy | "What's the best way to pay off my debt faster?" |
| Budget advice | "Am I spending too much in any category?" |

Tapping a chip sends the query immediately.

---

## Language

The advisor responds in whichever language is active in the app (`LanguageContext`). The context object explicitly passes `language: "en"` or `"ar"`, and the system prompt enforces this. Arabic responses are right-aligned in the chat UI.

---

## Message History

Conversation history is kept in component state for the duration of the session. It is not persisted to AsyncStorage or the server between sessions — each new session starts fresh.

---

## API Endpoint

`POST /api/agent/chat`

```json
{
  "messages": [
    { "role": "user", "content": "Which subscriptions should I cancel?" }
  ],
  "context": {
    "income": 18000,
    "monthlySubTotal": 650,
    "monthlyBillTotal": 2200,
    "monthlyLoanPayments": 1500,
    "totalDebt": 28000,
    "language": "en",
    "subscriptions": [...],
    "bills": [...],
    "loans": [...]
  }
}
```

Response: SSE stream of `data: {"content":"..."}` chunks, terminated by `data: {"done":true}`.
