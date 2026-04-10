// ─── Form.tsx — The main public <Form> component ───
// Wires together schema analysis, Zustand store, branding, validation,
// conditional fields, progressive disclosure, and widget rendering.

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import type {
  FormProps,
  FieldDefinition,
  ThemeConfig,
  BrandInfo,
  WizardPage,
} from '@formweave/core';
import { analyzeSchema } from '@formweave/core';
import {
  WidgetRenderer,
  FormHeader,
  FormFooter,
  ProgressiveDisclosure,
  WizardNav,
  AiDot,
} from '@formweave/widgets';
import {
  themePresets,
  detectTheme,
  applyTheme,
  type ThemePreset,
} from '@formweave/theme';

import { createFormStore, type FormStoreApi } from './store';
import {
  createValidator,
  validateField,
  validateAll,
  shouldShowError,
} from './validation';
import { resolveBrand } from './brand-resolver';
import { FormContext, useFormContext, type FormContextValue } from './FormContext';
import { ConditionalWrapper } from './conditional-renderer';
import { useFormField } from './useFormField';

// ─── Theme resolution helpers ───

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  primary: '#6366F1',
  radius: 8,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  density: 'comfortable',
};

/**
 * Resolve the theme prop into a usable ThemePreset and ThemeConfig.
 * Supports: 'auto', preset key strings, or a custom ThemeConfig object.
 */
function resolveThemeFromProp(
  themeProp?: FormProps['theme'],
  density?: 'compact' | 'comfortable',
): { themePreset: ThemePreset; themeConfig: ThemeConfig } {
  // Custom ThemeConfig object passed directly
  if (themeProp && typeof themeProp === 'object') {
    return {
      themePreset: themePresets.default,
      themeConfig: {
        ...themeProp,
        density: density || themeProp.density,
      },
    };
  }

  // String preset key
  const key = typeof themeProp === 'string' ? themeProp : 'auto';
  const preset = key === 'auto' || key === 'default'
    ? themePresets.default
    : themePresets[key] ?? themePresets.default;

  return {
    themePreset: preset,
    themeConfig: {
      ...DEFAULT_THEME_CONFIG,
      density: density || DEFAULT_THEME_CONFIG.density,
    },
  };
}

// ─── FieldRenderer: renders a single field with its widget ───

interface FieldRendererProps {
  field: FieldDefinition;
  onBlur: (path: string) => void;
  onChange: (path: string, value: any) => void;
}

const FieldRenderer = memo(function FieldRenderer({ field, onBlur, onChange }: FieldRendererProps) {
  const { value, error, touched, aiPrefilled, setValue } = useFormField(field.path);
  const { mode, isBlurred, hasSubmitted } = useFormContext();

  const isReadOnly = mode === 'readonly';
  const isDisabled = mode === 'readonly';

  // Reward-early-punish-late: determine whether to display the error
  const displayError = shouldShowError(
    error,
    { hasBlurred: isBlurred(field.path), hasSubmitted },
    value,
  )
    ? error
    : undefined;

  const handleChange = useCallback(
    (newValue: any) => {
      setValue(newValue);
      onChange(field.path, newValue);
    },
    [setValue, onChange, field.path],
  );

  const handleBlur = useCallback(() => {
    onBlur(field.path);
  }, [onBlur, field.path]);

  // Determine which CSS class to apply for AI-prefilled state
  const fieldCls = [
    'fw-field',
    `fw-field--${field.widget}`,
    aiPrefilled && 'fw-field--ai-prefilled',
    touched && 'fw-field--touched',
    displayError && 'fw-field--has-error',
    field.required && 'fw-field--required',
  ]
    .filter(Boolean)
    .join(' ');

  const effectiveValue = value ?? field.constraints.default ?? (field.widget === 'toggle' ? false : '');

  return (
    <ConditionalWrapper conditions={field.conditions}>
      <div className={fieldCls} onBlur={handleBlur}>
        {aiPrefilled && <AiDot visible />}
        <WidgetRenderer
          value={effectiveValue}
          onChange={handleChange}
          error={displayError}
          disabled={isDisabled}
          readOnly={isReadOnly}
          config={field}
        />
        {field.description && !displayError && (
          <p className="fw-field__description">{field.description}</p>
        )}
      </div>
    </ConditionalWrapper>
  );
});

