import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';
import { C } from './pdf-palette.mjs';

const require = createRequire(import.meta.url);
const globalModules = '/home/runner/workspace/.config/npm/node_global/lib/node_modules';
const { marked }  = require(`${globalModules}/marked`);
const PDFDocument = require(`${globalModules}/pdfkit`);

// ── Colour palette: imported from scripts/pdf-palette.mjs ────────────────────
// To change brand colours, edit pdf-palette.mjs — do not redefine C here.

const MARGIN = 56;

// ── Inline token flattener ────────────────────────────────────────────────────
function inlineText(tokens = []) {
  return tokens.map(t => {
    if (t.type === 'codespan') return `\`${t.text}\``;
    if (t.type === 'strong')   return t.text;
    if (t.type === 'em')       return t.text;
    if (t.type === 'link')     return t.text || t.href;
    if (t.type === 'text')     return t.text;
    return t.raw || '';
  }).join('');
}

// ── PDF builder ───────────────────────────────────────────────────────────────
async function buildPdf({ inputFile, inputFiles, outputFile, title, subtitle, coverMeta }) {
  let md;
  if (inputFiles) {
    md = inputFiles.map(f => readFileSync(f, 'utf8')).join('\n\n---\n\n');
  } else {
    md = readFileSync(inputFile, 'utf8');
  }
  const tokens = marked.lexer(md);

  const pdf = new PDFDocument({
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    size: 'A4',
    info: { Title: title, Author: 'SubTrack', Subject: subtitle },
  });

  const chunks = [];
  pdf.on('data', c => chunks.push(c));

  const pageW = () => pdf.page.width  - MARGIN * 2;
  const pageH = () => pdf.page.height;

  const gap = (n = 6) => pdf.moveDown(n / 12);

  const safeY = (needed = 40) => {
    if (pdf.y + needed > pageH() - MARGIN) pdf.addPage();
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function hr() {
    safeY(20); gap(4);
    pdf.moveTo(MARGIN, pdf.y).lineTo(MARGIN + pageW(), pdf.y)
      .strokeColor(C.border).lineWidth(0.5).stroke();
    gap(8);
  }

  function renderTable(token) {
    const cols   = token.header.length;
    const colW   = pageW() / cols;
    const rowH   = 18;
    const fSize  = 8;
    const padH   = 4, padV = 4;

    safeY(rowH * 2);

    // Header
    pdf.rect(MARGIN, pdf.y, pageW(), rowH).fill(C.tHead);
    const hY = pdf.y;
    token.header.forEach((cell, i) => {
      const txt = inlineText(cell.tokens || [{ type: 'text', text: cell.text }]);
      pdf.fillColor(C.body).font('Helvetica-Bold').fontSize(fSize)
        .text(txt, MARGIN + i * colW + padH, hY + padV,
          { width: colW - padH * 2, lineBreak: false, ellipsis: true });
    });
    pdf.rect(MARGIN, hY, pageW(), rowH).strokeColor(C.border).lineWidth(0.4).stroke();
    for (let i = 1; i < cols; i++)
      pdf.moveTo(MARGIN + i * colW, hY).lineTo(MARGIN + i * colW, hY + rowH).stroke();
    pdf.y = hY + rowH;

    // Rows
    token.rows.forEach((row, ri) => {
      safeY(rowH);
      const rY = pdf.y;
      if (ri % 2 === 1) pdf.rect(MARGIN, rY, pageW(), rowH).fill(C.tAlt);
      row.forEach((cell, i) => {
        const txt = inlineText(cell.tokens || [{ type: 'text', text: cell.text }]);
        pdf.fillColor(C.body).font('Helvetica').fontSize(fSize)
          .text(txt, MARGIN + i * colW + padH, rY + padV,
            { width: colW - padH * 2, lineBreak: false, ellipsis: true });
      });
      pdf.rect(MARGIN, rY, pageW(), rowH).strokeColor(C.border).lineWidth(0.4).stroke();
      for (let i = 1; i < cols; i++)
        pdf.moveTo(MARGIN + i * colW, rY).lineTo(MARGIN + i * colW, rY + rowH).stroke();
      pdf.y = rY + rowH;
    });
    gap(12);
  }

  function renderBlockquote(token) {
    safeY(30);
    const startY = pdf.y;
    const txt = token.tokens
      .map(t => t.type === 'paragraph' ? inlineText(t.tokens) : t.raw)
      .join(' ');
    pdf.fillColor(C.muted).font('Helvetica-Oblique').fontSize(9.5)
      .text(txt, MARGIN + 14, pdf.y, { width: pageW() - 14 });
    const endY = pdf.y;
    pdf.moveTo(MARGIN + 2, startY).lineTo(MARGIN + 2, endY)
      .strokeColor(C.accent).lineWidth(2.5).stroke();
    gap(6);
  }

  function renderList(token, depth = 0) {
    const indent = MARGIN + depth * 14;
    token.items.forEach((item, idx) => {
      safeY(18);
      const marker = token.ordered ? `${idx + 1}.` : '•';
      const txt = inlineText(
        item.tokens?.filter(t => t.type !== 'list') ?? [{ type: 'text', text: item.text }]
      );
      pdf.fillColor(C.body).font('Helvetica').fontSize(10)
        .text(`${marker}  ${txt}`, indent, pdf.y,
          { width: pageW() - (indent - MARGIN) - 4 });
      const nested = item.tokens?.find(t => t.type === 'list');
      if (nested) renderList(nested, depth + 1);
    });
    gap(4);
  }

  // ── Cover page ───────────────────────────────────────────────────────────────
  pdf.rect(0, 0, pdf.page.width, pdf.page.height).fill('#1a1a2e');

  // Decorative accent bar
  pdf.rect(0, pdf.page.height - 8, pdf.page.width, 8).fill(C.accent);

  pdf.fillColor('#ffffff').font('Helvetica-Bold').fontSize(36)
    .text('SubTrack', MARGIN, 180, { align: 'center', width: pageW() });

  pdf.fillColor(C.accent).font('Helvetica-Bold').fontSize(14)
    .text(subtitle.toUpperCase(), MARGIN, 230, { align: 'center', width: pageW(), characterSpacing: 2 });

  pdf.moveTo(MARGIN + 60, 262).lineTo(pdf.page.width - MARGIN - 60, 262)
    .strokeColor('rgba(255,255,255,0.25)').lineWidth(0.5).stroke();

  coverMeta.forEach((line, i) => {
    pdf.fillColor('#a0a8c0').font('Helvetica').fontSize(11)
      .text(line, MARGIN, 278 + i * 22, { align: 'center', width: pageW() });
  });

  pdf.addPage();

  // ── Render markdown tokens ────────────────────────────────────────────────────
  let h1Count = 0;

  for (const token of tokens) {
    switch (token.type) {

      case 'heading': {
        const level = token.depth;
        const txt   = inlineText(token.tokens);

        if (level === 1) {
          if (h1Count > 0) pdf.addPage();
          h1Count++;
          pdf.rect(MARGIN, pdf.y, 4, 28).fill(C.accent);
          pdf.fillColor(C.h1).font('Helvetica-Bold').fontSize(20)
            .text(txt, MARGIN + 12, pdf.y, { width: pageW() - 12 });
          gap(14);

        } else if (level === 2) {
          safeY(60); gap(10);
          pdf.fillColor(C.h2).font('Helvetica-Bold').fontSize(14)
            .text(txt, MARGIN, pdf.y, { width: pageW() });
          const lineY = pdf.y + 2;
          pdf.moveTo(MARGIN, lineY).lineTo(MARGIN + pageW(), lineY)
            .strokeColor(C.border).lineWidth(0.5).stroke();
          pdf.y = lineY + 6; gap(4);

        } else if (level === 3) {
          safeY(40); gap(6);
          pdf.fillColor(C.h3).font('Helvetica-Bold').fontSize(11.5)
            .text(txt, MARGIN, pdf.y, { width: pageW() });
          gap(4);

        } else {
          safeY(30); gap(4);
          pdf.fillColor(C.h4).font('Helvetica-Bold').fontSize(10.5)
            .text(txt, MARGIN, pdf.y, { width: pageW() });
          gap(2);
        }
        break;
      }

      case 'paragraph': {
        safeY(20);
        const txt = inlineText(token.tokens);
        pdf.fillColor(C.body).font('Helvetica').fontSize(10)
          .text(txt, MARGIN, pdf.y, { width: pageW(), lineGap: 2 });
        gap(6);
        break;
      }

      case 'table':      renderTable(token);      break;
      case 'blockquote': renderBlockquote(token); break;
      case 'list':       renderList(token);       break;
      case 'hr':         hr();                    break;
      case 'space':      gap(4);                  break;
      default: break;
    }
  }

  pdf.end();

  await new Promise((resolve, reject) => {
    pdf.on('end', () => {
      writeFileSync(outputFile, Buffer.concat(chunks));
      console.log(`✅ PDF written → ${outputFile}`);
      resolve();
    });
    pdf.on('error', reject);
  });
}

// ── Generate PDFs ─────────────────────────────────────────────────────────────
await buildPdf({
  inputFiles: ['docs/business-plan.md', 'docs/sales-forecast.md'],
  outputFile: 'docs/SubTrack_Business_Plan.pdf',
  title:      'SubTrack — Business Plan',
  subtitle:   'Business Plan',
  coverMeta:  [
    'Version 1.0 · July 2026',
    'Strategy · Market · Revenue Model · Forecasts · Sales Forecast',
    'Primary market: Kingdom of Saudi Arabia',
  ],
});

await buildPdf({
  inputFile:  'docs/marketing-strategy.md',
  outputFile: 'docs/SubTrack_Marketing_Strategy.pdf',
  title:      'SubTrack — Marketing Strategy',
  subtitle:   'Marketing Strategy',
  coverMeta:  [
    'Go-to-market plan · Audience · Channels · 90-Day Launch',
    'Primary market: Kingdom of Saudi Arabia',
    'July 2026',
  ],
});

await buildPdf({
  inputFile:  'docs/why-subtrack.md',
  outputFile: 'docs/SubTrack_Why.pdf',
  title:      'SubTrack — What & Why',
  subtitle:   'The Case for SubTrack',
  coverMeta:  [
    'The problem, the solution, and why now',
    'Primary market: Kingdom of Saudi Arabia',
    'July 2026',
  ],
});
