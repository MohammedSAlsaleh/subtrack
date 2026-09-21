# Localization

SubTrack ships with full bilingual support for English and Arabic, including complete RTL (right-to-left) layout switching.

---

## Languages

| Code | Language | Script direction |
|---|---|---|
| `en` | English | LTR |
| `ar` | Arabic | RTL |

The active language is stored in `LanguageContext` and persisted in AsyncStorage. Switching language takes effect immediately across all screens — no restart required.

---

## LanguageContext

```typescript
interface LanguageContext {
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
  t: (key: string) => string;   // Translation function
  isRTL: boolean;               // true when language === 'ar'
}
```

### Usage in components

```tsx
const { t, isRTL } = useLanguage();

<Text style={{ textAlign: isRTL ? 'right' : 'left' }}>
  {t('nav_dashboard')}
</Text>
```

### RTL layout helpers

A shared `rtl` helper object provides style factories:

```typescript
rtl.row()   // { flexDirection: isRTL ? 'row-reverse' : 'row' }
rtl.text()  // { textAlign: isRTL ? 'right' : 'left' }
```

---

## Locale Files

| File | Language |
|---|---|
| `locales/en.ts` | English |
| `locales/ar.ts` | Arabic |

Both files export a flat record of `string → string` key-value pairs. The `t()` function looks up the active locale and falls back to English if a key is missing from the Arabic file.

---

## Key Naming Convention

Keys use a `screen_section_element` prefix pattern:

| Prefix | Module |
|---|---|
| `nav_` | Bottom tab labels |
| `dash_` | Dashboard screen |
| `subs_` | Subscriptions |
| `banks_` | Banks / Lean connection |
| `bills_` | Bills |
| `loans_` | Loans |
| `goals_` | Savings goals |
| `analytics_` | Analytics screen |
| `agent_` | AI Advisor |
| `settings_` | Settings |
| `premium_` | Premium screen |
| `budget_` | Budgets |
| `common_` | Shared UI strings (Save, Cancel, Delete, …) |

---

## Key Reference (selected)

### Navigation
| Key | English |
|---|---|
| `nav_dashboard` | Dashboard |
| `nav_subscriptions` | Subscriptions |
| `nav_bills` | Bills |
| `nav_loans` | Loans |
| `nav_analytics` | Analytics |
| `nav_banks` | Banks |
| `nav_goals` | Goals |
| `nav_settings` | Settings |

### Dashboard
| Key | English |
|---|---|
| `dash_monthly_total` | Monthly Total |
| `dash_active_subs` | Active Subscriptions |
| `dash_upcoming` | Upcoming Payments |
| `dash_savings_rate` | Savings Rate |

### Subscriptions
| Key | English |
|---|---|
| `subs_add` | Add Subscription |
| `subs_trial_badge` | Trial |
| `subs_shared_badge` | Shared |
| `subs_vat_label` | Include VAT (15%) |
| `subs_duplicate_banner` | Possible duplicates found |
| `subs_cancel_action` | Mark as Cancelled |
| `subs_activate_action` | Mark as Active |

### Analytics
| Key | English |
|---|---|
| `analytics_vs_income` | vs. Income |
| `analytics_savings_no_income` | Set your income to see your savings rate |
| `analytics_creep_score` | Subscription Creep |
| `analytics_savings_rate` | Savings Rate |

### Goals
| Key | English |
|---|---|
| `goals_add` | New Goal |
| `goals_target` | Target Amount |
| `goals_deadline` | Target Date |
| `goals_contribute` | Add Savings |
| `goals_monthly_needed` | Monthly Rate Needed |
| `goals_at_risk` | At Risk |

### AI Advisor
| Key | English |
|---|---|
| `agent_greeting` | Hi! I'm your SubTrack financial advisor. |
| `agent_overspend_alert` | You're spending {{pct}}% of your income on subscriptions. |
| `agent_quick_spending` | Spending overview |
| `agent_quick_savings` | Savings tips |
| `agent_quick_audit` | Subscription audit |
| `agent_quick_debt` | Debt strategy |

### Common
| Key | English |
|---|---|
| `common_save` | Save |
| `common_cancel` | Cancel |
| `common_delete` | Delete |
| `common_confirm` | Confirm |
| `common_loading` | Loading… |
| `common_error` | Something went wrong |

---

## Dates & Numbers

### Dates
- All date inputs use the **DD/MM/YYYY** format, consistent with the Saudi market convention.
- Goal deadlines display both **Gregorian** and **Hijri** equivalents via `formatHijriDate()`.
- Loan payoff dates are localised: the month name is translated when sharing the payoff plan.

### Numbers & Currency
- All monetary amounts are in **SAR (Saudi Riyal)**.
- Large numbers use `toLocaleString()` with the active locale for thousands separators.
- Arabic numerals (٠١٢٣٤٥٦٧٨٩) are not used — Western Arabic numerals are standard in Saudi financial interfaces.

---

## Adding a New Key

1. Add the key and English value to `locales/en.ts`.
2. Add the Arabic translation to `locales/ar.ts`.
3. Use `t('your_new_key')` in the component.

If the Arabic translation is missing, `t()` returns the English fallback automatically.
