// ─── Conditional field handling (if/then/else, allOf) ───

import type { JSONSchema7, FieldCondition } from './types';

interface ConditionalBlock {
  /** The field(s) in the `if` clause */
  conditionFields: string[];
  /** The expected value or pattern */
  conditionValue?: any;
  /** Fields revealed/modified in `then` */
  thenFields: string[];
  /** Fields revealed/modified in `else` */
  elseFields: string[];
}

/**
 * Extract field names referenced in a schema's `properties` or `required`.
 */
function extractFieldNames(schema: JSONSchema7 | undefined): string[] {
  if (!schema) return [];
  const fields: string[] = [];

  if (schema.properties) {
    fields.push(...Object.keys(schema.properties));
  }

  if (schema.required) {
    for (const r of schema.required) {
      if (!fields.includes(r)) {
        fields.push(r);
      }
    }
  }

  return fields;
}

/**
 * Extract the condition value from an `if` schema.
 * Looks for `properties.X.const`, `properties.X.enum`, or `required` patterns.
 */
function extractConditionValue(
  ifSchema: JSONSchema7
): { field: string; value?: any; operator: FieldCondition['operator'] } | null {
  if (!ifSchema.properties) {
    // If only `required` is specified, the condition is "field is truthy"
    if (ifSchema.required && ifSchema.required.length > 0) {
      return {
        field: ifSchema.required[0],
        operator: 'truthy',
      };
    }
    return null;
  }

  const props = ifSchema.properties;
  const fieldNames = Object.keys(props);
  if (fieldNames.length === 0) return null;

  const field = fieldNames[0];
  const fieldSchema = props[field];

  // const value → equals
  if (fieldSchema.const !== undefined) {
    return {
      field,
      value: fieldSchema.const,
      operator: 'equals',
    };
  }

  // enum with single value → equals
  if (fieldSchema.enum && fieldSchema.enum.length === 1) {
    return {
      field,
      value: fieldSchema.enum[0],
      operator: 'equals',
    };
  }

  // enum with multiple values → equals (first value, simplified)
  if (fieldSchema.enum && fieldSchema.enum.length > 1) {
    return {
      field,
      value: fieldSchema.enum,
      operator: 'equals',
    };
  }

  // Boolean type check
  if (fieldSchema.type === 'boolean') {
    return {
      field,
      operator: 'truthy',
    };
  }

  // Fallback: field exists
  return {
    field,
    operator: 'truthy',
  };
}

/**
 * Parse a single if/then/else block.
 */
function parseConditionalBlock(schema: JSONSchema7): ConditionalBlock | null {
  if (!schema.if) return null;

  const conditionFields = extractFieldNames(schema.if);
  const thenFields = extractFieldNames(schema.then);
  const elseFields = extractFieldNames(schema.else);

  if (conditionFields.length === 0) return null;
  if (thenFields.length === 0 && elseFields.length === 0) return null;

  const condition = extractConditionValue(schema.if);

  return {
    conditionFields,
    conditionValue: condition?.value,
    thenFields,
    elseFields,
  };
}

/**
 * Build a dependency map: for each field that has conditions,
 * return the list of FieldCondition entries.
 *
 * Parses:
 * 1. Top-level if/then/else
 * 2. allOf entries that contain if/then/else
 */
export function parseConditionals(
  schema: JSONSchema7
): Map<string, FieldCondition[]> {
  const result = new Map<string, FieldCondition[]>();

  function addConditions(block: ConditionalBlock) {
    const condition = extractConditionValue(
      // Re-derive from original schema — we pass enough info through the block
      { properties: Object.fromEntries(block.conditionFields.map((f) => [f, {}])) }
    );

    // The controlling field
    const controlField = block.conditionFields[0];
    if (!controlField) return;

    // For each "then" field, add a condition
    for (const field of block.thenFields) {
      if (field === controlField) continue;
      const existing = result.get(field) || [];
      existing.push({
        dependsOn: controlField,
        value: block.conditionValue,
        operator: block.conditionValue !== undefined ? 'equals' : 'truthy',
      });
      result.set(field, existing);
    }

    // For each "else" field, add a negated condition
    for (const field of block.elseFields) {
      if (field === controlField) continue;
      const existing = result.get(field) || [];
      existing.push({
        dependsOn: controlField,
        value: block.conditionValue,
        operator: block.conditionValue !== undefined ? 'not-equals' : 'falsy',
      });
      result.set(field, existing);
    }
  }

  // 1. Top-level if/then/else
  const topLevel = parseConditionalBlock(schema);
  if (topLevel) {
    addConditions(topLevel);
  }

  // 2. allOf entries with if/then/else
  if (schema.allOf) {
    for (const subSchema of schema.allOf) {
      const block = parseConditionalBlock(subSchema);
      if (block) {
        addConditions(block);
      }
    }
  }

  return result;
}

/**
 * Get the set of all fields that are controlled by conditionals
 * (i.e., they appear in `then` or `else` blocks).
 */
export function getConditionalFields(schema: JSONSchema7): Set<string> {
  const conditions = parseConditionals(schema);
  return new Set(conditions.keys());
}
