import { z } from 'zod';

export const PLATFORM_IDS = [
  'html',
  'tailwind',
  'react',
  'nextjs',
  'compose',
  'android-xml',
] as const;
export type PlatformId = (typeof PLATFORM_IDS)[number];
export const PlatformSchema = z.enum(PLATFORM_IDS);

export const WEB_PLATFORMS: readonly PlatformId[] = ['html', 'tailwind', 'react', 'nextjs'];
export const ANDROID_PLATFORMS: readonly PlatformId[] = ['compose', 'android-xml'];

export const SURFACES = ['landing', 'app', 'game', 'dashboard', 'ecommerce'] as const;
export type Surface = (typeof SURFACES)[number];
export const SurfaceSchema = z.enum(SURFACES);

export function platformFamily(p: PlatformId): 'web' | 'android' {
  return ANDROID_PLATFORMS.includes(p) ? 'android' : 'web';
}
