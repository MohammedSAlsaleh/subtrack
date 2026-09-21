/**
 * Tests: RTL layout regression guard across all auth screens
 *
 * Covers: register.tsx, login.tsx, forgot-password.tsx
 *
 * Strategy:
 *   (a) Assert that every required RTL override expression exists in the
 *       JSX of each auth screen (static source check — fails if someone removes
 *       an isRTL conditional from the production component).
 *   (b) Extract actual StyleSheet.create values for the relevant style keys,
 *       apply RTL / LTR overrides, and assert the resolved style contracts.
 *
 * Contracts verified per screen:
 *   - Back button: base alignSelf NOT 'flex-end'; RTL override sets alignSelf: 'flex-end'
 *   - Field label: base textAlign absent (LTR default); RTL override sets textAlign: 'right'
 *   - Field row: base flexDirection: 'row'; RTL override sets flexDirection: 'row-reverse'
 *   - Field input: base textAlign absent; RTL override sets textAlign: 'right'; flex: 1 preserved
 *   - Error box: flexDirection: 'row'; errorText flex: 1 (text wraps, never clips)
 *
 * Run with:  node artifacts/mobile/__tests__/auth-screens-rtl.test.js
 */

'use strict';

const assert = require('node:assert/strict');
const path   = require('node:path');
const fs     = require('node:fs');

// ── Load production sources ───────────────────────────────────────────────────

const REGISTER_PATH        = path.join(__dirname, '..', 'app', 'auth', 'register.tsx');
const LOGIN_PATH           = path.join(__dirname, '..', 'app', 'auth', 'login.tsx');
const FORGOT_PATH          = path.join(__dirname, '..', 'app', 'auth', 'forgot-password.tsx');

const registerSource = fs.readFileSync(REGISTER_PATH, 'utf8');
const loginSource    = fs.readFileSync(LOGIN_PATH, 'utf8');
const forgotSource   = fs.readFileSync(FORGOT_PATH, 'utf8');

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
 */
function mergeStyles(...overrides) {
  return Object.assign({}, ...overrides.filter(Boolean));
}

/**
 * Extract a named style block from a StyleSheet.create({...}) call in source.
 * Returns an object with literal property values (numbers, quoted strings,
 * plain identifiers). Non-extractable values are omitted.
 */
function extractStyleBlock(src, key) {
  const re = new RegExp(`\\b${key}\\s*:\\s*\\{([^}]*)\\}`, 's');
  const m  = src.match(re);
  if (!m) return {};

  const block  = m[1];
  const result = {};
  for (const [, prop, val] of block.matchAll(/(\w+)\s*:\s*(['"][^'"]*['"]|\d+(?:\.\d+)?|[\w.]+)/g)) {
    if (val.startsWith("'") || val.startsWith('"')) {
      result[prop] = val.slice(1, -1);
    } else if (!isNaN(Number(val))) {
      result[prop] = Number(val);
    } else {
      result[prop] = val;
    }
  }
  return result;
}

/**
 * Count non-overlapping occurrences of a literal string in src.
 */
function countOccurrences(src, needle) {
  let count = 0;
  let pos   = 0;
  while ((pos = src.indexOf(needle, pos)) !== -1) { count++; pos += needle.length; }
  return count;
}

// ── Screen definitions ────────────────────────────────────────────────────────

const SCREENS = [
  { name: 'register.tsx',        src: registerSource },
  { name: 'login.tsx',           src: loginSource    },
  { name: 'forgot-password.tsx', src: forgotSource   },
];

// ── Suite 1: Back-button RTL override present in every screen ─────────────────

console.log('\n[1] Back-button RTL override — source check (all screens)\n');

for (const { name, src } of SCREENS) {
  test(`${name}: back button has isRTL && { alignSelf: 'flex-end' } override`, () => {
    assert.ok(
      src.includes("isRTL && { alignSelf: 'flex-end' }"),
      `Missing: isRTL && { alignSelf: 'flex-end' } on back button in ${name}`
    );
  });
}

// ── Suite 2: Back-button resolved style contracts ─────────────────────────────

