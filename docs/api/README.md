# API Reference

**Base URL (development):** `https://<replit-dev-domain>/api-server/api`
**Base URL (production):** `https://subtrack-budget.replit.app/api`

All authenticated endpoints require an `Authorization: Bearer <jwt>` header.

---

## Authentication

### `POST /api/auth/register`

Register a new user. Idempotent — re-registering with the same email returns success without overwriting existing data.

**Request body**
```json
{
  "email": "user@example.com",
  "passwordHash": "sha256_hex_of_password",
  "name": "Ahmed Al-Rashid",
  "userId": "local-uuid-from-device"
}
```

**Response `201`**
```json
{ "ok": true }
```

**Response `400`**
```json
{ "error": "Email already registered" }
```

---

### `POST /api/auth/login`

Authenticate and receive a JWT.

**Request body**
```json
{
  "email": "user@example.com",
  "passwordHash": "sha256_hex_of_password"
}
```

**Response `200`**
```json
{ "token": "<jwt>" }
```

**Response `401`**
```json
{ "error": "Invalid credentials" }
```

---

### `GET /api/auth/profile`

🔒 **Requires JWT**

Retrieve the authenticated user's stored profile.

**Response `200`**
```json
{
  "email": "user@example.com",
  "name": "Ahmed Al-Rashid",
  "userId": "local-uuid-from-device"
}
```

**Response `401`**
```json
{ "error": "Unauthorised" }
```

---

## Premium

### `GET /api/premium/:email`

🔒 **Requires JWT** (token's `sub` claim must match `:email`)

Check whether a user has an active premium entitlement.

**Response `200`**
```json
{ "isPremium": true }
```

---

### `POST /api/premium/:email`

🔒 **Requires JWT** · ⛔ **Development only (returns 403 in production)**

Grant premium to a user.

**Response `200`**
```json
{ "isPremium": true }
```

**Response `403` (production)**
```json
{ "error": "Not available in production" }
```

---

### `DELETE /api/premium/:email`

🔒 **Requires JWT** · ⛔ **Development only (returns 403 in production)**

Revoke premium from a user.

**Response `200`**
```json
{ "isPremium": false }
```

---

## AI Advisor

### `POST /api/agent/chat`

🔒 **Requires JWT**

Send a chat message to the AI financial advisor. Returns a **Server-Sent Events (SSE)** stream.

**Request body**
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
    "subscriptions": [
      {
        "name": "Netflix",
        "amount": 49,
        "shareCost": 24.5,
        "category": "Streaming",
        "billingCycle": "monthly",
        "includeVat": false
      }
    ],
    "bills": [
      {
        "name": "STC Broadband",
        "amount": 350,
        "category": "Internet",
        "dueDay": 15
      }
    ],
    "loans": [
      {
        "name": "Tamara – iPhone",
        "type": "bnpl",
        "currentBalance": 2400,
        "installmentAmount": 800,
        "paidInstallments": 1,
        "totalInstallments": 3
      }
    ]
  }
}
```

**Response** — SSE stream (`Content-Type: text/event-stream`)

Each chunk:
```
data: {"content":"Here's my analysis of your subscriptions..."}
```

Final chunk:
```
data: {"done":true}
```

**Notes**
- The model used is `gpt-4o`.
- The system prompt enforces response language (`en` or `ar`) and SAR currency.
- Stream must be read with an SSE-aware client; the mobile app uses a chunked `fetch` reader.

---

## Health

### `GET /api/healthz`

No authentication required.

**Response `200`**
```json
{ "status": "ok" }
```

---

## Error Codes

| HTTP Status | Meaning |
|---|---|
| `400` | Bad request — missing or invalid fields |
| `401` | Missing, expired, or invalid JWT |
| `403` | Forbidden — action not permitted (e.g. prod-only restrictions) |
| `404` | Resource not found |
| `500` | Internal server error |

---

## JWT Details

| Property | Value |
|---|---|
| Algorithm | HS256 |
| Signing secret | `SESSION_SECRET` environment variable |
| TTL | 90 days |
| Claim | `sub` = user email |
| Header format | `Authorization: Bearer <token>` |