// ─── GroupedFieldRenderer: renders fields, grouping them as needed ───

interface GroupedFieldRendererProps {
  fields: FieldDefinition[];
  onBlur: (path: string) => void;
  onChange: (path: string, value: any) => void;
}

function GroupedFieldRenderer({ fields, onBlur, onChange }: GroupedFieldRendererProps) {
  const rendered = new Set<string>();
  const elements: React.ReactNode[] = [];

  for (const field of fields) {
    if (rendered.has(field.path)) continue;

    if (field.group) {
      // Collect all fields in this same group that haven't been rendered
      const groupFields = fields.filter(
        (f) => f.group === field.group && !rendered.has(f.path),
      );
      groupFields.forEach((f) => rendered.add(f.path));

      elements.push(
        <div
          key={`group-${field.group}`}
          className="fw-field-group"
          role="group"
          aria-label={field.groupLabel}
        >
          {field.groupLabel && (
            <span className="fw-field-group__label">{field.groupLabel}</span>
          )}
          <div className="fw-field-group__fields">
            {groupFields.map((gf) => (
              <FieldRenderer key={gf.path} field={gf} onBlur={onBlur} onChange={onChange} />
            ))}
          </div>
        </div>,
      );
    } else {
      rendered.add(field.path);
      elements.push(
        <FieldRenderer key={field.path} field={field} onBlur={onBlur} onChange={onChange} />,
      );
    }
  }

  return <>{elements}</>;
}

// ─── AccordionWrapper ───

interface AccordionWrapperProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function AccordionWrapper({ title, defaultOpen, children }: AccordionWrapperProps) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  return (
    <div className={`fw-accordion ${open ? 'fw-accordion--open' : ''}`}>
      <button
        type="button"
        className="fw-accordion__header"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="fw-accordion__title">{title}</span>
        <span className="fw-accordion__chevron" aria-hidden="true">
          {open ? '\u25B2' : '\u25BC'}
        </span>
      </button>
      {open && <div className="fw-accordion__body">{children}</div>}
    </div>
  );
}

// ─── Main Form component ───

