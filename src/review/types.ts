import type { PlatformId } from '../platforms.js';
import type { Direction } from '../schema/direction.schema.js';

export type Severity = 'error' | 'warn' | 'info';

export interface SourceFile {
  path: string;
  content: string;
}

export interface Finding {
  rule: string;
  severity: Severity;
  file: string;
  line: number;
  message: string;
  fix: string;
}

/** A position in the reviewed code. Line numbers are 1-based. */
export interface Occ {
  file: string;
  line: number;
  raw: string;
}

/** Normalized facts extracted from source files by platform scanners. */
export interface Facts {
  /** Color literals outside generated token files. */
  colors: Array<Occ & { hex: string; alpha: number }>;
  /** Every color literal, including token files (for palette checks). */
  allColors: Array<Occ & { hex: string; alpha: number; tokenFile: boolean }>;
  fontSizes: Array<Occ & { px: number }>;
  radii: Array<Occ & { px: number | 'full' }>;
  spacing: Array<Occ & { px: number }>;
  gradients: Occ[];
  glass: Occ[];
  glows: Occ[];
  shadows: Occ[];
  emoji: Occ[];
  textOnBackground: Array<Occ & { fg: string; bg: string; sizePx?: number; bold?: boolean }>;
  touchTargets: Array<Occ & { px: number }>;
  defaultFonts: Occ[];
}

export interface ReviewContext {
  platform: PlatformId;
  files: SourceFile[];
  direction?: Direction | undefined;
  facts: Facts;
}

export interface Rule {
  id: string;
  severity: Severity;
  /** Platforms the rule applies to; 'all' for common rules. */
  platforms: readonly PlatformId[] | 'all';
  title: string;
  check(ctx: ReviewContext): Finding[];
}

export function emptyFacts(): Facts {
  return {
    colors: [],
    allColors: [],
    fontSizes: [],
    radii: [],
    spacing: [],
    gradients: [],
    glass: [],
    glows: [],
    shadows: [],
    emoji: [],
    textOnBackground: [],
    touchTargets: [],
    defaultFonts: [],
  };
}
