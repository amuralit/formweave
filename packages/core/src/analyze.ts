// ─── Schema analysis: main entry point ───

import type {
  JSONSchema7,
  SchemaAnalysis,
  FieldDefinition,
  FieldGroup,
  SchemaConstraints,
  ToolMatch,
  FieldCondition,
} from './types';
import { resolveWidget, resolveWidgets } from './widget-resolver';
import type { ResolverContext } from './widget-resolver';
import { humanizeFieldName, inferActionLabel } from './label-utils';
import { detectGroups } from './grouping';
import { assignTiers } from './progressive-disclosure';
import { parseConditionals } from './conditionals';
import { computeWizard } from './wizard';
import { matchTools } from './tool-matcher';

// ─── Options ───

export interface AnalyzeOptions {
  /** Tool name (e.g., "create_event") for action label inference */
  toolName?: string;
  /** Available tool names for field-to-tool matching */
  availableTools?: string[];
  /** Override wizard threshold (default: 15) */
  wizardThreshold?: number;
  /** Schema title override */
  title?: string;
}

// ─── Constraint extraction ───

function extractConstraints(schema: JSONSchema7): SchemaConstraints {
  const constraints: SchemaConstraints = {};

  if (schema.minimum !== undefined) constraints.minimum = schema.minimum;
  if (schema.maximum !== undefined) constraints.maximum = schema.maximum;
  if (schema.minLength !== undefined) constraints.minLength = schema.minLength;
  if (schema.maxLength !== undefined) constraints.maxLength = schema.maxLength;
  if (schema.pattern !== undefined) constraints.pattern = schema.pattern;
  if (schema.enum !== undefined) constraints.enum = schema.enum;
  if (schema.minItems !== undefined) constraints.minItems = schema.minItems;
  if (schema.maxItems !== undefined) constraints.maxItems = schema.maxItems;
  if (schema.uniqueItems !== undefined) constraints.uniqueItems = schema.uniqueItems;
  if (schema.format !== undefined) constraints.format = schema.format;
  if (schema.default !== undefined) constraints.default = schema.default;

  // Infer step for integer types
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (type === 'integer') {
    constraints.step = 1;
  }

  return constraints;
}

// ─── Field building ───

function buildFieldDefinition(
  fieldName: string,
  fieldPath: string,
  schema: JSONSchema7,
  parentSchema: JSONSchema7,
  requiredSet: Set<string>,
  allFieldNames: string[],
  fieldIndex: number,
  widgetMap: Map<string, import('./types').WidgetType>,
  tierMap: Map<string, import('./progressive-disclosure').Tier>,
  groupMap: Map<string, { groupName: string; groupLabel: string }>,
  conditionMap: Map<string, FieldCondition[]>,
  toolMatchMap: Map<string, ToolMatch>
): FieldDefinition {
  const isRequired = requiredSet.has(fieldName);

  // Get widget from pre-computed map or resolve individually
  const widget = widgetMap.get(fieldName) ??
    resolveWidget({
      fieldName,
      fieldPath,
      schema,
      required: isRequired,
      fieldIndex,
      totalFields: allFieldNames.length,
      allFieldNames,
      parentSchema,
    });

  const tier = tierMap.get(fieldName) ?? 'essential';
  const groupInfo = groupMap.get(fieldName);
  const conditions = conditionMap.get(fieldName);
  const toolMatch = toolMatchMap.get(fieldName);

  const field: FieldDefinition = {
    path: fieldPath,
    widget,
    tier,
    label: humanizeFieldName(fieldName),
    description: schema.description,
    required: isRequired,
    constraints: extractConstraints(schema),
  };

  if (groupInfo) {
    field.group = groupInfo.groupName;
    field.groupLabel = groupInfo.groupLabel;
  }

  if (conditions && conditions.length > 0) {
    field.conditions = conditions;
  }

  if (toolMatch) {
    field.toolMatch = toolMatch;
  }

  // Recurse into object children
  if (widget === 'object-section' && schema.properties) {
    field.children = buildChildren(
      schema,
      fieldPath,
      conditionMap,
      toolMatchMap
    );
  }

  return field;
}

const MAX_SCHEMA_DEPTH = 10;

