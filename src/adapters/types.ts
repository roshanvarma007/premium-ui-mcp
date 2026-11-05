import type { PlatformId } from '../platforms.js';
import type { Direction } from '../schema/direction.schema.js';

export interface GeneratedFile {
  /** Path relative to the project root, forward slashes. */
  path: string;
  content: string;
}

export type ThemeMode = 'light' | 'dark' | 'both';
export type FontSource = 'self-hosted' | 'google-fonts';

export interface AdapterOptions {
  mode: ThemeMode;
  language: 'ts' | 'js';
  router: 'app' | 'pages';
  /** Android application package, for example com.example.app */
  packageName: string;
  /**
   * self-hosted (default): fonts ship with the app or site (bundled res/font files on Android,
   * self-hosted woff2 on the web). google-fonts: opt-in, loads fonts from Google at runtime
   * (Downloadable Fonts on Android, a <link> on the web).
   */
  fontSource: FontSource;
  /** Platforms requested together in the same call (for example react + tailwind). */
  together: readonly PlatformId[];
}

export interface AdapterOutput {
  files: GeneratedFile[];
  next_steps: string[];
}

export type Adapter = (direction: Direction, options: AdapterOptions) => AdapterOutput;

export const DEFAULT_OPTIONS: AdapterOptions = {
  mode: 'both',
  language: 'ts',
  router: 'app',
  packageName: 'com.example.app',
  fontSource: 'self-hosted',
  together: [],
};
