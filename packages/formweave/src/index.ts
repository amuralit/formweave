// ─── Main Form component ───
export { Form } from '@formweave/react';
export type { FormProps } from '@formweave/core';

// ─── Core utilities ───
export { analyzeSchema } from '@formweave/core';
export type {
  JSONSchema7,
  FieldDefinition,
  SchemaAnalysis,
  WidgetType,
  ThemeConfig,
  ThemePreset,
  MCPTool,
  ServerConfig,
  ActionConfig,
  DisplayMode,
  FormMode,
  WidgetProps,
  BrandInfo,
  SchemaConstraints,
  ToolMatch,
  FieldCondition,
  FieldGroup,
  WizardPage,
} from '@formweave/core';

// ─── Theme utilities ───
export { detectTheme, defaultTheme, shadcnTheme, materialTheme, minimalTheme } from '@formweave/theme';

// ─── Widget components for custom composition ───
export { WidgetRenderer } from '@formweave/widgets';
