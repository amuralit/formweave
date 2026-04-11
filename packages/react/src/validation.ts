// ─── Lightweight built-in JSON Schema validator ───
// Handles common constraints without requiring AJV as a dependency.

import type { JSONSchema7 } from '@formweave/core';

export interface ValidationError {
  path: string;
  message: string;
}

export interface Validator {
  schema: JSONSchema7;
}

/**
 * Compile a JSON Schema into a reusable validator handle.
 */
export function createValidator(schema: JSONSchema7): Validator {
  return { schema };
}

// ─── Format validators ───

const FORMAT_VALIDATORS: Record<string, (v: string) => boolean> = {
  email: (v) => {
    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'email';
      input.value = v;
      return input.validity.valid;
    }
    return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(v);
  },
  uri: (v) => {
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  },
  url: (v) => {
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  },
  uuid: (v) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
  ipv4: (v) => {
    const parts = v.split('.');
    if (parts.length !== 4) return false;
    return parts.every((p) => {
      const n = Number(p);
      return Number.isInteger(n) && n >= 0 && n <= 255 && p === String(n);
    });
  },
  ipv6: (v) => {
    const parts = v.split(':');
    if (parts.length < 3 || parts.length > 8) return false;
    const doubleColonCount = (v.match(/::/g) || []).length;
    if (doubleColonCount > 1) return false;
    for (const part of parts) {
      if (part.length > 4) return false;
      if (part.length > 0 && !/^[0-9a-fA-F]+$/.test(part)) return false;
    }
    if (doubleColonCount === 0 && parts.length !== 8) return false;
    return true;
  },
  'date-time': (v) => !isNaN(Date.parse(v)),
  date: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)),
  time: (v) => /^\d{2}:\d{2}(:\d{2})?$/.test(v),
  hostname: (v) => /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(v),
};

/**
 * Validate a single value against a field's subschema.
 * Returns an error message string, or undefined if valid.
 */
function validateValue(
  value: any,
  fieldSchema: JSONSchema7,
  fieldName: string,
  isRequired: boolean,
): string | undefined {
  // Check required — missing value
  const isEmpty =
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0);

  if (isRequired && isEmpty) {
    return `${fieldName} is required`;
  }

  // If the value is empty and not required, skip further checks
  if (isEmpty) return undefined;

  const type = Array.isArray(fieldSchema.type)
    ? fieldSchema.type[0]
    : fieldSchema.type;

  // ─── String constraints ───
  if (type === 'string' && typeof value === 'string') {
    if (
      fieldSchema.minLength !== undefined &&
      value.length < fieldSchema.minLength
    ) {
      return `Must be at least ${fieldSchema.minLength} characters`;
    }
    if (
      fieldSchema.maxLength !== undefined &&
      value.length > fieldSchema.maxLength
    ) {
      return `Must be at most ${fieldSchema.maxLength} characters`;
    }
    if (fieldSchema.pattern) {
      try {
        const re = new RegExp(fieldSchema.pattern);
        // Guard against ReDoS: cap input length tested against untrusted patterns
        const testValue = value.length > 1000 ? value.slice(0, 1000) : value;
        if (!re.test(testValue)) {
          return `Invalid format`;
        }
      } catch {
        // Invalid regex in schema — skip check
      }
    }
    if (fieldSchema.format) {
      const formatFn = FORMAT_VALIDATORS[fieldSchema.format];
      if (formatFn && !formatFn(value)) {
        return `Invalid ${fieldSchema.format} format`;
      }
    }
  }

  // ─── Number constraints ───
  if (
    (type === 'number' || type === 'integer') &&
    typeof value === 'number'
  ) {
    if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
      return `Must be at least ${fieldSchema.minimum}`;
    }
    if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
      return `Must be at most ${fieldSchema.maximum}`;
    }
    if (type === 'integer' && !Number.isInteger(value)) {
      return `Must be a whole number`;
    }
  }

  // ─── Enum constraint ───
  if (fieldSchema.enum) {
    if (!fieldSchema.enum.includes(value)) {
      return `Must be one of: ${fieldSchema.enum.join(', ')}`;
    }
  }

  // ─── Array constraints ───
  if (type === 'array' && Array.isArray(value)) {
    if (
      fieldSchema.minItems !== undefined &&
      value.length < fieldSchema.minItems
    ) {
      return `Must have at least ${fieldSchema.minItems} items`;
    }
    if (
      fieldSchema.maxItems !== undefined &&
      value.length > fieldSchema.maxItems
    ) {
      return `Must have at most ${fieldSchema.maxItems} items`;
    }
    if (fieldSchema.uniqueItems && new Set(value).size !== value.length) {
      return `All items must be unique`;
    }
  }

  return undefined;
}

/**
 * Validate a single field.
 * Returns an error string or undefined.
 */
export function validateField(
  validator: Validator,
  path: string,
  value: any,
): string | undefined {
  const schema = validator.schema;

  // Resolve nested path: "address.street" -> schema.properties.address.properties.street
  let fieldSchema: JSONSchema7 | undefined;
  let isRequired = false;

  const segments = path.split('.');
  if (segments.length === 1) {
    fieldSchema = schema.properties?.[path];
    isRequired = schema.required?.includes(path) ?? false;
  } else {
    let current: any = schema;
    for (let i = 0; i < segments.length; i++) {
      if (!current?.properties?.[segments[i]]) { return undefined; }
      if (i === segments.length - 1) {
        fieldSchema = current.properties[segments[i]];
        isRequired = current.required?.includes(segments[i]) ?? false;
      } else {
        current = current.properties[segments[i]];
      }
    }
  }

  if (!fieldSchema) return undefined;
  const label = (fieldSchema as any).title || segments[segments.length - 1];
  return validateValue(value, fieldSchema as JSONSchema7, label, isRequired);
}

/**
 * Validate all fields in the schema.
 * Returns a map of path -> error message for all failing fields.
 */
export function validateAll(
  validator: Validator,
  values: Record<string, any>,
): Record<string, string> {
  const schema = validator.schema;
  const errors: Record<string, string> = {};
  const properties = schema.properties || {};
  const requiredSet = new Set(schema.required || []);

  for (const [fieldName, fieldSchema] of Object.entries(properties)) {
    const value = values[fieldName];
    const label = fieldSchema.title || fieldName;
    const error = validateValue(value, fieldSchema, label, requiredSet.has(fieldName));
    if (error) {
      errors[fieldName] = error;
    }
  }

  return errors;
}

// ─── Reward-early-punish-late helpers ───

export interface FieldValidationState {
  hasBlurred: boolean;
  hasSubmitted: boolean;
}

/**
 * Determines whether to show an error based on the reward-early-punish-late pattern:
 * - Don't show errors until the field has been blurred AND has a value
 * - Remove errors instantly when the value becomes valid during typing
 * - On submit, validate all and show all errors
 */
export function shouldShowError(
  error: string | undefined,
  fieldState: FieldValidationState,
  value: any,
): boolean {
  // No error — never show
  if (!error) return false;

  // After submit — always show remaining errors
  if (fieldState.hasSubmitted) return true;

  // Before blur — don't show errors (user is still typing)
  if (!fieldState.hasBlurred) return false;

  // After blur — show error only if there's a non-empty value
  const hasValue =
    value !== undefined &&
    value !== null &&
    value !== '' &&
    !(Array.isArray(value) && value.length === 0);

  return hasValue;
}
