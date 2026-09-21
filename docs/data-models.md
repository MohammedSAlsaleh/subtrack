# Data Models

All entities are stored locally in AsyncStorage. The TypeScript interfaces below are the canonical shapes used throughout the app.

---

## UserProfile

```typescript
interface UserProfile {
  id: string;                  // Local UUID, generated on registration
  name: string;
  email: string;
  passwordHash?: string;       // Stored locally; not sent to server after auth
  isPremium?: boolean;
  income?: number;             // Monthly net income in SAR
  leanVerifiedAt?: string;     // ISO timestamp — set when income came from Lean open-banking
  leanAppToken?: string;       // Lean Technologies app token
  leanCustomerId?: string;     // Lean customer_id (returned after customer creation)
  kycCompleted?: boolean;      // True after first successful Lean KYC flow
  createdAt: string;           // ISO timestamp
}
```

---

## Subscription

```typescript
interface Subscription {
  id: string;                  // UUID
  name: string;                // Service name (e.g. "Netflix")
  merchantName?: string;       // Billing statement merchant name
  category: SubscriptionCategory;
  amount: number;              // Amount in SAR (base price before VAT)
  billingCycle: 'weekly' | 'monthly' | 'annual';
  startDate: string;           // ISO date string
  status: 'active' | 'cancelled';
  includeVat?: boolean;        // Adds 15% VAT to displayed amount
  isShared?: boolean;          // Whether cost is split with others
  sharedMembers?: number;      // Number of people sharing (1–6)
  isTrial?: boolean;
  trialEndDate?: string;       // DD/MM/YYYY
  bankAccountId?: string;      // Linked bank account ID (from Lean)
  notes?: string;
}

type SubscriptionCategory =
  | 'Streaming'
  | 'Software'
  | 'Fitness'
  | 'Food'
  | 'Gaming'
  | 'Utilities'
  | 'Education'
  | 'Other';
```

**Derived values (computed, not stored):**
- `shareCost = amount / sharedMembers` — the user's personal share
- `monthlyAmount` — normalised to monthly: weekly × 4.33, annual ÷ 12
- `yearlyEquivalent` — monthly equivalent × 12

---

## Bill

```typescript
interface Bill {
  id: string;
  name: string;
  amount: number;              // SAR
  dueDay: number;              // Day of month (1–31)
  category: BillCategory;
  isPaid?: boolean;            // Toggled per cycle
}

type BillCategory =
  | 'Rent'
  | 'Insurance'
  | 'Utilities'
  | 'Phone'
  | 'Internet'
  | 'Other';
```

---

## Loan

```typescript
interface Loan {
  id: string;
  name: string;                // Descriptive label (e.g. "Tamara – iPhone")
  lender?: string;
  type: 'credit_card' | 'bnpl' | 'personal' | 'other';

  // Balance & limits
  currentBalance: number;      // SAR — remaining balance
  originalAmount?: number;     // SAR — original loan amount
  creditLimit?: number;        // SAR — for credit cards

  // Repayment
  apr?: number;                // Annual Percentage Rate (%)
  minimumPayment?: number;     // SAR — monthly minimum
  nextDueDate?: string;        // ISO date

  // BNPL-specific
  installmentAmount?: number;  // SAR per installment
  totalInstallments?: number;
  paidInstallments?: number;
}
```

---

## SavingsGoal

```typescript
interface SavingsGoal {
  id: string;
  emoji: string;               // Visual identifier (e.g. "🕌", "🚗")
  title: string;
  targetAmount: number;        // SAR
  currentAmount: number;       // SAR — accumulated savings
  deadline?: string;           // DD/MM/YYYY Gregorian
  color?: string;              // Hex accent colour for progress bar
  createdAt: string;
}
```

**Derived values:**
- `progress = currentAmount / targetAmount` (0–1)
- `monthlyRateNeeded` — amount needed per month to hit deadline
- `isAtRisk` — true when `monthlyRateNeeded > 20%` of user income

---

## BudgetCap

```typescript
interface BudgetCap {
  category: SubscriptionCategory;
  limitAmount: number;         // SAR per month
}
```

Budget health thresholds:
- **Normal** — spending < 80% of cap
- **Near limit** — spending 80–100% of cap
- **Over limit** — spending > cap

---

## BankAccount

```typescript
interface BankAccount {
  id: string;                  // Local UUID
  bankName: string;
  accountType: string;         // e.g. "Current", "Savings"
  lastFour: string;            // Last 4 digits of account number
  leanEntityId?: string;       // Lean entity ID for API calls
  balanceAvailable?: number;   // SAR — fetched from Lean
  iban?: string;
}
```

---

## Server-side (PostgreSQL)

### server_users

| Column | Type | Notes |
|---|---|---|
| `email` | text (PK) | Primary key |
| `password_hash` | text | Bcrypt hash |
| `name` | text | Display name |
| `user_id` | text | Device-generated UUID |
| `created_at` | timestamp | |

### premium_entitlements

| Column | Type | Notes |
|---|---|---|
| `email` | text (PK) | Foreign key → server_users |
| `is_premium` | boolean | |
| `granted_at` | timestamp | |
| `updated_at` | timestamp | |
