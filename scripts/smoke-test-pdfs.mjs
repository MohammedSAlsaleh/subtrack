#!/usr/bin/env node
/**
 * Smoke test — PDF generation palette integrity
 * ─────────────────────────────────────────────
 * Verifies that:
 *   1. pdf-palette.mjs exports a valid C object whose every value is a
 *      well-formed 6-digit hex colour string.
 *   2. Both generator scripts import from pdf-palette.mjs and reference
 *      every palette key through `C.*` (so a rename cannot go unnoticed).
 *   3. Both generators run to completion without errors.
 *   4. Every output PDF exists, begins with a valid %PDF- header, and is
 *      larger than a minimum threshold (not an empty/truncated file).
 *
 * Exit code 0 → all checks pass.
 * Exit code 1 → at least one check failed (details printed to stderr).
 *
 * Run via:
 *   pnpm --filter @workspace/scripts run test:pdfs
 * or directly from the repo root:
 *   node scripts/smoke-test-pdfs.mjs
 */

import { execSync }              from 'child_process';
import { statSync, readFileSync } from 'fs';
import { fileURLToPath }          from 'url';
import { resolve, dirname }       from 'path';
import { C }                      from './pdf-palette.mjs';

// Resolve all paths relative to this script's directory so the test runs
// correctly regardless of the working directory (e.g. when pnpm sets cwd
// to the scripts/ package directory).
const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = resolve(__dirname, '..');       // repo root
const r         = (...parts) => resolve(root, ...parts); // shorthand

// ── Test harness ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.error(`  ❌  ${label}${detail ? `  →  ${detail}` : ''}`);
    failed++;
  }
}

// ── 1. Palette validation ─────────────────────────────────────────────────────
console.log('\n── 1. pdf-palette.mjs exports ───────────────────────────────────────────');

const EXPECTED_KEYS = [
  'h1', 'h2', 'h3', 'h4',
  'body', 'muted',
  'code', 'codeBg',
  'border', 'tHead', 'tAlt',
  'accent',
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

assert(
  'C is a non-null object',
  typeof C === 'object' && C !== null,
  `got ${typeof C}`,
);

for (const key of EXPECTED_KEYS) {
  const val = C[key];
  assert(
    `C.${key} is a valid 6-digit hex  (${val})`,
    typeof val === 'string' && HEX_RE.test(val),
    `got ${JSON.stringify(val)}`,
  );
}

const extraKeys = Object.keys(C).filter(k => !EXPECTED_KEYS.includes(k));
assert(
  'No unexpected extra palette keys',
  extraKeys.length === 0,
  extraKeys.length ? `extra keys: ${extraKeys.join(', ')}` : '',
);

// ── 2. Generator scripts reference the palette correctly ──────────────────────
console.log('\n── 2. Generator source references ───────────────────────────────────────');

const GENERATORS = [
  r('scripts/generate-docs.mjs'),
  r('scripts/generate-feature-marketing-pdfs.mjs'),
];

const generatorSources = Object.fromEntries(
  GENERATORS.map(g => [g, readFileSync(g, 'utf8')]),
);

for (const [path, src] of Object.entries(generatorSources)) {
  assert(
    `${path} imports from './pdf-palette.mjs'`,
    src.includes("from './pdf-palette.mjs'"),
  );
}

// Every palette key must be referenced as C.<key> in at least one generator
const allSrc = Object.values(generatorSources).join('\n');
for (const key of EXPECTED_KEYS) {
  const token = `C.${key}`;
  assert(
    `${token} is used in at least one generator`,
    allSrc.includes(token),
  );
}

// ── 3. Generators run without errors ─────────────────────────────────────────
console.log('\n── 3. Generator execution ───────────────────────────────────────────────');

function runGenerator(label, cmd) {
  try {
    execSync(cmd, { stdio: 'pipe', cwd: root });
    assert(`${label} exits cleanly`, true);
  } catch (err) {
    const firstLine = (err.stderr?.toString() || err.message || '').split('\n')[0];
    assert(`${label} exits cleanly`, false, firstLine);
  }
}

runGenerator('generate-docs.mjs',                   'node scripts/generate-docs.mjs');
runGenerator('generate-feature-marketing-pdfs.mjs', 'node scripts/generate-feature-marketing-pdfs.mjs');

// ── 4. Output PDF sanity checks ───────────────────────────────────────────────
console.log('\n── 4. Output PDF files ──────────────────────────────────────────────────');

const MIN_BYTES = 5_000; // a real PDF with a cover page is always larger than 5 KB

const OUTPUT_PDFS = [
  r('docs/SubTrack_Documentation.pdf'),
  r('docs/SubTrack_Business_Plan.pdf'),
  r('docs/SubTrack_Marketing_Strategy.pdf'),
  r('docs/SubTrack_Why.pdf'),
];

for (const pdfPath of OUTPUT_PDFS) {
  // Existence + size
  let size;
  try {
    size = statSync(pdfPath).size;
  } catch {
    assert(`${pdfPath}  —  exists`, false, 'file not found');
    continue;
  }
  assert(
    `${pdfPath}  —  size > ${MIN_BYTES.toLocaleString()} bytes  (${size.toLocaleString()})`,
    size > MIN_BYTES,
  );

  // Valid PDF header
  const head = readFileSync(pdfPath).slice(0, 8).toString('latin1');
  assert(
    `${pdfPath}  —  starts with %PDF-`,
    head.startsWith('%PDF-'),
    `header: ${JSON.stringify(head)}`,
  );
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed.\n`);

if (failed > 0) {
  console.error(`🚨  PDF smoke test FAILED — ${failed} check(s) did not pass.`);
  process.exit(1);
} else {
  console.log('🎉  All PDF smoke tests passed.');
}
