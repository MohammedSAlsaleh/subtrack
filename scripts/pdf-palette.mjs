/**
 * Shared PDF colour palette for SubTrack document generation scripts.
 *
 * HOW TO UPDATE BRAND COLOURS
 * ───────────────────────────
 * Change values here — all generated PDFs will pick them up automatically.
 * Do NOT redefine `C` inside individual generator scripts; import from here.
 *
 *   import { C } from './pdf-palette.mjs';
 */
export const C = {
  /** Dark navy — H1 headings */
  h1:     '#1a1a2e',
  /** Deep navy — H2 headings */
  h2:     '#16213e',
  /** Mid navy — H3 headings */
  h3:     '#0f3460',
  /** Dark grey — H4 headings */
  h4:     '#333333',
  /** Near-black — body copy */
  body:   '#1a1a1a',
  /** Medium grey — muted / secondary text, blockquotes */
  muted:  '#555555',
  /** Dark grey — code text */
  code:   '#2d2d2d',
  /** Light grey — code block background */
  codeBg: '#f5f5f5',
  /** Light grey — table / rule borders */
  border: '#cccccc',
  /** Very light grey — table header background */
  tHead:  '#eeeeee',
  /** Near-white — alternating table row tint */
  tAlt:   '#fafafa',
  /** SubTrack brand purple — accent bars, links, highlights */
  accent: '#7B6CF8',
};
