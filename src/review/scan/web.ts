// Web-family scanner: CSS files, HTML documents, JS/TS/JSX/TSX. Tailwind classes included.

import { spacingTokens } from '../../adapters/model.js';
import type { Direction } from '../../schema/direction.schema.js';
import { parseCssColor } from '../colors.js';
import { isTokenFile, langOf, lineAt, matches, stripComments } from '../source.js';
import type { Facts, SourceFile } from '../types.js';
import { customPropertyColors, type Decl, declarations, scanCss, toPx } from './css.js';
import { classLists, scanTailwind } from './tailwind.js';

/** Characters that render as emoji by default (not ©, ™ or arrows), or forced with VS16. */
const EMOJI_SOURCE =
  '(?:\\p{Emoji_Presentation}|\\p{Extended_Pictographic}\\uFE0F)(?:\\u200D(?:\\p{Emoji_Presentation}|\\p{Extended_Pictographic}\\uFE0F?))*';
export const EMOJI_RE = new RegExp(EMOJI_SOURCE, 'u');
export const EMOJI_G = new RegExp(EMOJI_SOURCE, 'gu');

/** Blanks everything except <style> contents so CSS line numbers stay correct. */
function styleBlocks(html: string): string {
  const keep = new Array<boolean>(html.length).fill(false);
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    const start = m.index + m[0].indexOf('>') + 1;
    for (let i = start; i < start + m[1]!.length; i++) keep[i] = true;
  }
  return [...html].map((ch, i) => (keep[i] || ch === '\n' ? ch : ' ')).join('');
}

/** Text content outside tags, scripts and styles (for emoji checks). */
function htmlText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, (s) => s.replace(/[^\n]/g, ' '))
    .replace(/<[^>]*>/g, (s) => s.replace(/[^\n]/g, ' '));
}

