// ─── @formweave/react — public API ───

// ── Main Form component ──
export { Form } from './Form';

// ── Context and hooks ──
export { FormContext, useFormContext } from './FormContext';
export type { FormContextValue } from './FormContext';

export { useFormField } from './useFormField';
export type { FormFieldState } from './useFormField';

// ── Store ──
export { createFormStore } from './store';
export type { FormState, FormActions, FormStore, FormStoreApi } from './store';

// ── Validation ──
export {
  createValidator,
  validateField,
  validateAll,
  shouldShowError,
} from './validation';
export type { Validator, ValidationError, FieldValidationState } from './validation';

// ── Brand resolution ──
export { resolveBrand, getServiceRegistry } from './brand-resolver';

// ── Conditional field visibility ──
export {
  evaluateConditions,
  useFieldVisibility,
  ConditionalWrapper,
} from './conditional-renderer';
