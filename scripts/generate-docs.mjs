import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { C } from './pdf-palette.mjs';

const require = createRequire(import.meta.url);
const globalModules = '/home/runner/workspace/.config/npm/node_global/lib/node_modules';

const { marked }     = require(`${globalModules}/marked`);
const HTMLtoDOCX     = require(`${globalModules}/html-to-docx`);
const PDFDocument    = require(`${globalModules}/pdfkit`);

const md = readFileSync('docs/DOCUMENTATION.md', 'utf8');

// ─── 1. DOCX ─────────────────────────────────────────────────────────────────
const rawHtml = marked(md);

// Wrap in a minimal HTML document with some basic styling for the DOCX converter
const html = `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Calibri, sans-serif; font-size: 11pt; line-height: 1.5; margin: 0; }
  h1 { font-size: 22pt; color: #1a1a2e; margin-top: 36pt; margin-bottom: 6pt; }
  h2 { font-size: 16pt; color: #16213e; border-bottom: 1px solid #cccccc; padding-bottom: 4pt; margin-top: 24pt; margin-bottom: 6pt; }
  h3 { font-size: 13pt; color: #0f3460; margin-top: 18pt; margin-bottom: 4pt; }
  h4 { font-size: 11pt; color: #333333; margin-top: 12pt; margin-bottom: 4pt; }
  p  { margin: 0 0 8pt 0; }
  table { border-collapse: collapse; width: 100%; margin: 10pt 0; }
  th { background-color: #f0f0f0; font-weight: bold; }
  th, td { border: 1px solid #cccccc; padding: 5pt 8pt; font-size: 10pt; }
  tr:nth-child(even) td { background-color: #fafafa; }
  code { font-family: Consolas, monospace; font-size: 9pt; background: #f5f5f5; padding: 1pt 3pt; }
  pre  { background: #f5f5f5; padding: 10pt; border-left: 3px solid #888; margin: 8pt 0; overflow: auto; }
  pre code { background: none; padding: 0; font-size: 9pt; }
  hr { border: none; border-top: 1px solid #dddddd; margin: 16pt 0; }
  ul, ol { padding-left: 20pt; margin: 4pt 0 8pt; }
  li { margin-bottom: 3pt; }
  strong { font-weight: bold; }
  em { font-style: italic; }
  blockquote { border-left: 3px solid #888; margin: 0 0 8pt 12pt; padding-left: 10pt; color: #555; }
</style>
</head>
<body>
${rawHtml}
</body>
</html>`;

const docxBuffer = await HTMLtoDOCX(html, null, {
  table: { row: { cantSplit: true } },
  footer: true,
  pageNumber: true,
  margins: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
  title: 'SubTrack Technical Documentation',
  subject: 'Technical Documentation',
  creator: 'SubTrack',
  description: 'Full technical documentation for the SubTrack personal finance mobile app',
});

writeFileSync('docs/SubTrack_Documentation.docx', docxBuffer);
console.log('✅ DOCX written → docs/SubTrack_Documentation.docx');

// ─── 2. PDF ──────────────────────────────────────────────────────────────────
// Parse the markdown into a structured token stream and render to pdfkit
const tokens = marked.lexer(md);

const pdf = new PDFDocument({
  margins: { top: 72, bottom: 72, left: 72, right: 72 },
  size: 'A4',
  info: {
    Title:    'SubTrack Technical Documentation',
    Author:   'SubTrack',
    Subject:  'Technical Documentation',
    Keywords: 'finance, mobile, expo, react native, saudi arabia',
  },
});

const chunks = [];
pdf.on('data', c => chunks.push(c));

// ── Colour palette: imported from scripts/pdf-palette.mjs ───────────────────
// To change brand colours, edit pdf-palette.mjs — do not redefine C here.

const PAGE_W  = pdf.page.width  - 144; // usable width (margins excluded)
const PAGE_H  = pdf.page.height;
const MARGIN  = 72;

// ── Helpers ─────────────────────────────────────────────────────────────────
const gap = (n = 6) => { pdf.moveDown(n / 12); };

function safeY(needed = 40) {
  if (pdf.y + needed > PAGE_H - MARGIN) pdf.addPage();
}

function renderInlineTokens(inlineTokens, opts = {}) {
  // Build a flat string with inline marks handled via font switches
  // pdfkit doesn't support mixed inline fonts mid-line easily, so we
  // render a simplified plain-text version with minimal decoration.
  const text = inlineTokens
    .map(t => {
      if (t.type === 'codespan') return `\`${t.text}\``;
      if (t.type === 'strong')   return t.text;
      if (t.type === 'em')       return t.text;
      if (t.type === 'link')     return t.text || t.href;
      if (t.type === 'text')     return t.text;
      if (t.type === 'escape')   return t.text;
      return t.raw || '';
    })
    .join('');
  return text;
}