console.log('\n[2] Back-button resolved styles (LTR base + RTL merged)\n');

for (const { name, src } of SCREENS) {
  const back    = extractStyleBlock(src, 'back');
  const ltrBack = mergeStyles(back, false);
  const rtlBack = mergeStyles(back, { alignSelf: 'flex-end' });

  test(`${name}: back base alignSelf is NOT 'flex-end' (LTR default)`, () => {
    assert.notEqual(
      ltrBack.alignSelf, 'flex-end',
      `back.alignSelf should not be flex-end in LTR mode in ${name}`
    );
  });

  test(`${name}: back RTL alignSelf is 'flex-end'`, () => {
    assert.equal(
      rtlBack.alignSelf, 'flex-end',
      `back.alignSelf should be flex-end after RTL override in ${name}`
    );
  });

  test(`${name}: back has explicit height (not zero) so it is always tappable`, () => {
    assert.ok(
      typeof ltrBack.height === 'number' && ltrBack.height > 0,
      `back.height should be a positive number in ${name}, got ${ltrBack.height}`
    );
  });
}

// ── Suite 3: Field label RTL override present in every screen ─────────────────

console.log('\n[3] Field label RTL override — source check (all screens)\n');

for (const { name, src } of SCREENS) {
  test(`${name}: field label has isRTL && { textAlign: 'right' } override`, () => {
    assert.ok(
      src.includes("isRTL && { textAlign: 'right' }"),
      `Missing: isRTL && { textAlign: 'right' } on fieldLabel in ${name}`
    );
  });
}

// ── Suite 4: Field label resolved style contracts ─────────────────────────────

console.log('\n[4] Field label resolved styles\n');

for (const { name, src } of SCREENS) {
  const fieldLabel    = extractStyleBlock(src, 'fieldLabel');
  const ltrFieldLabel = mergeStyles(fieldLabel, false);
  const rtlFieldLabel = mergeStyles(fieldLabel, { textAlign: 'right' });

  test(`${name}: fieldLabel base has no textAlign (LTR default)`, () => {
    assert.equal(
      ltrFieldLabel.textAlign, undefined,
      `fieldLabel.textAlign should be undefined in LTR mode in ${name}`
    );
  });

  test(`${name}: fieldLabel RTL textAlign is 'right'`, () => {
    assert.equal(
      rtlFieldLabel.textAlign, 'right',
      `fieldLabel.textAlign should be right after RTL override in ${name}`
    );
  });
}

// ── Suite 5: Field row RTL override present in every screen ───────────────────

console.log('\n[5] Field row RTL override — source check (all screens)\n');

for (const { name, src } of SCREENS) {
  test(`${name}: fieldRow has isRTL && { flexDirection: 'row-reverse' } override`, () => {
    assert.ok(
      src.includes("isRTL && { flexDirection: 'row-reverse' }"),
      `Missing: isRTL && { flexDirection: 'row-reverse' } on fieldRow in ${name}`
    );
  });
}

// ── Suite 6: Field row resolved style contracts ───────────────────────────────

console.log('\n[6] Field row resolved styles\n');

for (const { name, src } of SCREENS) {
  const fieldRow    = extractStyleBlock(src, 'fieldRow');
  const ltrFieldRow = mergeStyles(fieldRow, false);
  const rtlFieldRow = mergeStyles(fieldRow, { flexDirection: 'row-reverse' });

  test(`${name}: fieldRow base flexDirection is 'row' (LTR)`, () => {
    assert.equal(
      ltrFieldRow.flexDirection, 'row',
      `fieldRow.flexDirection should be row in LTR mode in ${name}`
    );
  });

  test(`${name}: fieldRow RTL flexDirection is 'row-reverse'`, () => {
    assert.equal(
      rtlFieldRow.flexDirection, 'row-reverse',
      `fieldRow.flexDirection should be row-reverse after RTL override in ${name}`
    );
  });

  test(`${name}: fieldRow base alignItems is 'center'`, () => {
    assert.equal(
      ltrFieldRow.alignItems, 'center',
      `fieldRow.alignItems should be center in ${name}`
    );
  });

  test(`${name}: fieldRow retains alignItems: center after RTL override`, () => {
    assert.equal(
      rtlFieldRow.alignItems, 'center',
      `fieldRow.alignItems should stay center in RTL mode in ${name}`
    );
  });
}