/** Converts a JS style object body ({ color: '#fff', fontSize: 13 }) into CSS declarations. */
function styleObjectDecls(body: string, baseLine: number): Decl[] {
  const out: Decl[] = [];
  const re = /([A-Za-z]+)\s*:\s*('[^']*'|"[^"]*"|`[^`]*`|-?\d*\.?\d+)/g;
  for (const m of body.matchAll(re)) {
    const prop = m[1]!.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    let value = m[2]!.replace(/^['"`]|['"`]$/g, '');
    const unitless = /^(font-weight|line-height|opacity|z-index|flex|flex-grow|flex-shrink|order)$/;
    if (/^-?\d*\.?\d+$/.test(value) && !unitless.test(prop)) value = `${value}px`;
    out.push({ prop, value, line: baseLine + lineAt(body, m.index) - 1, selector: 'style={{}}' });
  }
  return out;
}

export function scanWeb(files: SourceFile[], direction: Direction | undefined, facts: Facts): void {
  // Pass 1: resolve --color custom properties from every stylesheet (tokens first).
  const vars = new Map<string, string>();
  const cssOf = new Map<string, string>();
  for (const f of files) {
    const lang = langOf(f.path);
    if (lang === 'css') cssOf.set(f.path, stripComments(f.content, 'css'));
    if (lang === 'html') cssOf.set(f.path, styleBlocks(stripComments(f.content, 'html')));
  }
  const ordered = [...cssOf.entries()].sort(
    ([a], [b]) => Number(isTokenFile(b, '')) - Number(isTokenFile(a, '')),
  );
  for (const [, css] of ordered) customPropertyColors(declarations(css), vars);
  if (direction) {
    const p = direction.color.light;
    for (const [k, v] of Object.entries(p)) {
      const name = `--color-${k.replace(/_/g, '-')}`;
      if (!vars.has(name) && typeof v === 'string') vars.set(name, v);
    }
  }
  const themeColors = new Map<string, string>();
  for (const [k, v] of vars) if (k.startsWith('--color-')) themeColors.set(k.slice(8), v);

  const spacingNames = direction
    ? new Set([...spacingTokens(direction).map((s) => s.name), 'px', 'touch'])
    : undefined;
  const twOptions = {
    themeColors,
    spacingNames,
    spacingBase: direction?.spacing.base ?? 4,
    hasDirection: Boolean(direction),
  };

  for (const f of files) {
    const lang = langOf(f.path);
    const token = isTokenFile(f.path, f.content);
    const opts = {
      file: f.path,
      tokenFile: token,
      hasDirection: Boolean(direction),
      resolveVar: (n: string) => vars.get(n),
    };
    if (lang === 'css') {
      scanCss(declarations(cssOf.get(f.path)!), facts, opts);
      continue;
    }
    if (lang === 'html') {
      const code = stripComments(f.content, 'html');
      scanCss(declarations(cssOf.get(f.path)!), facts, opts);
      for (const { m, line } of matches(code, /\sstyle\s*=\s*"([^"]*)"/)) {
        scanCss(
          declarations(m[1]!, line).map((d) => ({ ...d, selector: 'style=""' })),
          facts,
          opts,
        );
      }
      const text = htmlText(code);
      for (const { m, line } of matches(text, EMOJI_G)) {
        facts.emoji.push({ file: f.path, line, raw: m[0] });
      }
      scanTailwind(classLists(f.path, code), facts, twOptions);
      continue;
    }
    if (lang !== 'js') continue;
    const code = stripComments(f.content, 'js');
    // Inline style objects.
    for (const { m, line } of matches(
      code,
      /<([A-Za-z][\w.]*)\b(?:[^<>]|=>)*?style\s*=\s*\{\{([\s\S]*?)\}\}/,
    )) {
      const tag = m[1]!.toLowerCase();
      const decls = styleObjectDecls(m[2]!, line).map((d) => ({
        ...d,
        selector: `${tag} @${line}`,
      }));
      scanCss(decls, facts, opts);
    }
    // CSS-in-JS template literals (styled-components, emotion, css``).
    for (const { m, line } of matches(
      code,
      /(?:styled(?:\.\w+|\([^)]*\))|css|createGlobalStyle|keyframes)\s*`([^`]*)`/,
    )) {
      scanCss(declarations(m[1]!, line), facts, opts);
    }
    // Standalone color string literals ('#1a2b3c', "rgb(...)") outside token modules.
    for (const { m, line } of matches(
      code,
      /(['"`])(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{4}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|(?:rgba?|hsla?)\([^'"`)]*\))\1/,
    )) {
      const c = parseCssColor(m[2]!);
      if (!c) continue;
      // '#add' or '#fab' may be hash routes; short hex only counts next to a color-ish key.
      if (/^#[0-9a-fA-F]{3,4}$/.test(m[2]!)) {
        const lineText = code.split('\n')[line - 1] ?? '';
        if (!/(color|colour|background|fill|stroke|border|shadow|tint)/i.test(lineText)) continue;
      }
      const already = facts.colors.some(
        (x) => x.file === f.path && x.line === line && x.hex === c.hex,
      );
      facts.allColors.push({
        file: f.path,
        line,
        raw: m[2]!,
        hex: c.hex,
        alpha: c.alpha,
        tokenFile: token,
      });
      if (!token && !already)
        facts.colors.push({ file: f.path, line, raw: m[2]!, hex: c.hex, alpha: c.alpha });
    }
    if (!token) {
      // Emoji in JSX text or string literals rendered as UI.
      for (const { m, line } of matches(code, EMOJI_G)) {
        facts.emoji.push({ file: f.path, line, raw: m[0] });
      }
      // Fixed px font sizes in JS style objects already handled; record fontSize literals.
      for (const { m, line } of matches(
        code,
        /fontSize\s*:\s*(\d+(?:\.\d+)?)\b(?!\s*['"`]?\s*(rem|em|%))/,
      )) {
        const px = toPx(`${m[1]}px`);
        if (px !== null && !facts.fontSizes.some((s) => s.file === f.path && s.line === line)) {
          facts.fontSizes.push({ file: f.path, line, raw: m[0], px });
        }
      }
    }
    scanTailwind(classLists(f.path, code), facts, twOptions);
  }
}
