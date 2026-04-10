// ─── Zustand per-field state management ───

import { createStore } from 'zustand/vanilla';

export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  aiPrefilled: Record<string, boolean>;
}

export interface FormActions {
  setValue: (path: string, value: any) => void;
  setError: (path: string, error: string | undefined) => void;
  setValues: (values: Record<string, any>) => void;
  markAiPrefilled: (paths: string[]) => void;
  getValues: () => Record<string, any>;
  reset: () => void;
}

export type FormStore = FormState & FormActions;

const EMPTY_STATE: FormState = {
  values: {},
  errors: {},
  touched: {},
  aiPrefilled: {},
};

/**
 * Factory: each Form instance gets its own isolated store.
 */
export function createFormStore(
  initialValues?: Record<string, any>,
  aiPrefilledPaths?: string[],
) {
  const initState: FormState = {
    values: initialValues ? { ...initialValues } : {},
    errors: {},
    touched: {},
    aiPrefilled: aiPrefilledPaths
      ? Object.fromEntries(aiPrefilledPaths.map((p) => [p, true]))
      : {},
  };

  return createStore<FormStore>((set, get) => ({
    ...initState,

    setValue(path: string, value: any) {
      set((state) => {
        const next: Partial<FormState> = {
          values: { ...state.values, [path]: value },
        };
        // Only spread touched/aiPrefilled if the value actually changes
        if (!state.touched[path]) {
          next.touched = { ...state.touched, [path]: true };
        }
        if (state.aiPrefilled[path]) {
          next.aiPrefilled = { ...state.aiPrefilled, [path]: false };
        }
        return next;
      });
    },

    setError(path: string, error: string | undefined) {
      set((state) => {
        if (error === undefined) {
          const next = { ...state.errors };
          delete next[path];
          return { errors: next };
        }
        return { errors: { ...state.errors, [path]: error } };
      });
    },

    setValues(values: Record<string, any>) {
      set({ values: { ...values } });
    },

    markAiPrefilled(paths: string[]) {
      set((state) => {
        const next = { ...state.aiPrefilled };
        for (const p of paths) {
          next[p] = true;
        }
        return { aiPrefilled: next };
      });
    },

    getValues() {
      return get().values;
    },

    reset() {
      set({ ...EMPTY_STATE });
    },
  }));
}

export type FormStoreApi = ReturnType<typeof createFormStore>;
