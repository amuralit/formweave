// ─── Hook for individual field state ───
// Subscribes to only this field's slice of the store for optimal re-renders.

import { useSyncExternalStore, useCallback } from 'react';
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

  // Subscribe to the value slice
  const value = useSyncExternalStore(
    store.subscribe,
    () => store.getState().values[path],
    () => store.getState().values[path],
  );

  // Subscribe to the error slice
  const error = useSyncExternalStore(
    store.subscribe,
    () => store.getState().errors[path],
    () => store.getState().errors[path],
  );

  // Subscribe to the touched slice
  const touched = useSyncExternalStore(
    store.subscribe,
    () => store.getState().touched[path] ?? false,
    () => store.getState().touched[path] ?? false,
  );

  // Subscribe to the aiPrefilled slice
  const aiPrefilled = useSyncExternalStore(
    store.subscribe,
    () => store.getState().aiPrefilled[path] ?? false,
    () => store.getState().aiPrefilled[path] ?? false,
  );

  const setValue = useCallback(
    (newValue: any) => {
      store.getState().setValue(path, newValue);
    },
    [store, path],
  );

  const setError = useCallback(
    (newError: string | undefined) => {
      store.getState().setError(path, newError);
    },
    [store, path],
  );

  return {
    value,
    error,
    touched,
    aiPrefilled,
    setValue,
    setError,
  };
}
