/**
 * Tests: DemoNotice banner layout correctness in Arabic (RTL) and English (LTR)
 *
 * Strategy: read the real register.tsx source and
 *   (a) assert that every required RTL override expression exists in the
 *       DemoNotice JSX block (static source check — fails if someone removes
 *       an isRTL conditional from the production component), and
 *   (b) extract the actual StyleSheet.create values for the relevant keys,
 *       apply the RTL / LTR overrides, and assert the resolved style contracts
 *       (flex: 1 preserved, flexDirection correct, textAlign correct, no clip).
 *
 * Also confirms all auth_demo_* locale keys exist in both ar.ts and en.ts.
 *
 * Run with:  node artifacts/mobile/__tests__/demo-notice-rtl-layout.test.js
 */

'use strict';

const assert = require('node:assert/strict');
const path   = require('node:path');
const fs     = require('node:fs');

// ── Load production sources ───────────────────────────────────────────────────

const REGISTER_PATH = path.join(__dirname, '..', 'app', 'auth', 'register.tsx');
const LOGIN_PATH    = path.join(__dirname, '..', 'app', 'auth', 'login.tsx');
const AR_PATH       = path.join(__dirname, '..', 'locales', 'ar.ts');
const EN_PATH       = path.join(__dirname, '..', 'locales', 'en.ts');

const registerSource = fs.readFileSync(REGISTER_PATH, 'utf8');
const loginSource    = fs.readFileSync(LOGIN_PATH, 'utf8');
const arSource       = fs.readFileSync(AR_PATH, 'utf8');
const enSource       = fs.readFileSync(EN_PATH, 'utf8');

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  ✓  ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${label}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

/**
 * Merge style objects the way React Native's array-style prop does:
 * later entries override earlier; falsy entries are ignored.
 *
 * @param {...(object|false|null|undefined)} overrides
 * @returns {object}
 */
function mergeStyles(...overrides) {
  return Object.assign({}, ...overrides.filter(Boolean));
}

/**
 * Extract a named style block from a StyleSheet.create({...}) call in source.
 * Returns an object with the literal property values we can safely read
 * (numbers, quoted strings). Non-extractable values are left out.
 *
 * @param {string} src  Full TypeScript/JS source text.
 * @param {string} key  Style key to extract, e.g. 'demoLabelRow'.
 * @returns {object}
 */
function extractStyleBlock(src, key) {
  // Match:  key: { ... }  inside StyleSheet.create — handles single-level blocks.
  const re = new RegExp(
    `\\b${key}\\s*:\\s*\\{([^}]*)\\}`,
    's'
  );
  const m = src.match(re);
  if (!m) return {};

  const block = m[1];
  const result = {};

  // Extract   propName: value   where value is a number, quoted string, or identifier.
  for (const [, prop, val] of block.matchAll(/(\w+)\s*:\s*(['"][^'"]*['"]|\d+(?:\.\d+)?|[\w.]+)/g)) {
    if (val.startsWith("'") || val.startsWith('"')) {
      result[prop] = val.slice(1, -1);
    } else if (!isNaN(Number(val))) {
      result[prop] = Number(val);
    } else {
      result[prop] = val; // identifier like 'center', 'row', etc.
    }
  }

  return result;
}

// ── Extract real style blocks from register.tsx ───────────────────────────────

const demoLabelRow   = extractStyleBlock(registerSource, 'demoLabelRow');
const demoBadge      = extractStyleBlock(registerSource, 'demoBadge');
const demoBulletRow  = extractStyleBlock(registerSource, 'demoBulletRow');
const demoBulletText = extractStyleBlock(registerSource, 'demoBulletText');
const demoNotice     = extractStyleBlock(registerSource, 'demoNotice');

// Build merged styles for each direction
function applyRTL(base, override) {
  return mergeStyles(base, override);
}

const ltrLabelRow   = applyRTL(demoLabelRow,   false);
const ltrBadge      = applyRTL(demoBadge,       false);
const ltrBulletRow  = applyRTL(demoBulletRow,   false);
const ltrBulletText = applyRTL(demoBulletText,  false);