export function Form(props: FormProps) {
  const {
    schema,
    values: initialValues,
    tools,
    onSubmit,
    onChange,
    server,
    heading,
    description,
    theme,
    density,
    display = 'card',
    mode = 'edit',
    submitLabel,
    onCancel,
    actions,
    accordionTitle,
    accordionDefaultOpen,
    wizardThreshold,
    defaults,
    className,
    style,
  } = props;

  // ─── 1. Analyze schema ───
  const analysis = useMemo(
    () =>
      analyzeSchema(schema, {
        wizardThreshold,
        availableTools: tools?.map((t) => t.name),
        title: heading || schema.title,
      }),
    [schema, wizardThreshold, tools, heading],
  );

  // ─── 2. Merge initial values with defaults ───
  const mergedInitialValues = useMemo(() => {
    const vals: Record<string, any> = {};
    // Apply schema defaults first
    for (const field of analysis.fields) {
      if (field.constraints.default !== undefined) {
        vals[field.path] = field.constraints.default;
      }
    }
    // Apply explicit defaults (filter prototype pollution keys)
    if (defaults) {
      for (const key of Object.keys(defaults)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        vals[key] = defaults[key];
      }
    }
    // Apply initial values — highest priority (filter prototype pollution keys)
    if (initialValues) {
      for (const key of Object.keys(initialValues)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        vals[key] = initialValues[key];
      }
    }
    return vals;
  }, [analysis.fields, defaults, initialValues]);

  // ─── 3. Create Zustand store (stable across re-renders) ───
  const storeRef = useRef<FormStoreApi | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createFormStore(mergedInitialValues);
  }
  const store = storeRef.current;

  // ─── 4. Resolve theme ───
  const { themePreset, themeConfig } = useMemo(
    () => resolveThemeFromProp(theme, density),
    [theme, density],
  );

  // ─── 5. Resolve branding ───
  const brand: BrandInfo = useMemo(() => resolveBrand(server), [server]);

  // ─── 6. Create validator ───
  const validator = useMemo(() => createValidator(schema), [schema]);

  // ─── 7. Submission state ───
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // ─── 8. Blur tracking (for reward-early-punish-late) ───
  const blurredRef = useRef<Set<string>>(new Set());
  const markBlurred = useCallback((path: string) => {
    blurredRef.current.add(path);
  }, []);
  const isBlurred = useCallback((path: string) => {
    return blurredRef.current.has(path);
  }, []);

  // ─── 9. Wizard state ───
  const [wizardPage, setWizardPage] = useState(0);

  // ─── 10. Apply theme to the DOM ───
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const el = formRef.current;
    if (!el) return;

    // If theme is 'auto', detect from DOM and apply
    if (!theme || theme === 'auto') {
      const detected = detectTheme();
      applyTheme(el, detected.preset);
    } else if (typeof theme === 'string' && theme !== 'default') {
      const preset = themePresets[theme];
      if (preset) applyTheme(el, preset);
    } else {
      // Apply default preset
      applyTheme(el, themePresets.default);
    }
  }, [theme]);

  // ─── 11. Progressive disclosure state ───
  const [disclosureExpanded, setDisclosureExpanded] = useState(false);

  // ─── 12. Field event handlers ───
  const handleFieldBlur = useCallback(
    (path: string) => {
      markBlurred(path);
      // Validate this field after blur
      const currentValues = store.getState().values;
      const error = validateField(validator, path, currentValues[path]);
      store.getState().setError(path, error);
    },
    [store, validator, markBlurred],
  );

  const handleFieldChange = useCallback(
    (path: string, value: any) => {
      // Validate immediately to remove errors during typing (reward early)
      const error = validateField(validator, path, value);
      if (!error) {
        // Clear error instantly when value becomes valid
        store.getState().setError(path, undefined);
      } else if (blurredRef.current.has(path) || hasSubmitted) {
        // Update error if field has been blurred or form submitted
        store.getState().setError(path, error);
      }

      // Fire onChange callback
      if (onChange) {
        onChange(store.getState().values, path);
      }
    },
    [store, validator, onChange, hasSubmitted],
  );

  // ─── 13. Form submission ───
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      setHasSubmitted(true);

      const currentValues = store.getState().values;
      const errors = validateAll(validator, currentValues);

      // Set all errors in the store
      for (const field of analysis.fields) {
        store.getState().setError(field.path, errors[field.path]);
      }

      // If there are errors, don't submit
      if (Object.keys(errors).length > 0) {
        return;
      }

      if (onSubmit) {
        setIsSubmitting(true);
        try {
          await onSubmit(currentValues);
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [store, validator, analysis.fields, onSubmit],
  );

  // Submit handler for FormFooter (which uses onClick, not form submit)
  const handleFooterSubmit = useCallback(() => {
    // Trigger form submit programmatically
    formRef.current?.requestSubmit();
  }, []);

  // ─── 14. Build context value ───
  const contextValue = useMemo<FormContextValue>(
    () => ({
      store,
      theme: themeConfig,
      themePreset,
      brand,
      mode,
      display,
      hasSubmitted,
      markBlurred,
      isBlurred,
    }),
    [store, themeConfig, themePreset, brand, mode, display, hasSubmitted, markBlurred, isBlurred],
  );

  // ─── 15. Split fields by tier (memoized) ───
  const { essentialFields, nonEssentialFields } = useMemo(() => {
    const essential: FieldDefinition[] = [];
    const nonEssential: FieldDefinition[] = [];
    for (const f of analysis.fields) {
      if (f.tier === 'essential') {
        essential.push(f);
      } else {
        nonEssential.push(f);
      }
    }
    return { essentialFields: essential, nonEssentialFields: nonEssential };
  }, [analysis.fields]);
  const nonEssentialCount = nonEssentialFields.length;

  // Compute progressive disclosure hint text
  const disclosureHint = useMemo(() => {
    const names = nonEssentialFields
      .slice(0, 3)
      .map((f) => f.label.toLowerCase());
    if (names.length === 0) return '';
    return `Add ${names.join(', ')}${nonEssentialFields.length > 3 ? ', ...' : ''}`;
  }, [nonEssentialFields]);

  // ─── 16. Effective submit label ───
  const effectiveSubmitLabel = useMemo(() => {
    if (submitLabel) return submitLabel;
    if (mode === 'approval') return 'Approve';
    if (analysis.actionLabel && analysis.actionLabel !== 'Submit') return analysis.actionLabel;
    return 'Submit';
  }, [submitLabel, mode, analysis.actionLabel]);

  // ─── 17. CSS class composition ───
  const rootCls = [
    'fw-form',
    `fw-form--${display}`,
    `fw-form--${mode}`,
    `fw-form--${themeConfig.density}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // ─── 18. Render based on display mode ───

  const renderFields = () => {
    if (display === 'wizard' && analysis.wizardPages && analysis.wizardPages.length > 0) {
      // Wizard mode: show WizardNav + current page fields
      const currentPageFields = analysis.fields.filter(
        (f) => f.wizardPage === wizardPage,
      );

      return (
        <>
          <WizardNav
            pages={analysis.wizardPages}
            currentPage={wizardPage}
            onNavigate={setWizardPage}
            onSubmit={handleFooterSubmit}
            submitLabel={effectiveSubmitLabel}
            submitDisabled={isSubmitting}
          />
          <div className="fw-form__fields">
            <GroupedFieldRenderer
              fields={currentPageFields}
              onBlur={handleFieldBlur}
              onChange={handleFieldChange}
            />
          </div>
        </>
      );
    }

    // Non-wizard modes: essential fields + progressive disclosure
    return (
      <div className="fw-form__fields">
        <GroupedFieldRenderer
          fields={essentialFields}
          onBlur={handleFieldBlur}
          onChange={handleFieldChange}
        />

        {nonEssentialCount > 0 && (
          <ProgressiveDisclosure
            hint={disclosureHint}
            label={`${nonEssentialCount} more ${nonEssentialCount === 1 ? 'field' : 'fields'}`}
            expanded={disclosureExpanded}
            onToggle={setDisclosureExpanded}
          >
            <GroupedFieldRenderer
              fields={nonEssentialFields}
              onBlur={handleFieldBlur}
              onChange={handleFieldChange}
            />
          </ProgressiveDisclosure>
        )}
      </div>
    );
  };

  const renderFooter = () => {
    // Wizard mode has its own nav buttons
    if (display === 'wizard') return null;
    // Readonly mode has no footer
    if (mode === 'readonly') return null;

    // Build approval-mode actions
    if (mode === 'approval') {
      const approvalActions = actions || [
        {
          label: 'Deny',
          variant: 'danger' as const,
          onClick: () => onCancel?.(),
          position: 'right' as const,
        },
      ];

      return (
        <FormFooter
          actions={approvalActions}
          submitLabel={effectiveSubmitLabel}
          onSubmit={handleFooterSubmit}
          onCancel={onCancel}
          submitDisabled={isSubmitting}
          submitLoading={isSubmitting}
        />
      );
    }

    return (
      <FormFooter
        actions={actions}
        submitLabel={effectiveSubmitLabel}
        onSubmit={handleFooterSubmit}
        onCancel={onCancel}
        submitDisabled={isSubmitting}
        submitLoading={isSubmitting}
      />
    );
  };

  const renderHeader = () => {
    if (display === 'inline') return null;

    const isFaviconUrl = brand.source === 'favicon' && brand.icon.startsWith('http');

    return (
      <FormHeader
        serviceName={brand.name !== 'Form' ? brand.name : undefined}
        serviceIcon={isFaviconUrl ? brand.icon : undefined}
        serviceColor={brand.color}
        actionLabel={heading || analysis.title}
        description={description}
      />
    );
  };

  const formContent = (
    <>
      {renderFields()}
      {renderFooter()}
    </>
  );

  return (
    <FormContext.Provider value={contextValue}>
      <form
        ref={formRef}
        className={rootCls}
        style={style}
        onSubmit={handleSubmit}
        noValidate
        aria-label={heading || analysis.title || 'Form'}
      >
        {/* Header for card, panel, accordion modes */}
        {(display === 'card' || display === 'panel' || display === 'accordion') &&
          renderHeader()}

        {/* Accordion wrapper */}
        {display === 'accordion' ? (
          <AccordionWrapper
            title={accordionTitle || heading || analysis.title || 'Form'}
            defaultOpen={accordionDefaultOpen}
          >
            {formContent}
          </AccordionWrapper>
        ) : (
          formContent
        )}
      </form>
    </FormContext.Provider>
  );
}
