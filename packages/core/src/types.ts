// ─── JSON Schema types (draft-07 subset) ───

export interface JSONSchema7 {
  type?: string | string[];
  properties?: Record<string, JSONSchema7>;
  required?: string[];
  items?: JSONSchema7 | JSONSchema7[];
  enum?: any[];
  const?: any;
  format?: string;
  description?: string;
  title?: string;
  default?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  oneOf?: JSONSchema7[];
  anyOf?: JSONSchema7[];
  allOf?: JSONSchema7[];
  if?: JSONSchema7;
  then?: JSONSchema7;
  else?: JSONSchema7;
  $ref?: string;
  $defs?: Record<string, JSONSchema7>;
  definitions?: Record<string, JSONSchema7>;
  additionalProperties?: boolean | JSONSchema7;
  'x-ui-hints'?: Record<string, any>;
}

// ─── Widget types ───

export type WidgetType =
  | 'text'
  | 'textarea'
  | 'number-stepper'
  | 'toggle'
  | 'pill-selector'
  | 'dropdown-select'
  | 'datetime-block'
  | 'date-picker'
  | 'time-picker'
  | 'people-picker'
  | 'tag-input'
  | 'color-dots'
  | 'rich-text'
  | 'code-editor'
  | 'file-upload'
  | 'object-section'
  | 'array-table'
  | 'array-list'
  | 'title-input'
  | 'hidden';

// ─── Stream A → Stream D: Schema analysis output ───

export interface SchemaConstraints {
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: any[];
  enumDescriptions?: string[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  format?: string;
  default?: any;
  step?: number;
}

export interface ToolMatch {
  toolName: string;
  confidence: number;
  matchType: 'exact' | 'schema' | 'fuzzy';
  enhancementType: 'search' | 'list' | 'autocomplete';
}

export interface FieldDefinition {
  path: string;
  widget: WidgetType;
  tier: 'essential' | 'details' | 'advanced';
  group?: string;
  groupLabel?: string;
  label: string;
  description?: string;
  required: boolean;
  constraints: SchemaConstraints;
  toolMatch?: ToolMatch;
  children?: FieldDefinition[];
  conditions?: FieldCondition[];
  wizardPage?: number;
  wizardPageLabel?: string;
}

export interface FieldCondition {
  dependsOn: string;
  value?: any;
  operator: 'equals' | 'not-equals' | 'truthy' | 'falsy';
}

export interface FieldGroup {
  name: string;
  label: string;
  fields: string[];
  type: 'datetime-pair' | 'address' | 'contact' | 'semantic';
}

export interface WizardPage {
  index: number;
  label: string;
  fields: string[];
}

export interface SchemaAnalysis {
  fields: FieldDefinition[];
  groups: FieldGroup[];
  wizardPages?: WizardPage[];
  useWizard: boolean;
  actionLabel?: string;
  title?: string;
}

// ─── Stream B → Stream D: Widget props ───

export interface WidgetProps<T = any> {
  value: T;
  onChange: (value: T) => void;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  config: FieldDefinition;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}

// ─── Stream C → Stream D: Theme configuration ───

export interface ThemeConfig {
  primary: string;
  radius: number;
  fontFamily: string;
  density: 'compact' | 'comfortable';
}

export type ThemePreset = 'auto' | 'default' | 'shadcn' | 'material' | 'minimal';

// ─── MCP tool types ───

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: JSONSchema7;
}

// ─── Server / brand config ───

export interface ServerConfig {
  name: string;
  icon?: string;
  serverUrl?: string;
  color?: string;
}

export interface BrandInfo {
  name: string;
  icon: string;
  svg?: string;
  color: string;
  source: 'explicit' | 'favicon' | 'registry' | 'generated';
}

// ─── Action buttons ───

export type ActionVariant = 'primary' | 'outline' | 'ghost' | 'danger';

export interface ActionConfig {
  label: string;
  variant: ActionVariant;
  onClick: (data: Record<string, any>) => void;
  disabled?: boolean;
  loading?: boolean;
  position?: 'left' | 'right';
}

// ─── Display modes ───

export type DisplayMode = 'card' | 'inline' | 'accordion' | 'panel' | 'wizard' | 'compact';
export type FormMode = 'edit' | 'approval' | 'readonly';

// ─── Public Form component API ───

export interface FormProps {
  schema: JSONSchema7;
  values?: Record<string, any>;
  tools?: MCPTool[];
  onSubmit?: (data: Record<string, any>) => void;
  onChange?: (data: Record<string, any>, changedField: string) => void;
  onToolCall?: (toolName: string, args: Record<string, any>) => Promise<any>;

  server?: ServerConfig;
  heading?: string;
  description?: string;
  iconUrl?: string;

  theme?: ThemePreset | ThemeConfig;
  density?: 'compact' | 'comfortable';

  display?: DisplayMode;
  mode?: FormMode;

  submitLabel?: string;
  onCancel?: () => void;
  actions?: ActionConfig[];

  accordionTitle?: string;
  accordionDefaultOpen?: boolean;

  wizardThreshold?: number;
  wizardSteps?: string[];

  defaults?: Record<string, any>;
  showDiff?: boolean;

  toolCacheTTL?: number;
  toolTimeout?: number;
  toolPolicy?: {
    allowed?: string[];
    denied?: string[];
  };

  locale?: string;
  labels?: Record<string, string>;

  className?: string;
  style?: Record<string, string | number>;
}