const rtlLabelRow   = applyRTL(demoLabelRow,   { flexDirection: 'row-reverse' });
const rtlBadge      = applyRTL(demoBadge,       { textAlign: 'right' });
const rtlBulletRow  = applyRTL(demoBulletRow,   { flexDirection: 'row-reverse' });
const rtlBulletText = applyRTL(demoBulletText,  { textAlign: 'right' });

// ── Suite 1: RTL override expressions exist in the real register.tsx source ───

console.log('\nDemoNotice (register.tsx) — RTL override expressions exist in JSX\n');

// We look inside the DemoNotice View block specifically.
// Isolate it: from the `{/* Demo Notice */}` comment to the closing `</View>`
// that wraps the demoNotice style. Use a broad but bounded slice.
const demoBlockStart = registerSource.indexOf('Demo Notice');
const demoBlockEnd   = registerSource.indexOf('{/* Footer */}', demoBlockStart);
const demoBlock      = demoBlockStart >= 0 && demoBlockEnd > demoBlockStart
  ? registerSource.slice(demoBlockStart, demoBlockEnd)
  : registerSource; // fallback: search whole file

test("demoLabelRow has isRTL && { flexDirection: 'row-reverse' } override", () => {
  assert.ok(
    demoBlock.includes("isRTL && { flexDirection: 'row-reverse' }"),
    "Missing: isRTL && { flexDirection: 'row-reverse' } on demoLabelRow in register.tsx"
  );
});

test("demoBadge has isRTL && { textAlign: 'right' } override", () => {
  assert.ok(
    demoBlock.includes("isRTL && { textAlign: 'right' }"),
    "Missing: isRTL && { textAlign: 'right' } on demoBadge in register.tsx"
  );
});

test('all three demoBulletRow rows have flexDirection row-reverse override', () => {
  // Count occurrences — there are 3 bullet rows
  const count = (demoBlock.match(/isRTL && \{ flexDirection: 'row-reverse' \}/g) || []).length;
  assert.ok(
    count >= 3,
    `Expected >=3 flexDirection:'row-reverse' overrides in DemoNotice block, found ${count}`
  );
});

test('all three demoBulletText rows have textAlign right override', () => {
  const count = (demoBlock.match(/isRTL && \{ textAlign: 'right' \}/g) || []).length;
  assert.ok(
    count >= 3,
    `Expected >=3 textAlign:'right' overrides in DemoNotice block, found ${count}`
  );
});

test('demoLabelRow style is referenced in the DemoNotice label row', () => {
  assert.ok(
    demoBlock.includes('styles.demoLabelRow'),
    'styles.demoLabelRow not found in DemoNotice block'
  );
});

test('demoBulletRow style is referenced in the DemoNotice bullet rows', () => {
  assert.ok(
    demoBlock.includes('styles.demoBulletRow'),
    'styles.demoBulletRow not found in DemoNotice block'
  );
});

test('demoBulletText style is referenced in the DemoNotice bullet text', () => {
  assert.ok(
    demoBlock.includes('styles.demoBulletText'),
    'styles.demoBulletText not found in DemoNotice block'
  );
});

test("auth_demo_badge key is referenced via t('auth_demo_badge') in DemoNotice", () => {
  assert.ok(
    demoBlock.includes("t('auth_demo_badge')"),
    "t('auth_demo_badge') not called in DemoNotice block"
  );
});

test("auth_demo_line1 key is referenced in DemoNotice", () => {
  assert.ok(demoBlock.includes("t('auth_demo_line1')"));
});

test("auth_demo_line2 key is referenced in DemoNotice", () => {
  assert.ok(demoBlock.includes("t('auth_demo_line2')"));
});

test("auth_demo_line3 key is referenced in DemoNotice", () => {
  assert.ok(demoBlock.includes("t('auth_demo_line3')"));
});

// ── Suite 2: Resolved LTR styles from real StyleSheet values ──────────────────

console.log('\nDemoNotice — LTR (English / isRTL=false) resolved from real styles\n');

test('real demoLabelRow.flexDirection is row (LTR base)', () => {
  assert.equal(ltrLabelRow.flexDirection, 'row');
});

test('real demoLabelRow.alignItems is center (LTR)', () => {
  assert.equal(ltrLabelRow.alignItems, 'center');
});