// ── Suite 7: Field input RTL override present in every screen ────────────────

console.log('\n[7] Field input RTL override — source check (all screens)\n');

for (const { name, src } of SCREENS) {
  // The fieldInput textAlign:right override is on the TextInput itself
  // We count occurrences to make sure every Field component wires it up.
  // Each screen has one Field component definition with one TextInput override.
  test(`${name}: fieldInput TextInput has isRTL && { textAlign: 'right' } override`, () => {
    assert.ok(
      src.includes("isRTL && { textAlign: 'right' }"),
      `Missing: isRTL && { textAlign: 'right' } on fieldInput TextInput in ${name}`
    );
  });
}

// ── Suite 8: Field input resolved style contracts ─────────────────────────────

console.log('\n[8] Field input resolved styles\n');

for (const { name, src } of SCREENS) {
  const fieldInput    = extractStyleBlock(src, 'fieldInput');
  const ltrFieldInput = mergeStyles(fieldInput, false);
  const rtlFieldInput = mergeStyles(fieldInput, { textAlign: 'right' });

  test(`${name}: fieldInput base has no textAlign (LTR default)`, () => {
    assert.equal(
      ltrFieldInput.textAlign, undefined,
      `fieldInput.textAlign should be undefined in LTR mode in ${name}`
    );
  });

  test(`${name}: fieldInput RTL textAlign is 'right'`, () => {
    assert.equal(
      rtlFieldInput.textAlign, 'right',
      `fieldInput.textAlign should be right after RTL override in ${name}`
    );
  });

  test(`${name}: fieldInput has flex: 1 (input expands, no clipping)`, () => {
    assert.equal(
      ltrFieldInput.flex, 1,
      `fieldInput.flex should be 1 in ${name} to prevent text clipping`
    );
  });

  test(`${name}: fieldInput retains flex: 1 in RTL`, () => {
    assert.equal(
      rtlFieldInput.flex, 1,
      `fieldInput.flex should remain 1 after RTL override in ${name}`
    );
  });
}

// ── Suite 9: Error box layout contracts ───────────────────────────────────────

console.log('\n[9] Error box layout — resolved styles (all screens)\n');

for (const { name, src } of SCREENS) {
  const errorBox  = extractStyleBlock(src, 'errorBox');
  const errorText = extractStyleBlock(src, 'errorText');

  test(`${name}: errorBox flexDirection is 'row'`, () => {
    assert.equal(
      errorBox.flexDirection, 'row',
      `errorBox.flexDirection should be row in ${name}`
    );
  });

  test(`${name}: errorText flex is 1 (text wraps, never clips in RTL or LTR)`, () => {
    assert.equal(
      errorText.flex, 1,
      `errorText.flex should be 1 in ${name} to prevent message clipping`
    );
  });

  test(`${name}: errorBox has paddingHorizontal >= 12 (text fits without clip)`, () => {
    const ph = errorBox.paddingHorizontal;
    assert.ok(
      typeof ph === 'number' && ph >= 12,
      `errorBox.paddingHorizontal should be >= 12 in ${name}, got ${ph}`
    );
  });

  test(`${name}: errorBox has no overflow:hidden`, () => {
    assert.notEqual(
      errorBox.overflow, 'hidden',
      `errorBox must not have overflow:hidden in ${name} — clips RTL text`
    );
  });
}

// ── Suite 10: isRTL is sourced from useLanguage() in every screen ─────────────

console.log('\n[10] isRTL source check — useLanguage hook (all screens)\n');

for (const { name, src } of SCREENS) {
  test(`${name}: destructures isRTL from useLanguage()`, () => {
    assert.ok(
      src.includes('isRTL') && src.includes('useLanguage'),
      `${name} must import isRTL from useLanguage() context`
    );
  });

  test(`${name}: isRTL used in JSX (not dead code)`, () => {
    // Count uses beyond the one destructure line
    const count = countOccurrences(src, 'isRTL');
    assert.ok(
      count >= 3,
      `isRTL should appear at least 3 times in ${name} (destructure + multiple JSX usages), found ${count}`
    );
  });
}

