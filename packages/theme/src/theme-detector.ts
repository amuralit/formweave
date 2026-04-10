/**
 * FormWeave Theme Detector
 *
 * Inspects the DOM for CSS custom properties that indicate which design
 * system is in use, and returns the matching ThemePreset key.
 */

import type { ThemePreset } from './theme-presets.js';
import {
  shadcnTheme,
  materialTheme,
  defaultTheme,
} from './theme-presets.js';

export type DetectedSystem =
  | 'shadcn'
  | 'material'
  | 'ant'
  | 'chakra'
  | 'tailwind-v4'
  | 'unknown';

export interface DetectionResult {
  /** Which design system was detected */
  system: DetectedSystem;
  /** Confidence 0-1 (how many signature variables were found) */
  confidence: number;
  /** Recommended theme preset to use */
  preset: ThemePreset;
}

// Signature CSS custom properties for each design system
const SIGNATURES: Record<DetectedSystem, string[]> = {
  shadcn: [
    '--radius',
    '--primary',
    '--primary-foreground',
    '--background',
    '--foreground',
    '--muted',
    '--card',
    '--popover',
    '--accent',
    '--border',
  ],
  material: [
    '--mui-palette-primary-main',
    '--mui-palette-secondary-main',
    '--mui-palette-error-main',
    '--mui-palette-background-default',
    '--mui-shape-borderRadius',
    '--mui-typography-fontFamily',
    '--mui-shadows-1',
  ],
  ant: [
    '--ant-color-primary',
    '--ant-color-success',
    '--ant-color-warning',
    '--ant-color-error',
    '--ant-border-radius',
    '--ant-font-family',
    '--ant-font-size',
  ],
  chakra: [
    '--chakra-colors-primary',
    '--chakra-colors-gray-100',
    '--chakra-colors-gray-200',
    '--chakra-fonts-body',
    '--chakra-radii-md',
    '--chakra-space-4',
    '--chakra-fontSizes-md',
  ],
  'tailwind-v4': [
    '--color-primary',
    '--color-secondary',
    '--spacing',
    '--font-sans',
    '--radius-lg',
    '--radius-md',
    '--color-background',
  ],
  unknown: [],
};

// Map detected systems to preset keys
const SYSTEM_TO_PRESET: Record<DetectedSystem, ThemePreset> = {
  shadcn: shadcnTheme,
  material: materialTheme,
  ant: defaultTheme, // Ant Design has no dedicated preset; default works well
  chakra: defaultTheme,
  'tailwind-v4': defaultTheme,
  unknown: defaultTheme,
};

/**
 * Check whether a CSS custom property is defined on a given element or
 * anywhere in its computed style chain.
 */
function hasVariable(
  computedStyle: CSSStyleDeclaration,
  name: string,
): boolean {
  const value = computedStyle.getPropertyValue(name).trim();
  return value !== '';
}

/**
 * Detect which host design system is active by probing the DOM for
 * signature CSS custom properties.
 *
 * @param root  The element to inspect (defaults to document.documentElement)
 * @returns     A DetectionResult with the best-matching system
 */
export function detectTheme(
  root?: HTMLElement,
): DetectionResult {
  // Guard against SSR / non-browser environments
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      system: 'unknown',
      confidence: 0,
      preset: defaultTheme,
    };
  }

  const element = root ?? document.documentElement;
  const computed = window.getComputedStyle(element);

  let bestSystem: DetectedSystem = 'unknown';
  let bestScore = 0;
  let bestTotal = 1; // avoid division by zero

  for (const [system, vars] of Object.entries(SIGNATURES) as [
    DetectedSystem,
    string[],
  ][]) {
    if (system === 'unknown' || vars.length === 0) continue;

    let hits = 0;
    for (const v of vars) {
      if (hasVariable(computed, v)) {
        hits++;
      }
    }

    const score = hits / vars.length;
    if (score > bestScore && hits >= 2) {
      bestSystem = system;
      bestScore = score;
      bestTotal = vars.length;
    }
  }

  // Also check <body> since some frameworks set variables there
  if (bestSystem === 'unknown' && element === document.documentElement) {
    const bodyResult = detectTheme(document.body);
    if (bodyResult.system !== 'unknown' && bodyResult.confidence > 0) {
      return bodyResult;
    }
  }

  return {
    system: bestSystem,
    confidence: bestScore,
    preset: SYSTEM_TO_PRESET[bestSystem],
  };
}

/**
 * Auto-detect and apply the best theme to a FormWeave form element.
 * Returns the detection result so consumers can react to it.
 */
export function autoApplyTheme(
  formElement: HTMLElement,
): DetectionResult {
  const result = detectTheme();

  // Apply detected preset tokens as inline styles
  for (const [property, value] of Object.entries(result.preset.tokens)) {
    formElement.style.setProperty(property, value);
  }

  // Set a data attribute for CSS hooks
  formElement.dataset.fwTheme = result.preset.key;

  return result;
}