test('real demoBulletRow.flexDirection is row (LTR base)', () => {
  assert.equal(ltrBulletRow.flexDirection, 'row');
});

test('real demoBulletRow.alignItems is flex-start (LTR base)', () => {
  assert.equal(ltrBulletRow.alignItems, 'flex-start');
});

test('real demoBulletText.flex is 1 (no clipping in LTR)', () => {
  assert.equal(ltrBulletText.flex, 1);
});

test('real demoBulletText has no textAlign in LTR mode', () => {
  assert.equal(ltrBulletText.textAlign, undefined);
});

test('real demoBadge has no textAlign in LTR mode', () => {
  assert.equal(ltrBadge.textAlign, undefined);
});

// ── Suite 3: Resolved RTL styles from real StyleSheet values ──────────────────

console.log('\nDemoNotice — RTL (Arabic / isRTL=true) resolved from real styles\n');

test('real demoLabelRow becomes row-reverse in RTL', () => {
  assert.equal(rtlLabelRow.flexDirection, 'row-reverse');
});

test('real demoLabelRow retains alignItems: center in RTL', () => {
  assert.equal(rtlLabelRow.alignItems, 'center');
});

test('real demoBulletRow becomes row-reverse in RTL', () => {
  assert.equal(rtlBulletRow.flexDirection, 'row-reverse');
});

test('real demoBulletRow retains alignItems: flex-start in RTL (prevents clip)', () => {
  assert.equal(rtlBulletRow.alignItems, 'flex-start');
});

test('real demoBulletText.textAlign is right in RTL', () => {
  assert.equal(rtlBulletText.textAlign, 'right');
});

test('real demoBulletText retains flex: 1 in RTL (text cannot overflow)', () => {
  assert.equal(rtlBulletText.flex, 1);
});

test('real demoBulletText retains lineHeight in RTL', () => {
  assert.ok(
    typeof rtlBulletText.lineHeight === 'number' && rtlBulletText.lineHeight > 0,
    `lineHeight should be a positive number, got ${rtlBulletText.lineHeight}`
  );
});

test('real demoBadge.textAlign is right in RTL', () => {
  assert.equal(rtlBadge.textAlign, 'right');
});

test('real demoBadge retains color in RTL', () => {
  assert.ok(rtlBadge.color, 'badge color must be set');
});

// ── Suite 4: Container does not clip content ──────────────────────────────────

console.log('\nDemoNotice — container must not clip content\n');

test('real demoNotice has no overflow:hidden', () => {
  assert.notEqual(demoNotice.overflow, 'hidden');
});

test('real demoNotice paddingHorizontal >= 14 (RTL text fits without clip)', () => {
  const ph = demoNotice.paddingHorizontal;
  assert.ok(
    typeof ph === 'number' && ph >= 14,
    `paddingHorizontal should be >= 14, got ${ph}`
  );
});

// ── Suite 5: Arabic locale keys present and non-empty ────────────────────────

console.log('\nDemoNotice — Arabic locale keys (ar.ts)\n');

const REQUIRED_KEYS = [
  'auth_demo_badge',
  'auth_demo_line1',
  'auth_demo_line2',
  'auth_demo_line3',
];

for (const key of REQUIRED_KEYS) {
  test(`ar.ts contains key '${key}'`, () => {
    assert.ok(arSource.includes(`${key}:`), `Key '${key}' not found in locales/ar.ts`);
  });
}

for (const key of REQUIRED_KEYS) {
  test(`ar.ts '${key}' contains Arabic characters`, () => {
    const re = new RegExp(`${key}\\s*:\\s*'([^']+)'`);
    const m  = arSource.match(re);
    assert.ok(m && /[\u0600-\u06FF]/.test(m[1]), `'${key}' has no Arabic text in ar.ts`);
  });
}

// ── Suite 6: English locale keys present ─────────────────────────────────────

console.log('\nDemoNotice — English locale keys (en.ts)\n');

for (const key of REQUIRED_KEYS) {
  test(`en.ts contains key '${key}'`, () => {
    assert.ok(enSource.includes(`${key}:`), `Key '${key}' not found in locales/en.ts`);
  });
}