function hr() {
  safeY(20);
  gap(4);
  pdf
    .moveTo(MARGIN, pdf.y)
    .lineTo(MARGIN + PAGE_W, pdf.y)
    .strokeColor(C.border)
    .lineWidth(0.5)
    .stroke();
  gap(8);
}

function renderTable(token) {
  const cols      = token.header.length;
  const colW      = PAGE_W / cols;
  const rowH      = 22;
  const cellPadH  = 4;
  const cellPadV  = 5;
  const fontSize  = 8.5;

  safeY(rowH * 2);

  // Header row
  pdf.rect(MARGIN, pdf.y, PAGE_W, rowH).fill(C.tHead);
  const headerY = pdf.y;
  token.header.forEach((cell, i) => {
    const cellText = renderInlineTokens(cell.tokens || [{ type: 'text', text: cell.text }]);
    pdf
      .fillColor(C.body)
      .font('Helvetica-Bold')
      .fontSize(fontSize)
      .text(cellText, MARGIN + i * colW + cellPadH, headerY + cellPadV, {
        width: colW - cellPadH * 2,
        lineBreak: false,
        ellipsis: true,
      });
  });

  // Header grid lines
  pdf.rect(MARGIN, headerY, PAGE_W, rowH).strokeColor(C.border).lineWidth(0.4).stroke();
  for (let i = 1; i < cols; i++) {
    pdf.moveTo(MARGIN + i * colW, headerY).lineTo(MARGIN + i * colW, headerY + rowH).stroke();
  }

  pdf.y = headerY + rowH;

  // Data rows
  token.rows.forEach((row, rowIdx) => {
    safeY(rowH);
    const rowY = pdf.y;
    if (rowIdx % 2 === 1) pdf.rect(MARGIN, rowY, PAGE_W, rowH).fill(C.tAlt);

    row.forEach((cell, i) => {
      const cellText = renderInlineTokens(cell.tokens || [{ type: 'text', text: cell.text }]);
      pdf
        .fillColor(C.body)
        .font('Helvetica')
        .fontSize(fontSize)
        .text(cellText, MARGIN + i * colW + cellPadH, rowY + cellPadV, {
          width: colW - cellPadH * 2,
          lineBreak: false,
          ellipsis: true,
        });
    });

    pdf.rect(MARGIN, rowY, PAGE_W, rowH).strokeColor(C.border).lineWidth(0.4).stroke();
    for (let i = 1; i < cols; i++) {
      pdf.moveTo(MARGIN + i * colW, rowY).lineTo(MARGIN + i * colW, rowY + rowH).stroke();
    }

    pdf.y = rowY + rowH;
  });

  gap(12);
}

function renderCode(token) {
  safeY(50);
  const lines    = token.text.split('\n');
  const lineH    = 12;
  const padV     = 8;
  const padH     = 10;
  const boxH     = lines.length * lineH + padV * 2;
  const boxY     = pdf.y;

  // Background rect
  pdf.rect(MARGIN, boxY, PAGE_W, Math.min(boxH, PAGE_H - MARGIN - boxY))
    .fill(C.codeBg);

  // Left accent bar
  pdf.rect(MARGIN, boxY, 3, Math.min(boxH, PAGE_H - MARGIN - boxY))
    .fill('#888888');

  pdf
    .fillColor(C.code)
    .font('Courier')
    .fontSize(8);

  lines.forEach((line, idx) => {
    const lineY = boxY + padV + idx * lineH;
    if (lineY + lineH > PAGE_H - MARGIN) return; // clip overflow
    pdf.text(line, MARGIN + padH, lineY, { width: PAGE_W - padH * 2, lineBreak: false, ellipsis: true });
  });

  pdf.y = boxY + boxH + 8;
  gap(4);
}

function renderBlockquote(token) {
  safeY(30);
  const startY = pdf.y;
  const text   = token.tokens
    .map(t => (t.type === 'paragraph' ? renderInlineTokens(t.tokens) : t.raw))
    .join(' ');

  pdf
    .fillColor(C.muted)
    .font('Helvetica-Oblique')
    .fontSize(9.5)
    .text(text, MARGIN + 14, pdf.y, { width: PAGE_W - 14 });

  const endY = pdf.y;
  pdf.moveTo(MARGIN + 2, startY).lineTo(MARGIN + 2, endY).strokeColor('#888').lineWidth(2).stroke();
  gap(6);
}

function renderList(token, depth = 0) {
  const indent = MARGIN + depth * 14;
  const bullet = token.ordered ? null : '•';
  token.items.forEach((item, idx) => {
    safeY(18);
    const marker = token.ordered ? `${idx + 1}.` : bullet;
    const text   = renderInlineTokens(item.tokens?.filter(t => t.type !== 'list') ?? [{ type: 'text', text: item.text }]);

    pdf
      .fillColor(C.body)
      .font('Helvetica')
      .fontSize(10)
      .text(`${marker}  ${text}`, indent, pdf.y, { width: PAGE_W - (indent - MARGIN) - 4 });

    // Nested list
    const nested = item.tokens?.find(t => t.type === 'list');
    if (nested) renderList(nested, depth + 1);
  });
  gap(4);
}