function buildChildren(
  schema: JSONSchema7,
  parentPath: string,
  conditionMap: Map<string, FieldCondition[]>,
  toolMatchMap: Map<string, ToolMatch>,
  depth: number = 0
): FieldDefinition[] {
  if (depth >= MAX_SCHEMA_DEPTH) return [];
  const properties = schema.properties || {};
  const requiredSet = new Set(schema.required || []);
  const fieldNames = Object.keys(properties);

  return fieldNames.map((name, index) => {
    const childPath = `${parentPath}.${name}`;
    const childSchema = properties[name];
    const widget = resolveWidget({
      fieldName: name,
      fieldPath: childPath,
      schema: childSchema,
      required: requiredSet.has(name),
      fieldIndex: index,
      totalFields: fieldNames.length,
      allFieldNames: fieldNames,
      parentSchema: schema,
    });

    const field: FieldDefinition = {
      path: childPath,
      widget,
      tier: 'essential', // Children inherit parent visibility
      label: humanizeFieldName(name),
      description: childSchema.description,
      required: requiredSet.has(name),
      constraints: extractConstraints(childSchema),
    };

    // Recurse further (with depth guard)
    if (widget === 'object-section' && childSchema.properties) {
      field.children = buildChildren(
        childSchema,
        childPath,
        conditionMap,
        toolMatchMap,
        depth + 1
      );
    }

    return field;
  });
}

// ─── Main analysis function ───

/**
 * Analyze a JSON Schema and produce a complete SchemaAnalysis.
 *
 * Pipeline:
 * 1. Parse schema properties
 * 2. Resolve widgets for each field
 * 3. Detect field groups (datetime, address, contact)
 * 4. Assign progressive disclosure tiers
 * 5. Parse conditionals (if/then/else)
 * 6. Match fields to tools
 * 7. Compute wizard pages (if threshold exceeded)
 * 8. Assemble final result
 */
export function analyzeSchema(
  schema: JSONSchema7,
  options?: AnalyzeOptions
): SchemaAnalysis {
  const properties = schema.properties || {};
  const allFieldNames = Object.keys(properties);

  // ── Step 2: Resolve widgets ──
  const widgetMap = resolveWidgets(schema);

  // ── Step 3: Detect groups ──
  const groups = detectGroups(schema);

  // Build group lookup map
  const groupMap = new Map<string, { groupName: string; groupLabel: string }>();
  for (const group of groups) {
    for (const fieldPath of group.fields) {
      groupMap.set(fieldPath, {
        groupName: group.name,
        groupLabel: group.label,
      });
    }
  }

  // ── Step 4: Assign tiers ──
  const tierAssignments = assignTiers(schema);
  const tierMap = new Map(
    tierAssignments.map((a) => [a.fieldName, a.tier] as const)
  );

  // ── Step 5: Parse conditionals ──
  const conditionMap = parseConditionals(schema);

  // ── Step 6: Match tools ──
  const toolMatchMap = options?.availableTools
    ? matchTools(schema, options.availableTools)
    : new Map<string, ToolMatch>();

  // ── Step 7: Build field definitions ──
  const requiredSet = new Set(schema.required || []);
  const fields: FieldDefinition[] = allFieldNames.map((name, index) => {
    return buildFieldDefinition(
      name,
      name,
      properties[name],
      schema,
      requiredSet,
      allFieldNames,
      index,
      widgetMap,
      tierMap,
      groupMap,
      conditionMap,
      toolMatchMap
    );
  });

  // ── Step 8: Compute wizard ──
  const threshold = options?.wizardThreshold ?? 15;
  const wizardResult = computeWizard(fields, groups, threshold);

  // If wizard is enabled, annotate fields with page info (O(1) lookup via Map)
  if (wizardResult.useWizard && wizardResult.pages) {
    const fieldMap = new Map(fields.map(f => [f.path, f]));
    for (const page of wizardResult.pages) {
      for (const fieldPath of page.fields) {
        const field = fieldMap.get(fieldPath);
        if (field) {
          field.wizardPage = page.index;
          field.wizardPageLabel = page.label;
        }
      }
    }
  }

  // ── Step 9: Assemble result ──
  const result: SchemaAnalysis = {
    fields,
    groups,
    useWizard: wizardResult.useWizard,
    actionLabel: inferActionLabel(options?.toolName),
    title: options?.title ?? schema.title,
  };

  if (wizardResult.pages) {
    result.wizardPages = wizardResult.pages;
  }

  return result;
}
