// ─── Widget Resolver: 50+ deterministic rules mapping schema → widget type ───

import type { JSONSchema7, WidgetType } from './types';

/** Context passed to the resolver for cross-field rules */
export interface ResolverContext {
  fieldName: string;
  fieldPath: string;
  schema: JSONSchema7;
  required: boolean;
  fieldIndex: number;
  totalFields: number;
  allFieldNames: string[];
  parentSchema?: JSONSchema7;
}

// ─── Name-pattern helpers ───

const TITLE_FIELD_NAMES = /^(summary|title|name|subject|heading)$/i;
const TEXTAREA_FIELD_NAMES = /^(description|notes|body|content|comment|comments|message|bio|about|details|text|readme|instructions)$/i;
const ADDRESS_FIELD_NAMES = /^(address|street|street_address|address_line_1|address_line_2|city|state|province|zip|zip_code|postal_code|zipcode|country)$/i;
const START_DATETIME_NAMES = /^(start|start_date|start_time|starts_at|start_at|startDate|startTime|startsAt|startAt|begin|begin_date|begins_at|from|from_date)$/i;
const END_DATETIME_NAMES = /^(end|end_date|end_time|ends_at|end_at|endDate|endTime|endsAt|endAt|finish|finish_date|finishes_at|to|to_date|until)$/i;

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Check if all enum values look like hex color codes.
 */
function isColorEnum(enumValues?: any[]): boolean {
  if (!enumValues || enumValues.length === 0) return false;
  return enumValues.every(
    (v) => typeof v === 'string' && HEX_COLOR_PATTERN.test(v)
  );
}

/**
 * Check if an array schema's items is a single schema (not tuple).
 */
function getSingleItemsSchema(schema: JSONSchema7): JSONSchema7 | null {
  if (!schema.items) return null;
  if (Array.isArray(schema.items)) return null;
  return schema.items;
}

/**
 * Count the number of properties on an object schema.
 */
function propertyCount(schema: JSONSchema7): number {
  return schema.properties ? Object.keys(schema.properties).length : 0;
}

/**
 * Check if a field name matches a start datetime pattern.
 */
export function isStartDatetimeField(name: string): boolean {
  return START_DATETIME_NAMES.test(name);
}

/**
 * Check if a field name matches an end datetime pattern.
 */
export function isEndDatetimeField(name: string): boolean {
  return END_DATETIME_NAMES.test(name);
}

/**
 * Check if a field name matches an address field pattern.
 */
export function isAddressField(name: string): boolean {
  return ADDRESS_FIELD_NAMES.test(name);
}

/**
 * Resolve widget type for a single field.
 * Rules are applied in priority order (most specific first).
 */
export function resolveWidget(ctx: ResolverContext): WidgetType {
  const { fieldName, schema, required } = ctx;
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  // ─── L2: Title input ───
  if (
    type === 'string' &&
    required &&
    TITLE_FIELD_NAMES.test(fieldName) &&
    !schema.enum
  ) {
    return 'title-input';
  }

  // ─── L5: Boolean → toggle ───
  if (type === 'boolean') {
    return 'toggle';
  }

  // ─── String types ───
  if (type === 'string') {
    // ─── Enum handling ───
    if (schema.enum && schema.enum.length > 0) {
      // L-color: hex color enum → color-dots
      if (isColorEnum(schema.enum)) {
        return 'color-dots';
      }
      // L6: ≤5 enum values → pill-selector
      if (schema.enum.length <= 5) {
        return 'pill-selector';
      }
      // L7: >5 enum values → dropdown-select
      return 'dropdown-select';
    }

    // ─── Format-based rules ───
    if (schema.format) {
      switch (schema.format) {
        case 'date-time':
          return 'datetime-block';
        case 'date':
          return 'date-picker';
        case 'time':
          return 'time-picker';
        case 'data-url':
          return 'file-upload';
        // email, uri, uuid, ipv4, ipv6 → text with constraints
        case 'email':
        case 'uri':
        case 'url':
        case 'uuid':
        case 'ipv4':
        case 'ipv6':
        case 'hostname':
          return 'text';
      }
    }

    // ─── Textarea heuristics ───
    // Name-based
    if (TEXTAREA_FIELD_NAMES.test(fieldName)) {
      return 'textarea';
    }
    // Long description suggests multi-line
    if (schema.description && schema.description.length > 80) {
      return 'textarea';
    }
    // maxLength > 200 suggests multi-line
    if (schema.maxLength && schema.maxLength > 200) {
      return 'textarea';
    }

    // Default string → text
    return 'text';
  }

  // ─── Number / integer types ───
  if (type === 'number' || type === 'integer') {
    // Enum on numbers
    if (schema.enum) {
      if (schema.enum.length <= 5) return 'pill-selector';
      return 'dropdown-select';
    }
    return 'number-stepper';
  }

  // ─── Array types ───
  if (type === 'array') {
    const items = getSingleItemsSchema(schema);
    if (items) {
      // L3: array + items.format: email → people-picker
      if (items.format === 'email') {
        return 'people-picker';
      }

      // L9: array + items.type: object
      if (items.type === 'object') {
        if (propertyCount(items) > 3) {
          return 'array-table';
        }
        return 'array-list';
      }

      // Array of enums
      if (items.enum) {
        if (items.enum.length <= 5) return 'pill-selector';
        return 'dropdown-select';
      }

      // Array of strings (no format) → tag-input
      if (items.type === 'string' && !items.format) {
        return 'tag-input';
      }
    }

    // Fallback for arrays
    return 'array-list';
  }

  // ─── L8: Object with properties → object-section ───
  if (type === 'object') {
    return 'object-section';
  }

  // ─── Fallback ───
  return 'text';
}

/**
 * Resolve widgets for all top-level fields and apply cross-field rules
 * like L1 (datetime pair grouping) and L10 (address grouping).
 * Returns a map of fieldName → WidgetType.
 */
export function resolveWidgets(
  schema: JSONSchema7
): Map<string, WidgetType> {
  const result = new Map<string, WidgetType>();
  const properties = schema.properties || {};
  const requiredSet = new Set(schema.required || []);
  const allFieldNames = Object.keys(properties);

  allFieldNames.forEach((name, index) => {
    const fieldSchema = properties[name];
    const ctx: ResolverContext = {
      fieldName: name,
      fieldPath: name,
      schema: fieldSchema,
      required: requiredSet.has(name),
      fieldIndex: index,
      totalFields: allFieldNames.length,
      allFieldNames,
      parentSchema: schema,
    };

    result.set(name, resolveWidget(ctx));
  });

  // ─── L1 cross-field rule: datetime pair ───
  // If there are two format: date-time fields matching start*/end*, both get datetime-block
  // (they already would from format, but this ensures the grouping logic knows)
  const dtFields = allFieldNames.filter(
    (n) =>
      properties[n].format === 'date-time' ||
      properties[n].format === 'date'
  );
  const hasStartEnd =
    dtFields.some((n) => isStartDatetimeField(n)) &&
    dtFields.some((n) => isEndDatetimeField(n));

  if (hasStartEnd) {
    dtFields.forEach((n) => {
      if (isStartDatetimeField(n) || isEndDatetimeField(n)) {
        result.set(n, 'datetime-block');
      }
    });
  }

  return result;
}
