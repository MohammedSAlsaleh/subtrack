import { Subscription } from '@/context/SubscriptionContext';
import { Bill } from '@/context/BillsContext';
import { Loan } from '@/context/LoanContext';
import { Goal } from '@/context/GoalsContext';

const VAT_RATE = 0.15;

function escapeCsv(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  // Wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(...cells: (string | number | boolean | undefined | null)[]): string {
  return cells.map(escapeCsv).join(',');
}

export function generateCsv(
  subscriptions: Subscription[],
  bills: Bill[],
  loans: Loan[],
  budgets?: Record<string, number>,
  goals?: Goal[],
): string {
  const lines: string[] = [];

  // Header — extra columns at end for Budget/SavingsGoal data
  lines.push(row(
    'Type', 'Name', 'Amount (SAR)', 'Category', 'Status',
    'VAT Included', 'Ex-VAT Amount', 'Due Date / Cycle', 'Notes',
    'Limit (SAR)', 'Target (SAR)', 'Saved (SAR)',
  ));

  // Subscriptions
  for (const s of subscriptions) {
    const exVat = s.includesVat ? (s.amount / (1 + VAT_RATE)).toFixed(2) : '';
    lines.push(row(
      'Subscription',
      s.name,
      s.amount.toFixed(2),
      s.category,
      s.status,
      s.includesVat ? 'Yes' : 'No',
      exVat,
      s.nextBillingDate,
      s.billingCycle,
      '', '', '',
    ));
  }

  // Bills
  for (const b of bills) {
    lines.push(row(
      'Bill',
      b.name,
      b.amount.toFixed(2),
      b.category,
      'active',
      'No',
      '',
      `Day ${b.dueDayOfMonth} of month`,
      '',
      '', '', '',
    ));
  }

  // Loans
  for (const l of loans) {
    lines.push(row(
      'Loan',
      l.name,
      l.currentBalance.toFixed(2),
      l.type,
      'active',
      'No',
      '',
      l.nextPaymentDate,
      `Next payment: SAR ${l.nextPaymentAmount.toFixed(2)}`,
      '', '', '',
    ));
  }

  // Budget envelopes
  if (budgets) {
    for (const [category, limit] of Object.entries(budgets)) {
      lines.push(row(
        'Budget',
        category,
        limit.toFixed(2),
        category,
        '',
        '',
        '',
        '',
        '',
        limit.toFixed(2), '', '',
      ));
    }
  }

  // Savings goals
  if (goals) {
    for (const g of goals) {
      lines.push(row(
        'SavingsGoal',
        g.name,
        g.targetAmount.toFixed(2),
        '',
        '',
        '',
        '',
        g.targetDate ?? '',
        '',
        '', g.targetAmount.toFixed(2), g.savedAmount.toFixed(2),
      ));
    }
  }

  return '\uFEFF' + lines.join('\n'); // BOM for UTF-8 (ensures Arabic renders in Excel)
}
