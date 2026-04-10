// ─── React context for form state ───
// Provides the Zustand store, theme config, and form options via React context
// so widgets can access them without prop drilling.

import { createContext, useContext } from 'react';
import type { ThemeConfig, BrandInfo, FormMode, DisplayMode } from '@formweave/core';
import type { ThemePreset } from '@formweave/theme';
import type { FormStoreApi } from './store';

export interface FormContextValue {
  /** The Zustand store instance for this form */
  store: FormStoreApi;
  /** Resolved theme configuration (from core types) */
  theme: ThemeConfig;
  /** Resolved theme preset object (from @formweave/theme) */
  themePreset: ThemePreset;
  /** Resolved brand info from server config */
  brand: BrandInfo;
  /** Current form mode (edit, approval, readonly) */
  mode: FormMode;
  /** Current display mode (card, inline, accordion, panel, wizard) */
  display: DisplayMode;
  /** Whether form has been submitted at least once (for validation display) */
  hasSubmitted: boolean;
  /** Mark a field as blurred (for reward-early-punish-late validation) */
  markBlurred: (path: string) => void;
  /** Check if a field has been blurred */
  isBlurred: (path: string) => boolean;
}

export const FormContext = createContext<FormContextValue | null>(null);

/**
 * Access the form context. Throws if used outside a <Form>.
 */
export function useFormContext(): FormContextValue {
  const ctx = useContext(FormContext);
  if (!ctx) {
    throw new Error(
      'useFormContext must be used within a <Form> component. ' +
        'Wrap your component tree with <Form>.',
    );
  }
  return ctx;
}
