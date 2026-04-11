// ─── Hook for individual field state ───
// Subscribes to only this field's slice of the store for optimal re-renders.

import { useCallback } from 'react';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';
import { useFormContext } from './FormContext';

export interface FormFieldState {
  value: any;
  error: string | undefined;
  touched: boolean;
  aiPrefilled: boolean;
  setValue: (value: any) => void;
  setError: (error: string | undefined) => void;
}

/**
 * Subscribe to a single field's state from the form store.
 * Only re-renders when this specific field's data changes.
 */
export function useFormField(path: string): FormFieldState {
  const { store } = useFormContext();

  const fieldState = useStoreWithEqualityFn(
    store,
    (state) => ({
      value: state.values[path],
      error: state.errors[path],
      touched: state.touched[path] ?? false,
      aiPrefilled: state.aiPrefilled[path] ?? false,
    }),
    shallow,
  );

  const setValue = useCallback(
    (newValue: any) => { store.getState().setValue(path, newValue); },
    [store, path],
  );

  const setError = useCallback(
    (newError: string | undefined) => { store.getState().setError(path, newError); },
    [store, path],
  );

  return { ...fieldState, setValue, setError };
}
