// ─── @formweave/core — public API ───

// Main entry point
export { analyzeSchema } from './analyze';
export type { AnalyzeOptions } from './analyze';

// Schema $ref resolution
export { dereferenceSchema } from './dereference';

// Widget resolver
export { resolveWidget, resolveWidgets } from './widget-resolver';
export type { ResolverContext } from './widget-resolver';

// Label utilities
export { humanizeFieldName, inferActionLabel } from './label-utils';

// Grouping
export { detectGroups } from './grouping';

// Progressive disclosure
export { assignTiers, visibleFieldCount } from './progressive-disclosure';
export type { Tier, TierAssignment } from './progressive-disclosure';

// Conditionals
export { parseConditionals, getConditionalFields } from './conditionals';

// Wizard
export { groupIntoPages, computeWizard, WIZARD_THRESHOLD } from './wizard';

// Tool matcher
export { matchFieldToTool, matchTools } from './tool-matcher';

// All types
export type {
  JSONSchema7,
  WidgetType,
  SchemaConstraints,
  ToolMatch,
  FieldDefinition,
  FieldCondition,
  FieldGroup,
  WizardPage,
  SchemaAnalysis,
  WidgetProps,
  ThemeConfig,
  ThemePreset,
  MCPTool,
  ServerConfig,
  BrandInfo,
  ActionVariant,
  ActionConfig,
  DisplayMode,
  FormMode,
  FormProps,
} from './types';