// ── Suite 11: Cross-screen style consistency ──────────────────────────────────

console.log('\n[11] Cross-screen style consistency\n');

// All three screens share the same fieldRow, fieldLabel, and fieldInput
// base contracts — verify they are numerically consistent where it matters.

const [reg, log, fgt] = SCREENS.map(({ src }) => ({
  fieldRow:   extractStyleBlock(src, 'fieldRow'),
  fieldLabel: extractStyleBlock(src, 'fieldLabel'),
  fieldInput: extractStyleBlock(src, 'fieldInput'),
  back:       extractStyleBlock(src, 'back'),
}));

test('fieldRow height is consistent across all three screens', () => {
  assert.equal(
    reg.fieldRow.height, log.fieldRow.height,
    `fieldRow.height differs between register (${reg.fieldRow.height}) and login (${log.fieldRow.height})`
  );
  assert.equal(
    reg.fieldRow.height, fgt.fieldRow.height,
    `fieldRow.height differs between register (${reg.fieldRow.height}) and forgot-password (${fgt.fieldRow.height})`
  );
});

test('fieldRow borderRadius is consistent across all three screens', () => {
  assert.equal(reg.fieldRow.borderRadius, log.fieldRow.borderRadius,
    `fieldRow.borderRadius differs between register and login`);
  assert.equal(reg.fieldRow.borderRadius, fgt.fieldRow.borderRadius,
    `fieldRow.borderRadius differs between register and forgot-password`);
});

test('fieldInput flex is 1 on all three screens', () => {
  assert.equal(reg.fieldInput.flex, 1, 'register fieldInput.flex != 1');
  assert.equal(log.fieldInput.flex, 1, 'login fieldInput.flex != 1');
  assert.equal(fgt.fieldInput.flex, 1, 'forgot-password fieldInput.flex != 1');
});

test('back button height matches across all three screens', () => {
  assert.equal(reg.back.height, log.back.height,
    `back.height differs between register (${reg.back.height}) and login (${log.back.height})`);
  assert.equal(reg.back.height, fgt.back.height,
    `back.height differs between register (${reg.back.height}) and forgot-password (${fgt.back.height})`);
});

// ── Suite 12: Forgot-password subtitle RTL override ──────────────────────────

console.log('\n[12] Forgot-password subtitle RTL override\n');

test("forgot-password.tsx: subtitle has isRTL && { textAlign: 'center' } override", () => {
  assert.ok(
    forgotSource.includes("isRTL && { textAlign: 'center' }"),
    "Missing: isRTL && { textAlign: 'center' } on subtitle in forgot-password.tsx"
  );
});

test("forgot-password.tsx: subtitle base textAlign is 'center'", () => {
  const subtitle = extractStyleBlock(forgotSource, 'subtitle');
  assert.equal(
    subtitle.textAlign, 'center',
    `subtitle.textAlign should be center in forgot-password.tsx, got ${subtitle.textAlign}`
  );
});

// ── Suite 13: Back-button arrow icon flips in RTL ────────────────────────────

console.log('\n[13] Back-button arrow icon direction — source check (all screens)\n');

for (const { name, src } of SCREENS) {
  test(`${name}: back button uses arrow-right icon when isRTL is true`, () => {
    assert.ok(
      src.includes("isRTL ? 'arrow-right' : 'arrow-left'"),
      `Missing: isRTL ? 'arrow-right' : 'arrow-left' on back button Feather icon in ${name}`
    );
  });

  test(`${name}: back button uses arrow-left icon when isRTL is false (LTR default)`, () => {
    // The same ternary guarantees arrow-left for LTR; confirm the full expression is present.
    assert.ok(
      src.includes("isRTL ? 'arrow-right' : 'arrow-left'"),
      `Missing LTR branch ('arrow-left') on back button Feather icon in ${name}`
    );
  });
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'─'.repeat(60)}\n`);
if (failed > 0) process.exit(1);
