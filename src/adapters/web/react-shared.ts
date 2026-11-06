// Shared React output (used by the react and nextjs adapters). No component library.
// Theme state lives in the DOM (<html data-theme>), set before paint by an inline script, and is
// read with useSyncExternalStore: the server snapshot is null, so hydration never mismatches.
import type { Direction } from '../../schema/direction.schema.js';
import {
  generatedHeader,
  kebab,
  PALETTE_KEYS,
  resolvePalette,
  spacingTokens,
  typeRoles,
} from '../model.js';
import { NO_FLASH_SNIPPET } from './tokens.js';

const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const COLOR_KEYS = [...PALETTE_KEYS, 'on_success', 'on_warning', 'on_error'] as const;

/** theme/tokens.(ts|js): CSS variable references for styles, raw palettes for canvas/charts. */
export function tokensModule(d: Direction, ts: boolean): string {
  const asConst = ts ? ' as const' : '';
  const color = COLOR_KEYS.map((k) => `  ${camel(k)}: 'var(--color-${kebab(k)})',`).join('\n');
  const space = spacingTokens(d)
    .map((s) => `  ${/^\d+$/.test(s.name) ? s.name : `'${s.name}'`}: 'var(--spacing-${s.name})',`)
    .join('\n');
  const text = typeRoles(d)
    .map(({ role, family }) => {
      const n = kebab(role);
      return `  ${camel(role)}: {\n    fontFamily: 'var(--font-${family})',\n    fontSize: 'var(--text-${n})',\n    lineHeight: 'var(--text-${n}--line-height)',\n    letterSpacing: 'var(--text-${n}--letter-spacing)',\n    fontWeight: 'var(--text-${n}--font-weight)',\n  },`;
    })
    .join('\n');
  const raw = (mode: 'light' | 'dark') => {
    const p = resolvePalette(d.color[mode]);
    return COLOR_KEYS.map((k) => `    ${camel(k)}: '${p[k]}',`).join('\n');
  };
  const m = d.motion.duration_ms;
  return `${generatedHeader(d, '//')}
// Prefer CSS classes; use these for inline styles, CSS-in-JS, or chart and canvas colors.

/** Colors as CSS variables: they switch with the theme automatically. */
export const color = {
${color}
}${asConst};

/** Spacing scale (${d.spacing.base}px grid). Key = multiples of the base unit. */
export const space = {
${space}
}${asConst};

export const radius = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  full: 'var(--radius-full)',
}${asConst};

/** Typography roles. Spread into a style: style={{ ...text.body }} */
export const text = {
${text}
}${asConst};

export const motion = {
  fastMs: ${m.fast},
  baseMs: ${m.base},
  slowMs: ${m.slow},
  easing: '${d.motion.easing.replace(/'/g, "\\'")}',
}${asConst};

/** Raw hex values, only for places CSS variables cannot reach (canvas, charts, emails). */
export const palette = {
  light: {
${raw('light')}
  },
  dark: {
${raw('dark')}
  },
}${asConst};

/**
 * Inline this in <head> before any stylesheet (or in the root layout) so the saved or system
 * theme is applied before first paint. Server-safe: this module has no client directive.
 */
export const NO_FLASH_SCRIPT = ${JSON.stringify(NO_FLASH_SNIPPET)};
${ts ? '\nexport type ColorToken = keyof typeof color;\nexport type SpaceToken = keyof typeof space;\nexport type TextRole = keyof typeof text;\n' : ''}`;
}

/** theme/theme.(tsx|jsx): useTheme hook and ThemeProvider (follows the system setting). */
export function themeModule(d: Direction, ts: boolean, useClient: boolean): string {
  const T = (typed: string, plain = '') => (ts ? typed : plain);
  return `${useClient ? "'use client';\n\n" : ''}${generatedHeader(d, '//')}
import { useEffect, useSyncExternalStore${T(', type ReactNode')} } from 'react';
${T("\nexport type Theme = 'light' | 'dark';\n")}
const KEY = 'theme';

function readTheme()${T(': Theme | null')} {
  const value = document.documentElement.getAttribute('data-theme');
  return value === 'light' || value === 'dark' ? value : null;
}

function subscribe(onChange${T(': () => void')}) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

function storedTheme()${T(': Theme | null')} {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export function setTheme(theme${T(': Theme')}) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this page view.
  }
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Current theme. It is null during server rendering and hydration, so render a neutral state
 * (for example an icon-only toggle) until it is known.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => null);
  return {
    theme,
    setTheme,
    toggleTheme: () => setTheme(readTheme() === 'dark' ? 'light' : 'dark'),
  };
}

/** Keeps following the system setting while the user has not picked a theme explicitly. */
export function ThemeProvider({ children }${T(': { children: ReactNode }')}) {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (!storedTheme()) {
        document.documentElement.setAttribute('data-theme', media.matches ? 'dark' : 'light');
      }
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return children;
}
`;
}

/** Icon-only toggle that renders identically on server and client. */
export function themeToggleModule(d: Direction, ts: boolean, useClient: boolean): string {
  return `${useClient ? "'use client';\n\n" : ''}${generatedHeader(d, '//')}
import { useTheme } from './theme';

export function ThemeToggle(${ts ? '{ className }: { className?: string }' : '{ className }'}) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      className={className}
      onClick={toggleTheme}
      aria-label="Dark theme"
      aria-pressed={theme === null ? undefined : theme === 'dark'}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    </button>
  );
}
`;
}

/** theme/useReducedMotion.(ts|js) */
export function reducedMotionModule(d: Direction, ts: boolean, useClient: boolean): string {
  const T = (typed: string) => (ts ? typed : '');
  return `${useClient ? "'use client';\n\n" : ''}${generatedHeader(d, '//')}
import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange${T(': () => void')}) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** True when the user asked the system to reduce motion. False on the server. */
export function useReducedMotion()${T(': boolean')} {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

/** Duration helper: ${d.motion.duration_ms.base}ms normally, 0 when motion is reduced. */
export function useMotionDuration(ms${T(': number')} = ${d.motion.duration_ms.base})${T(': number')} {
  return useReducedMotion() ? 0 : ms;
}
`;
}

/** Minimal base layer for Tailwind setups (Tailwind preflight already resets). */
export function tailwindBaseLayer(d: Direction): string {
  const tabular = d.typography.numerals === 'tabular';
  return `@layer base {
  body {
    background: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-body);
    font-size: var(--text-body);
    line-height: var(--text-body--line-height);
    -webkit-font-smoothing: antialiased;${tabular ? '\n    font-variant-numeric: tabular-nums;' : ''}
  }

  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  ::selection {
    background: var(--color-accent);
    color: var(--color-on-accent);
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
`;
}
