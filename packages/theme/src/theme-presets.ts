/**
 * FormWeave Theme Presets
 *
 * Each preset provides CSS custom property values that override the defaults
 * defined in styles.css. Apply by setting these as inline styles on the
 * .fw-form root element.
 */

export interface ThemePreset {
  /** Human-readable name for this preset */
  name: string;
  /** Unique key identifier */
  key: string;
  /** CSS custom property overrides to apply on .fw-form */
  tokens: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Default Theme — clean neutral, shadcn New York quality
// ---------------------------------------------------------------------------

export const defaultTheme: ThemePreset = {
  name: 'Default',
  key: 'default',
  tokens: {
    '--fw-primary': '#1a73e8',
    '--fw-primary-hsl': '217 91% 50%',
    '--fw-radius': '8px',
    '--fw-font':
      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    '--fw-bg': '#ffffff',
    '--fw-bg-surface': '#fafafa',
    '--fw-bg-hover': '#f5f5f5',
    '--fw-bg-active': '#f0f0f0',
    '--fw-bg-muted': '#f4f4f5',
    '--fw-text': '#1a1a1a',
    '--fw-text-secondary': '#6b7280',
    '--fw-text-muted': '#9ca3af',
    '--fw-border': '#e4e4e7',
    '--fw-shadow-sm': '0 1px 2px rgba(0,0,0,0.04)',
    '--fw-shadow-md': '0 4px 12px rgba(0,0,0,0.08)',
    '--fw-shadow-lg': '0 8px 24px rgba(0,0,0,0.12)',
    '--fw-duration-fast': '120ms',
    '--fw-duration-normal': '200ms',
    '--fw-duration-slow': '300ms',
  },
};

// ---------------------------------------------------------------------------
// shadcn Theme — explicitly shadcn/ui New York tokens
// ---------------------------------------------------------------------------

export const shadcnTheme: ThemePreset = {
  name: 'shadcn/ui',
  key: 'shadcn',
  tokens: {
    '--fw-primary': 'hsl(222.2 47.4% 11.2%)',
    '--fw-primary-hsl': '222.2 47.4% 11.2%',
    '--fw-radius': '6px',
    '--fw-font':
      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    '--fw-bg': 'hsl(0 0% 100%)',
    '--fw-bg-surface': 'hsl(210 40% 98%)',
    '--fw-bg-hover': 'hsl(210 40% 96.1%)',
    '--fw-bg-active': 'hsl(214 32% 91%)',
    '--fw-bg-muted': 'hsl(210 40% 96.1%)',
    '--fw-text': 'hsl(222.2 47.4% 11.2%)',
    '--fw-text-secondary': 'hsl(215.4 16.3% 46.9%)',
    '--fw-text-muted': 'hsl(215.4 16.3% 56.9%)',
    '--fw-border': 'hsl(214.3 31.8% 91.4%)',
    '--fw-shadow-sm': '0 1px 2px rgba(0,0,0,0.03)',
    '--fw-shadow-md': '0 2px 8px rgba(0,0,0,0.06)',
    '--fw-shadow-lg': '0 4px 16px rgba(0,0,0,0.10)',
    '--fw-font-weight-bold': '700',
    '--fw-duration-fast': '100ms',
    '--fw-duration-normal': '150ms',
    '--fw-duration-slow': '200ms',
  },
};

// ---------------------------------------------------------------------------
// Material Theme — Material Design 3 values
// ---------------------------------------------------------------------------

export const materialTheme: ThemePreset = {
  name: 'Material Design',
  key: 'material',
  tokens: {
    '--fw-primary': '#1976d2',
    '--fw-primary-hsl': '210 79% 46%',
    '--fw-radius': '4px',
    '--fw-font': "'Roboto', 'Helvetica Neue', Arial, sans-serif",
    '--fw-bg': '#ffffff',
    '--fw-bg-surface': '#fafafa',
    '--fw-bg-hover': 'rgba(0,0,0,0.04)',
    '--fw-bg-active': 'rgba(0,0,0,0.08)',
    '--fw-bg-muted': '#f5f5f5',
    '--fw-text': 'rgba(0,0,0,0.87)',
    '--fw-text-secondary': 'rgba(0,0,0,0.60)',
    '--fw-text-muted': 'rgba(0,0,0,0.38)',
    '--fw-border': 'rgba(0,0,0,0.12)',
    '--fw-shadow-sm': '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    '--fw-shadow-md':
      '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
    '--fw-shadow-lg':
      '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
    '--fw-color-error': '#d32f2f',
    '--fw-color-success': '#388e3c',
    '--fw-color-warning': '#f57c00',
    '--fw-color-info': '#1976d2',
    '--fw-font-size-sm': '12px',
    '--fw-font-size-md': '14px',
    '--fw-font-size-lg': '16px',
    '--fw-font-size-title': '24px',
    '--fw-font-weight-bold': '700',
    '--fw-duration-fast': '100ms',
    '--fw-duration-normal': '225ms',
    '--fw-duration-slow': '375ms',
    '--fw-ease-out': 'cubic-bezier(0.0, 0, 0.2, 1)',
    '--fw-ease-spring': 'cubic-bezier(0.4, 0, 0.2, 1)',
    '--fw-input-height': '48px',
    '--fw-toggle-width': '36px',
    '--fw-toggle-height': '20px',
    '--fw-toggle-knob': '16px',
  },
};

// ---------------------------------------------------------------------------
// Minimal Theme — very minimal, thin borders, small radius
// ---------------------------------------------------------------------------

export const minimalTheme: ThemePreset = {
  name: 'Minimal',
  key: 'minimal',
  tokens: {
    '--fw-primary': '#18181b',
    '--fw-primary-hsl': '240 6% 10%',
    '--fw-radius': '3px',
    '--fw-font': "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    '--fw-bg': '#ffffff',
    '--fw-bg-surface': '#fcfcfc',
    '--fw-bg-hover': '#f9f9f9',
    '--fw-bg-active': '#f4f4f4',
    '--fw-bg-muted': '#f7f7f7',
    '--fw-text': '#18181b',
    '--fw-text-secondary': '#71717a',
    '--fw-text-muted': '#a1a1aa',
    '--fw-border': '#ececec',
    '--fw-shadow-sm': 'none',
    '--fw-shadow-md': '0 1px 3px rgba(0,0,0,0.04)',
    '--fw-shadow-lg': '0 2px 8px rgba(0,0,0,0.06)',
    '--fw-ring': '0 0 0 2px color-mix(in srgb, #18181b 8%, transparent)',
    '--fw-font-size-xs': '10px',
    '--fw-font-size-sm': '12px',
    '--fw-font-size-md': '13px',
    '--fw-font-size-lg': '15px',
    '--fw-font-size-xl': '18px',
    '--fw-font-size-title': '24px',
    '--fw-font-weight-bold': '700',
    '--fw-duration-fast': '80ms',
    '--fw-duration-normal': '120ms',
    '--fw-duration-slow': '200ms',
    '--fw-accent-bar-height': '2px',
    '--fw-input-height': '36px',
    '--fw-input-height-sm': '28px',
    '--fw-input-height-lg': '44px',
  },
};

// ---------------------------------------------------------------------------
// All presets map
// ---------------------------------------------------------------------------

export const themePresets: Record<string, ThemePreset> = {
  default: defaultTheme,
  shadcn: shadcnTheme,
  material: materialTheme,
  minimal: minimalTheme,
};

/**
 * Apply a theme preset to a DOM element (typically the .fw-form root).
 * Sets CSS custom properties as inline styles.
 */
export function applyTheme(
  element: HTMLElement,
  preset: ThemePreset,
): void {
  for (const [property, value] of Object.entries(preset.tokens)) {
    element.style.setProperty(property, value);
  }
}

/**
 * Remove all FormWeave CSS custom property overrides from an element,
 * reverting to the stylesheet defaults.
 */
export function clearTheme(element: HTMLElement): void {
  const style = element.style;
  for (let i = style.length - 1; i >= 0; i--) {
    const prop = style[i];
    if (prop.startsWith('--fw-')) {
      style.removeProperty(prop);
    }
  }
}
