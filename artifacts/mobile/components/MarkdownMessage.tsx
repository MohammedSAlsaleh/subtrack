/**
 * MarkdownMessage
 *
 * Lightweight markdown renderer for AI agent chat bubbles.
 * Supports:
 *   - **bold** inline spans
 *   - Bullet lists  (lines starting with "- " or "• ")
 *   - Numbered lists (lines starting with "1. ", "2. " …)
 *   - Paragraphs separated by blank lines
 *   - Plain line-breaks within a paragraph
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  text: string;
  baseColor: string;
  accentColor: string;
  fontRegular: string;
  fontBold: string;
  isRTL?: boolean;
  fontSize?: number;
}

// ── Inline bold parser ──────────────────────────────────────────────────────
// Splits a string on **…** pairs and returns an array of React elements.
function renderInline(
  raw: string,
  baseColor: string,
  accentColor: string,
  fontRegular: string,
  fontBold: string,
  fontSize: number,
  keyPrefix: string,
) {
  const parts = raw.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      return (
        <Text
          key={`${keyPrefix}-b${i}`}
          style={{ fontFamily: fontBold, color: accentColor, fontSize }}
        >
          {inner}
        </Text>
      );
    }
    return (
      <Text
        key={`${keyPrefix}-t${i}`}
        style={{ fontFamily: fontRegular, color: baseColor, fontSize }}
      >
        {part}
      </Text>
    );
  });
}

// ── Block parser ────────────────────────────────────────────────────────────
type Block =
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'bullet'; marker: string; text: string }
  | { kind: 'numbered'; number: string; text: string };

function parseBlocks(text: string): Block[] {
  // Normalise Windows line-endings, collapse 3+ blank lines → 2
  const normalised = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  const rawLines = normalised.split('\n');

  const blocks: Block[] = [];
  let paraLines: string[] = [];

  const flushPara = () => {
    if (paraLines.length) {
      blocks.push({ kind: 'paragraph', lines: [...paraLines] });
      paraLines = [];
    }
  };

  for (const line of rawLines) {
    // Blank line → flush current paragraph
    if (line.trim() === '') {
      flushPara();
      continue;
    }

    // Bullet  (- text  or  • text)
    const bulletMatch = line.match(/^(\s*[-•])\s+(.+)/);
    if (bulletMatch) {
      flushPara();
      blocks.push({ kind: 'bullet', marker: '•', text: bulletMatch[2] });
      continue;
    }

    // Numbered list (1. text)
    const numberedMatch = line.match(/^(\s*\d+\.)\s+(.+)/);
    if (numberedMatch) {
      flushPara();
      blocks.push({ kind: 'numbered', number: numberedMatch[1].trim(), text: numberedMatch[2] });
      continue;
    }

    // Regular line → accumulate into paragraph
    paraLines.push(line);
  }

  flushPara();
  return blocks;
}

// ── Component ───────────────────────────────────────────────────────────────
export default function MarkdownMessage({
  text,
  baseColor,
  accentColor,
  fontRegular,
  fontBold,
  isRTL = false,
  fontSize = 14,
}: Props) {
  const blocks = parseBlocks(text);
  const textAlign = isRTL ? 'right' : 'left';

  return (
    <View style={styles.root}>
      {blocks.map((block, bi) => {
        if (block.kind === 'paragraph') {
          // Join lines with a space; preserve intentional hard line-breaks
          // (a line that ends with two spaces, per Markdown spec) as \n
          const joined = block.lines.join('\n');
          return (
            <Text
              key={`p${bi}`}
              style={[styles.paragraph, { textAlign, lineHeight: fontSize * 1.6 }]}
            >
              {renderInline(joined, baseColor, accentColor, fontRegular, fontBold, fontSize, `p${bi}`)}
            </Text>
          );
        }

        if (block.kind === 'bullet') {
          return (
            <View key={`b${bi}`} style={[styles.listRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.bullet, { color: accentColor, fontFamily: fontBold }]}>•</Text>
              <Text style={[styles.listText, { textAlign, flex: 1, lineHeight: fontSize * 1.6 }]}>
                {renderInline(block.text, baseColor, accentColor, fontRegular, fontBold, fontSize, `b${bi}`)}
              </Text>
            </View>
          );
        }

        if (block.kind === 'numbered') {
          return (
            <View key={`n${bi}`} style={[styles.listRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.numberedMarker, { color: accentColor, fontFamily: fontBold, fontSize }]}>
                {block.number}
              </Text>
              <Text style={[styles.listText, { textAlign, flex: 1, lineHeight: fontSize * 1.6 }]}>
                {renderInline(block.text, baseColor, accentColor, fontRegular, fontBold, fontSize, `n${bi}`)}
              </Text>
            </View>
          );
        }

        return null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { gap: 6 },
  paragraph:      { fontSize: 14 },
  listRow:        { gap: 8, alignItems: 'flex-start' },
  bullet:         { fontSize: 16, lineHeight: 22, width: 14, textAlign: 'center' },
  numberedMarker: { minWidth: 22, lineHeight: 22, textAlign: 'right' },
  listText:       { fontSize: 14 },
});
