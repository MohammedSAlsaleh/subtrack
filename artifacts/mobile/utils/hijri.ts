/**
 * Inline Gregorian → Hijri (Islamic) calendar conversion.
 * Uses the tabular Islamic calendar algorithm (civil epoch).
 * Accurate to ±1 day vs. Umm al-Qura for most dates.
 * No external dependencies required.
 */

export interface HijriDate {
  day: number;
  month: number; // 1-based
  year: number;
}

/** Convert a Gregorian date to its Hijri equivalent. */
export function gregorianToHijri(gYear: number, gMonth: number, gDay: number): HijriDate {
  // Step 1: Gregorian → Julian Day Number (JDN)
  const a = Math.floor((14 - gMonth) / 12);
  const y = gYear + 4800 - a;
  const m = gMonth + 12 * a - 3;
  const jdn =
    gDay +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  // Step 2: JDN → Hijri (Watt's / Fliegel–van Flandern tabular algorithm)
  const l = jdn - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l3) / 709);
  const day = l3 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  return { day, month, year };
}

/** Gregorian→Hijri from an ISO date string (YYYY-MM-DD). */
export function isoToHijri(iso: string): HijriDate {
  const [yyyy, mm, dd] = iso.split('-').map(Number);
  return gregorianToHijri(yyyy, mm, dd);
}

// ── Month name tables ─────────────────────────────────────────────────────────

export const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', 'Dhul-Qa\'dah', 'Dhul-Hijjah',
];

export const HIJRI_MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

/** Eastern Arabic (Indic) digit map */
const EASTERN_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

function toEasternArabic(n: number): string {
  return String(n).replace(/\d/g, d => EASTERN_DIGITS[parseInt(d, 10)]);
}

/**
 * Returns a formatted Hijri date string.
 * @param iso   ISO date string (YYYY-MM-DD)
 * @param lang  'ar' → Arabic month names + Eastern Arabic numerals; else English
 */
export function formatHijriDate(iso: string, lang: 'en' | 'ar'): string {
  const { day, month, year } = isoToHijri(iso);
  if (lang === 'ar') {
    return `${toEasternArabic(day)} ${HIJRI_MONTHS_AR[month - 1]} ${toEasternArabic(year)}`;
  }
  return `${day} ${HIJRI_MONTHS_EN[month - 1]} ${year}`;
}
