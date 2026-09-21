/**
 * paymentDetector.ts
 *
 * Heuristic classifier that decides whether a payment entry is a true
 * recurring subscription or a regular frequent expense (e.g. daily coffee,
 * weekly takeaway order).
 *
 * Returns a DetectionResult so callers can explain the decision to the user.
 */

import { Category, BillingCycle } from '@/context/SubscriptionContext';

export interface DetectionInput {
  name: string;
  category: Category;
  billingCycle: BillingCycle;
  amount: number;
}

export interface DetectionResult {
  isRegularPayment: boolean;
  confidence: 'high' | 'medium' | 'low';
  /** Short human-readable reason shown in UI */
  reason: string;
}

// ── Known subscription services ────────────────────────────────────────────
// Names or fragments that virtually guarantee a true subscription.
const SUBSCRIPTION_SIGNALS: string[] = [
  // Video streaming
  'netflix', 'shahid', 'osn', 'watch it', 'watchit', 'shahed',
  'mbc', 'disney', 'hulu', 'apple tv', 'amazon prime', 'prime video',
  'jawwy tv', 'tubi', 'starzplay', 'curiosity stream',
  // Music / podcast
  'spotify', 'anghami', 'apple music', 'deezer', 'tidal', 'youtube music',
  'soundcloud', 'mixcloud',
  // Cloud / software
  'icloud', 'google one', 'dropbox', 'onedrive', 'google drive',
  'microsoft 365', 'office 365', 'adobe', 'canva', 'figma', 'notion',
  'slack', 'zoom', 'github', 'gitlab', 'jira', 'trello', 'asana',
  'hubspot', 'salesforce', 'shopify', 'squarespace', 'wix',
  // Gaming
  'xbox', 'playstation', 'ps plus', 'nintendo', 'ea play', 'game pass',
  'pubg', 'apple arcade', 'google stadia',
  // Education
  'coursera', 'udemy', 'linkedin learning', 'duolingo', 'babbel',
  'masterclass', 'skillshare',
  // Fitness
  'strava', 'peloton', 'headspace', 'calm', 'noom',
  // Telecom / internet (monthly plans)
  'stc', 'mobily', 'zain', 'sawa', 'jawwy',
  // Productivity / finance
  'chatgpt', 'claude', 'copilot', 'openai', 'midjourney',
  'quickbooks', 'wave accounting', 'freshbooks',
  // Arabic equivalents
  'نتفليكس', 'شاهد', 'انغامي', 'اس تي سي', 'موبايلي', 'زين',
];

// ── Known regular-expense merchants ───────────────────────────────────────
// Names or fragments that strongly suggest a frequent non-subscription charge.
const REGULAR_EXPENSE_SIGNALS: string[] = [
  // Food delivery platforms
  'talabat', 'طلبات', 'careem', 'كريم', 'hunger station', 'hungerstation',
  'مطعم الجوع', 'noon food', 'jahez', 'جاهز', 'marsool', 'مرسول',
  'toters', 'delivery hero',
  // Coffee & cafes
  'starbucks', 'ستاربكس', 'costa coffee', 'tim horton', 'dunkin',
  'caribou', 'mcafe', 'paul bakery', 'bread talk',
  // Fast food chains
  'mcdonald', 'ماكدونالدز', 'kfc', 'كي اف سي', 'burger king',
  'برغر كنج', 'pizza hut', 'بيتزا هت', 'domino', 'دومينوز',
  'subway', 'popeyes', 'hardee', 'dairy queen', 'nando',
  'shake shack', 'five guys', 'little caesars',
  // Grocery / supermarket
  'panda', 'بنده', 'bin dawood', 'بن داود', 'danube', 'الدانوب',
  'tamimi', 'التميمي', 'lulu', 'لولو', 'carrefour', 'كارفور',
  'othaim', 'العثيم', 'farm', 'hyper panda',
  // Petrol / fuel
  'aramco', 'adnoc', 'shell', 'total', 'mobil', 'petromin',
  // Retail / everyday
  'jarir', 'جرير', 'extra', 'سوبر ستور', 'noon.com', 'namshi',
  // Generic food/meal keywords
  'breakfast', 'فطور', 'lunch', 'غداء', 'dinner', 'عشاء',
  'coffee', 'قهوة', 'cafe', 'كافيه', 'restaurant', 'مطعم',
  'bakery', 'مخبز', 'juice', 'عصير', 'shawarma', 'شاورما',
  'biryani', 'برياني', 'pizza', 'بيتزا', 'sushi', 'سوشي',
  'burger', 'برغر', 'sandwich', 'ساندوتش',
  // Ride-hailing (per-trip, not subscription)
  'uber', 'lyft', 'ola',
];

