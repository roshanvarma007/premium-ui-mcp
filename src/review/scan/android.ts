// Android scanners: Kotlin (Jetpack Compose) and XML resources/layouts.
import { hueOf, parseAndroidColor, parseKotlinColor } from '../colors.js';
import { attr, isTokenFile, langOf, matches, openingTags, stripComments } from '../source.js';
import type { Facts, SourceFile } from '../types.js';
import { EMOJI_G, EMOJI_RE } from './web.js';

export function scanKotlin(files: SourceFile[], facts: Facts): void {
  for (const f of files) {
    if (langOf(f.path) !== 'kotlin') continue;
    const token = isTokenFile(f.path, f.content);
    const code = stripComments(f.content, 'kotlin');
    const at = (line: number, raw: string) => ({ file: f.path, line, raw });

    for (const { m, line } of matches(code, /\bColor\(\s*0x([0-9A-Fa-f]{6,8})\s*\)/)) {
      const c = parseKotlinColor(m[1]!);
      if (!c) continue;
      facts.allColors.push({ ...at(line, m[0]), hex: c.hex, alpha: c.alpha, tokenFile: token });
      if (!token) facts.colors.push({ ...at(line, m[0]), hex: c.hex, alpha: c.alpha });
    }
    if (token) continue;
    for (const { m, line } of matches(
      code,
      /\bColor\.(Red|Blue|Green|Cyan|Magenta|Yellow|Gray|DarkGray|LightGray|Black|White)\b/,
    )) {
      const named: Record<string, string> = {
        Red: '#FF0000',
        Blue: '#0000FF',
        Green: '#00FF00',
        Cyan: '#00FFFF',
        Magenta: '#FF00FF',
        Yellow: '#FFFF00',
        Gray: '#888888',
        DarkGray: '#444444',
        LightGray: '#CCCCCC',
        Black: '#000000',
        White: '#FFFFFF',
      };
      facts.colors.push({ ...at(line, m[0]), hex: named[m[1]!]!, alpha: 1 });
    }
    for (const { m, line } of matches(code, /\bfontSize\s*=\s*(\d+(?:\.\d+)?)\.sp\b/)) {
      facts.fontSizes.push({ ...at(line, m[0]), px: Number.parseFloat(m[1]!) });
    }
    for (const { m, line } of matches(code, /\bRoundedCornerShape\(\s*(\d+(?:\.\d+)?)\.dp\s*\)/)) {
      facts.radii.push({ ...at(line, m[0]), px: Number.parseFloat(m[1]!) });
    }
    for (const { m, line } of matches(
      code,
      /\b(RoundedCornerShape\(\s*percent\s*=\s*50\s*\)|CircleShape)\b/,
    )) {
      facts.radii.push({ ...at(line, m[0]), px: 'full' });
    }
    for (const { m, line } of matches(code, /\b(padding|spacedBy|absolutePadding)\(([^()]*)\)/)) {
      for (const v of m[2]!.matchAll(/(\d+(?:\.\d+)?)\.dp/g)) {
        const px = Number.parseFloat(v[1]!);
        if (px !== 0) facts.spacing.push({ ...at(line, m[0]), px });
      }
    }
    for (const { m, line } of matches(
      code,
      /\bSpacer\([^)]*Modifier\.(?:height|width)\(\s*(\d+(?:\.\d+)?)\.dp/,
    )) {
      facts.spacing.push({ ...at(line, m[0]), px: Number.parseFloat(m[1]!) });
    }
    for (const { m, line } of matches(
      code,
      /\bBrush\.(linear|vertical|horizontal|radial|sweep)Gradient\b/,
    )) {
      facts.gradients.push(at(line, m[0]));
    }
    for (const { m, line } of matches(code, /\.blur\(\s*\d/)) facts.glass.push(at(line, m[0]));
    for (const { m, line } of matches(code, /\.shadow\(([^)]*)\)/)) {
      const colored = /(spotColor|ambientColor)\s*=\s*([^,)]+)/.exec(m[1]!);
      const value = colored?.[2]?.trim() ?? '';
      const hex = /0x([0-9A-Fa-f]{6,8})/.exec(value)?.[1];
      const isColored =
        colored &&
        !/Color\.Black|DefaultShadowColor/.test(value) &&
        (!hex || hueOf(parseKotlinColor(hex)?.hex ?? '#000000').chroma >= 0.08);
      if (isColored) facts.glows.push(at(line, m[0]));
      else facts.shadows.push(at(line, m[0]));
    }
    for (const { m, line } of matches(
      code,
      /\b(cardElevation\(\s*defaultElevation\s*=\s*([1-9]\d*)\.dp|(?:shadow|tonal)Elevation\s*=\s*([1-9]\d*)\.dp)/,
    )) {
      facts.shadows.push(at(line, m[0]));
    }
    for (const { m, line } of matches(code, /"(?:[^"\\\n]|\\.)*"/)) {
      for (const e of m[0].matchAll(EMOJI_G)) facts.emoji.push(at(line, e[0]));
    }
    // Touch targets: explicit small sizes on clickable things.
    // Only sizes in the same Modifier chain as .clickable, or on an IconButton's own modifier,
    // count. An Icon sized 24.dp inside an IconButton is correct (the button is 48dp).
    const SIZE = /\.(?:size|height|requiredSize|requiredHeight)\(\s*(\d+(?:\.\d+)?)\.dp/;
    for (const { m, line } of matches(
      code,
      /Modifier(?:\s*\.\w+(?:\([^()]*(?:\([^()]*\))?[^()]*\))?(?:\s*\{[^{}]*\})?)+/,
    )) {
      if (!/\.clickable\b|\.selectable\b|\.toggleable\b/.test(m[0])) continue;
      const size = SIZE.exec(m[0]);
      if (size) facts.touchTargets.push({ ...at(line, m[0]), px: Number.parseFloat(size[1]!) });
    }
    for (const { m, line } of matches(
      code,
      /\bIconButton\(\s*[^{]*?modifier\s*=\s*(Modifier[^\n{]*)/,
    )) {
      const size = SIZE.exec(m[1]!);
      if (size) facts.touchTargets.push({ ...at(line, m[0]), px: Number.parseFloat(size[1]!) });
    }
    for (const { m, line } of matches(code, /\bFontFamily\.(Default|SansSerif|Serif)\b/)) {
      facts.defaultFonts.push(at(line, m[0]));
    }
  }
}

const DP = /^(-?\d+(?:\.\d+)?)dp$/;

export function scanXml(files: SourceFile[], facts: Facts): void {
  for (const f of files) {
    if (langOf(f.path) !== 'xml') continue;
    const token = isTokenFile(f.path, f.content);
    const code = stripComments(f.content, 'xml');
    for (const { m, line } of matches(code, /"(#[0-9A-Fa-f]{3,8})"|>\s*(#[0-9A-Fa-f]{3,8})\s*</)) {
      const raw = m[1] ?? m[2]!;
      const c = parseAndroidColor(raw);
      if (!c) continue;
      facts.allColors.push({
        file: f.path,
        line,
        raw,
        hex: c.hex,
        alpha: c.alpha,
        tokenFile: token,
      });
      if (!token) facts.colors.push({ file: f.path, line, raw, hex: c.hex, alpha: c.alpha });
    }
    if (token) continue;
    for (const tag of openingTags(code)) {
      const at = (raw: string) => ({ file: f.path, line: tag.line, raw });
      const a = (n: string) => attr(tag.attrs, n);
      if (tag.name === 'gradient') facts.gradients.push(at('<gradient>'));
      const size = a('android:textSize');
      const sizeNum = size && /^(\d+(?:\.\d+)?)(sp|dp|px)$/.exec(size);
      if (sizeNum)
        facts.fontSizes.push({
          ...at(`android:textSize="${size}"`),
          px: Number.parseFloat(sizeNum[1]!),
        });
      for (const n of [
        'android:radius',
        'app:cornerRadius',
        'cardCornerRadius',
        'app:cardCornerRadius',
      ]) {
        const v = a(n);
        const px = v && DP.exec(v);
        if (px && Number.parseFloat(px[1]!) > 0)
          facts.radii.push({ ...at(`${n}="${v}"`), px: Number.parseFloat(px[1]!) });
      }
      for (const n of [
        'android:padding',
        'android:paddingTop',
        'android:paddingBottom',
        'android:paddingStart',
        'android:paddingEnd',
        'android:paddingLeft',
        'android:paddingRight',
        'android:paddingHorizontal',
        'android:paddingVertical',
        'android:layout_margin',
        'android:layout_marginTop',
        'android:layout_marginBottom',
        'android:layout_marginStart',
        'android:layout_marginEnd',
        'android:layout_marginHorizontal',
        'android:layout_marginVertical',
      ]) {
        const v = a(n);
        const px = v && DP.exec(v);
        if (px && Number.parseFloat(px[1]!) !== 0)
          facts.spacing.push({ ...at(`${n}="${v}"`), px: Math.abs(Number.parseFloat(px[1]!)) });
      }
      for (const n of [
        'android:elevation',
        'app:elevation',
        'app:cardElevation',
        'cardElevation',
      ]) {
        const v = a(n);
        const px = v && DP.exec(v);
        if (px && Number.parseFloat(px[1]!) > 0) facts.shadows.push(at(`${n}="${v}"`));
      }
      const text = a('android:text');
      if (text && EMOJI_RE.test(text)) facts.emoji.push(at(`android:text="${text}"`));
      const clickable =
        /(^|\.)(Button|ImageButton|MaterialButton|FloatingActionButton|Chip)$/.test(tag.name) ||
        a('android:clickable') === 'true';
      if (clickable) {
        for (const n of ['android:layout_height', 'android:minHeight']) {
          const v = a(n);
          const px = v && DP.exec(v);
          if (
            px &&
            Number.parseFloat(px[1]!) < 48 &&
            !(n !== 'android:minHeight' && a('android:minHeight'))
          ) {
            facts.touchTargets.push({
              ...at(`<${tag.name} ${n}="${v}">`),
              px: Number.parseFloat(px[1]!),
            });
          }
        }
      }
      const font = a('android:fontFamily');
      if (font && /^(sans-serif|serif|roboto|monospace)/.test(font))
        facts.defaultFonts.push(at(`android:fontFamily="${font}"`));
      const fg = a('android:textColor');
      const bg = a('android:background');
      if (fg?.startsWith('#') && bg?.startsWith('#')) {
        const fc = parseAndroidColor(fg);
        const bc = parseAndroidColor(bg);
        if (fc && bc && fc.alpha === 1 && bc.alpha === 1) {
          facts.textOnBackground.push({
            ...at(`textColor ${fg} on background ${bg}`),
            fg: fc.hex,
            bg: bc.hex,
          });
        }
      }
    }
    // String resources with emoji.
    for (const { m, line } of matches(code, /<string\b[^>]*>([^<]*)<\/string>/)) {
      for (const e of m[1]!.matchAll(EMOJI_G)) facts.emoji.push({ file: f.path, line, raw: e[0] });
    }
  }
}
