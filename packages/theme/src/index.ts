/**
 * @formweave/theme — public API
 *
 * Exports theme presets, the theme detector, type definitions,
 * and utility functions for applying/clearing themes.
 */

// ── Types ──
export type { ThemePreset } from './theme-presets.js';
export type { DetectedSystem, DetectionResult } from './theme-detector.js';

// Re-export ThemePreset as ThemeConfig alias for convenience
export type { ThemePreset as ThemeConfig } from './theme-presets.js';

// ── Theme presets ──
export {
  defaultTheme,
  shadcnTheme,
  materialTheme,
  minimalTheme,
  themePresets,
  applyTheme,
  clearTheme,
} from './theme-presets.js';

// ── Theme detection ──
export {
  detectTheme,
  autoApplyTheme,
} from './theme-detector.js';