// ── Scoring constants ──────────────────────────────────────────────────────
const SCORE_KNOWN_SUB        = -90;
const SCORE_KNOWN_REGULAR    =  80;
const SCORE_FOOD_CATEGORY    =  35;
const SCORE_WEEKLY_CYCLE     =  30;
const SCORE_MONTHLY_FOOD     =  20;  // monthly food — could still be regular
const SCORE_SMALL_AMOUNT     =  20;  // under 30 SAR
const SCORE_TINY_AMOUNT      =  10;  // under 15 SAR — extra signal
const SCORE_LARGE_AMOUNT     = -15;  // over 200 SAR — likely a proper subscription
const SCORE_STREAMING_CAT    = -40;
const SCORE_SOFTWARE_CAT     = -35;
const SCORE_EDUCATION_CAT    = -25;
const THRESHOLD_HIGH         =  70;  // score ≥ 70 → high confidence
const THRESHOLD_MEDIUM       =  40;  // score ≥ 40 → medium confidence

/** Returns true if `text` contains any fragment from `signals` (case-insensitive). */
function matchesAny(text: string, signals: string[]): string | null {
  const lower = text.toLowerCase();
  for (const signal of signals) {
    if (lower.includes(signal.toLowerCase())) return signal;
  }
  return null;
}

/** Classify a payment entry as a regular expense or a true subscription. */
export function detectPaymentType(input: DetectionInput): DetectionResult {
  let score = 0;
  const name = input.name.trim();

  // ── Hard overrides ────────────────────────────────────────────────────
  const subMatch = matchesAny(name, SUBSCRIPTION_SIGNALS);
  if (subMatch) {
    return {
      isRegularPayment: false,
      confidence: 'high',
      reason: `Recognised as a subscription service`,
    };
  }

  const regularMatch = matchesAny(name, REGULAR_EXPENSE_SIGNALS);
  if (regularMatch) {
    score += SCORE_KNOWN_REGULAR;
  }

  // ── Category signals ──────────────────────────────────────────────────
  if (input.category === 'food')      score += SCORE_FOOD_CATEGORY;
  if (input.category === 'streaming') score += SCORE_STREAMING_CAT;
  if (input.category === 'software')  score += SCORE_SOFTWARE_CAT;
  if (input.category === 'education') score += SCORE_EDUCATION_CAT;

  // ── Billing cycle ─────────────────────────────────────────────────────
  if (input.billingCycle === 'weekly')  score += SCORE_WEEKLY_CYCLE;
  if (input.billingCycle === 'monthly' && input.category === 'food') {
    score += SCORE_MONTHLY_FOOD;
  }

  // ── Amount ────────────────────────────────────────────────────────────
  if (input.amount < 15)  score += SCORE_SMALL_AMOUNT + SCORE_TINY_AMOUNT;
  else if (input.amount < 30) score += SCORE_SMALL_AMOUNT;
  if (input.amount > 200) score += SCORE_LARGE_AMOUNT;

  // ── Decision ─────────────────────────────────────────────────────────
  if (score >= THRESHOLD_HIGH) {
    return {
      isRegularPayment: true,
      confidence: 'high',
      reason: regularMatch
        ? `"${name}" is a known regular-expense merchant`
        : input.category === 'food' && input.billingCycle === 'weekly'
        ? 'Food + weekly billing suggests a regular expense'
        : 'Name, category, and amount pattern suggest a regular expense',
    };
  }

  if (score >= THRESHOLD_MEDIUM) {
    return {
      isRegularPayment: true,
      confidence: 'medium',
      reason: input.category === 'food'
        ? 'Food category with this amount pattern looks like a regular expense'
        : 'Billing pattern suggests a frequent expense rather than a subscription',
    };
  }

  return {
    isRegularPayment: false,
    confidence: score < -20 ? 'high' : 'low',
    reason: 'Looks like a subscription',
  };
}