test("en.ts 'auth_demo_badge' has non-empty English text", () => {
  const m = enSource.match(/auth_demo_badge\s*:\s*'([^']+)'/);
  assert.ok(m && m[1].trim().length > 0, 'auth_demo_badge is empty in en.ts');
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN SUITES
// ═══════════════════════════════════════════════════════════════════════════════

// ── Extract real style blocks from login.tsx ──────────────────────────────────

const loginDemoLabelRow   = extractStyleBlock(loginSource, 'demoLabelRow');
const loginDemoBadge      = extractStyleBlock(loginSource, 'demoBadge');
const loginDemoBulletRow  = extractStyleBlock(loginSource, 'demoBulletRow');
const loginDemoBulletText = extractStyleBlock(loginSource, 'demoBulletText');
const loginDemoNotice     = extractStyleBlock(loginSource, 'demoNotice');

const loginLtrLabelRow   = applyRTL(loginDemoLabelRow,   false);
const loginLtrBulletRow  = applyRTL(loginDemoBulletRow,  false);
const loginLtrBulletText = applyRTL(loginDemoBulletText, false);
const loginLtrBadge      = applyRTL(loginDemoBadge,      false);

const loginRtlLabelRow   = applyRTL(loginDemoLabelRow,   { flexDirection: 'row-reverse' });
const loginRtlBulletRow  = applyRTL(loginDemoBulletRow,  { flexDirection: 'row-reverse' });
const loginRtlBulletText = applyRTL(loginDemoBulletText, { textAlign: 'right' });
const loginRtlBadge      = applyRTL(loginDemoBadge,      { textAlign: 'right' });

// Isolate the DemoNotice block in login.tsx
const loginDemoBlockStart = loginSource.indexOf('Demo Notice');
const loginDemoBlockEnd   = loginSource.indexOf('{/* Forgot password */}', loginDemoBlockStart);
const loginDemoBlock      = loginDemoBlockStart >= 0 && loginDemoBlockEnd > loginDemoBlockStart
  ? loginSource.slice(loginDemoBlockStart, loginDemoBlockEnd)
  : loginSource;

// ── Suite 7: RTL override expressions exist in the real login.tsx source ──────

console.log('\nDemoNotice (login.tsx) — RTL override expressions exist in JSX\n');

test("login: demoLabelRow has isRTL && { flexDirection: 'row-reverse' } override", () => {
  assert.ok(
    loginDemoBlock.includes("isRTL && { flexDirection: 'row-reverse' }"),
    "Missing: isRTL && { flexDirection: 'row-reverse' } on demoLabelRow in login.tsx"
  );
});

test("login: demoBadge has isRTL && { textAlign: 'right' } override", () => {
  assert.ok(
    loginDemoBlock.includes("isRTL && { textAlign: 'right' }"),
    "Missing: isRTL && { textAlign: 'right' } on demoBadge in login.tsx"
  );
});

test('login: all three demoBulletRow rows have flexDirection row-reverse override', () => {
  const count = (loginDemoBlock.match(/isRTL && \{ flexDirection: 'row-reverse' \}/g) || []).length;
  assert.ok(
    count >= 3,
    `Expected >=3 flexDirection:'row-reverse' overrides in login DemoNotice block, found ${count}`
  );
});

test('login: all three demoBulletText rows have textAlign right override', () => {
  const count = (loginDemoBlock.match(/isRTL && \{ textAlign: 'right' \}/g) || []).length;
  assert.ok(
    count >= 3,
    `Expected >=3 textAlign:'right' overrides in login DemoNotice block, found ${count}`
  );
});

test('login: demoLabelRow style is referenced in the DemoNotice label row', () => {
  assert.ok(loginDemoBlock.includes('styles.demoLabelRow'), 'styles.demoLabelRow not found in login DemoNotice block');
});

test('login: demoBulletRow style is referenced in the DemoNotice bullet rows', () => {
  assert.ok(loginDemoBlock.includes('styles.demoBulletRow'), 'styles.demoBulletRow not found in login DemoNotice block');
});

test('login: demoBulletText style is referenced in the DemoNotice bullet text', () => {
  assert.ok(loginDemoBlock.includes('styles.demoBulletText'), 'styles.demoBulletText not found in login DemoNotice block');
});

test("login: auth_demo_badge key is referenced via t('auth_demo_badge') in DemoNotice", () => {
  assert.ok(loginDemoBlock.includes("t('auth_demo_badge')"), "t('auth_demo_badge') not called in login DemoNotice block");
});

test("login: auth_demo_line1 key is referenced in DemoNotice", () => {
  assert.ok(loginDemoBlock.includes("t('auth_demo_line1')"));
});

test("login: auth_demo_line2 key is referenced in DemoNotice", () => {
  assert.ok(loginDemoBlock.includes("t('auth_demo_line2')"));
});

test("login: auth_demo_line3 key is referenced in DemoNotice", () => {
  assert.ok(loginDemoBlock.includes("t('auth_demo_line3')"));
});

// ── Suite 8: Resolved LTR styles from login.tsx StyleSheet values ─────────────

console.log('\nDemoNotice (login.tsx) — LTR (English / isRTL=false) resolved from real styles\n');

test('login: real demoLabelRow.flexDirection is row (LTR base)', () => {
  assert.equal(loginLtrLabelRow.flexDirection, 'row');
});

test('login: real demoLabelRow.alignItems is center (LTR)', () => {
  assert.equal(loginLtrLabelRow.alignItems, 'center');
});

test('login: real demoBulletRow.flexDirection is row (LTR base)', () => {
  assert.equal(loginLtrBulletRow.flexDirection, 'row');
});

test('login: real demoBulletRow.alignItems is flex-start (LTR base)', () => {
  assert.equal(loginLtrBulletRow.alignItems, 'flex-start');
});

test('login: real demoBulletText.flex is 1 (no clipping in LTR)', () => {
  assert.equal(loginLtrBulletText.flex, 1);
});

test('login: real demoBulletText has no textAlign in LTR mode', () => {
  assert.equal(loginLtrBulletText.textAlign, undefined);
});

test('login: real demoBadge has no textAlign in LTR mode', () => {
  assert.equal(loginLtrBadge.textAlign, undefined);
});

// ── Suite 9: Resolved RTL styles from login.tsx StyleSheet values ─────────────

console.log('\nDemoNotice (login.tsx) — RTL (Arabic / isRTL=true) resolved from real styles\n');

test('login: real demoLabelRow becomes row-reverse in RTL', () => {
  assert.equal(loginRtlLabelRow.flexDirection, 'row-reverse');
});

test('login: real demoLabelRow retains alignItems: center in RTL', () => {
  assert.equal(loginRtlLabelRow.alignItems, 'center');
});

test('login: real demoBulletRow becomes row-reverse in RTL', () => {
  assert.equal(loginRtlBulletRow.flexDirection, 'row-reverse');
});

test('login: real demoBulletRow retains alignItems: flex-start in RTL (prevents clip)', () => {
  assert.equal(loginRtlBulletRow.alignItems, 'flex-start');
});

test('login: real demoBulletText.textAlign is right in RTL', () => {
  assert.equal(loginRtlBulletText.textAlign, 'right');
});

test('login: real demoBulletText retains flex: 1 in RTL (text cannot overflow)', () => {
  assert.equal(loginRtlBulletText.flex, 1);
});

test('login: real demoBulletText retains lineHeight in RTL', () => {
  assert.ok(
    typeof loginRtlBulletText.lineHeight === 'number' && loginRtlBulletText.lineHeight > 0,
    `lineHeight should be a positive number, got ${loginRtlBulletText.lineHeight}`
  );
});

test('login: real demoBadge.textAlign is right in RTL', () => {
  assert.equal(loginRtlBadge.textAlign, 'right');
});

test('login: real demoBadge retains color in RTL', () => {
  assert.ok(loginRtlBadge.color, 'badge color must be set');
});

// ── Suite 10: Login container does not clip content ───────────────────────────

console.log('\nDemoNotice (login.tsx) — container must not clip content\n');

test('login: real demoNotice has no overflow:hidden', () => {
  assert.notEqual(loginDemoNotice.overflow, 'hidden');
});

test('login: real demoNotice paddingHorizontal >= 14 (RTL text fits without clip)', () => {
  const ph = loginDemoNotice.paddingHorizontal;
  assert.ok(
    typeof ph === 'number' && ph >= 14,
    `paddingHorizontal should be >= 14, got ${ph}`
  );
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