// ── Cover page ───────────────────────────────────────────────────────────────
pdf.rect(0, 0, pdf.page.width, pdf.page.height).fill('#1a1a2e');

// Decorative accent bar
pdf.rect(0, pdf.page.height - 8, pdf.page.width, 8).fill(C.accent);

pdf
  .fillColor('#ffffff')
  .font('Helvetica-Bold')
  .fontSize(32)
  .text('SubTrack', MARGIN, 200, { align: 'center' });

pdf
  .fillColor(C.accent)
  .font('Helvetica-Bold')
  .fontSize(14)
  .text('TECHNICAL DOCUMENTATION', MARGIN, 248, { align: 'center', characterSpacing: 2 });

pdf
  .moveTo(MARGIN + 80, 290)
  .lineTo(pdf.page.width - MARGIN - 80, 290)
  .strokeColor('rgba(255,255,255,0.25)')
  .lineWidth(0.5)
  .stroke();

const meta = [
  'Version 1.0',
  'Platform: iOS · Android · Web (Expo SDK 53)',
  'Primary market: Kingdom of Saudi Arabia',
  'Languages: English · Arabic (RTL)',
  'July 2026',
];
meta.forEach((line, i) => {
  pdf
    .fillColor('#c0c8e0')
    .font('Helvetica')
    .fontSize(11)
    .text(line, MARGIN, 310 + i * 22, { align: 'center' });
});

pdf.addPage();

// ── Render tokens ────────────────────────────────────────────────────────────
let h1Count = 0;

for (const token of tokens) {
  switch (token.type) {

    case 'heading': {
      const level = token.depth;
      const text  = renderInlineTokens(token.tokens);

      if (level === 1) {
        // Each H1 starts a new page (except the very first which is the title)
        if (h1Count > 0) pdf.addPage();
        h1Count++;

        // H1 accent bar
        pdf.rect(MARGIN, pdf.y, 4, 32).fill(C.accent);

        pdf
          .fillColor(C.h1)
          .font('Helvetica-Bold')
          .fontSize(22)
          .text(text, MARGIN + 12, pdf.y, { width: PAGE_W - 12 });
        gap(14);

      } else if (level === 2) {
        safeY(60);
        gap(8);
        const lineY = pdf.y + 20;

        pdf
          .fillColor(C.h2)
          .font('Helvetica-Bold')
          .fontSize(15)
          .text(text, MARGIN, pdf.y, { width: PAGE_W });

        pdf
          .moveTo(MARGIN, lineY)
          .lineTo(MARGIN + PAGE_W, lineY)
          .strokeColor(C.border)
          .lineWidth(0.5)
          .stroke();

        pdf.y = lineY + 4;
        gap(4);

      } else if (level === 3) {
        safeY(40);
        gap(6);
        pdf
          .fillColor(C.h3)
          .font('Helvetica-Bold')
          .fontSize(12)
          .text(text, MARGIN, pdf.y, { width: PAGE_W });
        gap(4);

      } else {
        safeY(30);
        gap(4);
        pdf
          .fillColor(C.h4)
          .font('Helvetica-Bold')
          .fontSize(10.5)
          .text(text, MARGIN, pdf.y, { width: PAGE_W });
        gap(2);
      }
      break;
    }

    case 'paragraph': {
      safeY(20);
      const text = renderInlineTokens(token.tokens);
      // Skip the document title line (already on cover)
      if (text.startsWith('Version:') || text.startsWith('Platform:') || text.startsWith('Last updated:')) break;
      pdf
        .fillColor(C.body)
        .font('Helvetica')
        .fontSize(10)
        .text(text, MARGIN, pdf.y, { width: PAGE_W, lineGap: 2 });
      gap(6);
      break;
    }

    case 'table':      renderTable(token);      break;
    case 'code':       renderCode(token);       break;
    case 'blockquote': renderBlockquote(token); break;
    case 'list':       renderList(token);       break;
    case 'hr':         hr();                    break;
    case 'space':      gap(4);                  break;
    default:           break;
  }
}

// ── Page numbers ─────────────────────────────────────────────────────────────
const totalPages = pdf.bufferedPageRange().count + 1; // approximate
pdf.on('pageAdded', () => {
  // footer will be added post-hoc — pdfkit doesn't support it mid-stream easily
});

pdf.end();

await new Promise((resolve, reject) => {
  pdf.on('end', () => {
    writeFileSync('docs/SubTrack_Documentation.pdf', Buffer.concat(chunks));
    console.log('✅ PDF  written → docs/SubTrack_Documentation.pdf');
    resolve();
  });
  pdf.on('error', reject);
});
