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
  FormMode,
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
  const { mode, isBlurred, hasSubmitted, onToolCall, store } = useFormContext();

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

  // Populate sibling fields when a tool suggestion has structured data
  const handleFieldsPopulate = useCallback((fields: Record<string, any>) => {
    const state = store.getState();
    for (const [key, val] of Object.entries(fields)) {
      if (key !== field.path) {
        state.setValue(key, val);
      }
    }
  }, [store, field.path]);

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

  const isTitleInput = field.widget === 'title-input';

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
          placeholder={isTitleInput ? (field.description || 'Enter title...') : undefined}
          onToolCall={onToolCall}
          onFieldsPopulate={handleFieldsPopulate}
        />
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

function DateTimePairRenderer({
  groupFields,
  onBlur,
  onChange,
}: {
  groupFields: FieldDefinition[];
  onBlur: (path: string) => void;
  onChange: (path: string, value: any) => void;
}) {
  const startField = groupFields[0];
  const endField = groupFields[1];

  const startState = useFormField(startField.path);
  const endState = useFormField(endField.path);
  const { mode } = useFormContext();

  const isDisabled = mode === 'readonly';
  const isReadOnly = mode === 'readonly';

  // Build a merged config for the paired DateTimeBlock
  const mergedConfig = useMemo(
    () => ({
      ...startField,
      group: 'datetime' as const,
      label: startField.groupLabel || 'Date & time',
    }),
    [startField],
  );

  // Combine start + end into a single DateTimeValue object
  const pairedValue = useMemo(
    () => ({
      start: startState.value ?? '',
      end: endState.value ?? '',
    }),
    [startState.value, endState.value],
  );

  const handlePairedChange = useCallback(
    (newValue: any) => {
      if (typeof newValue === 'object' && newValue !== null) {
        if (newValue.start !== undefined) {
          startState.setValue(newValue.start);
          onChange(startField.path, newValue.start);
        }
        if (newValue.end !== undefined) {
          endState.setValue(newValue.end);
          onChange(endField.path, newValue.end);
        }
      }
    },
    [startState, endState, onChange, startField.path, endField.path],
  );

  const handleBlur = useCallback(() => {
    onBlur(startField.path);
    onBlur(endField.path);
  }, [onBlur, startField.path, endField.path]);

  return (
    <div className="fw-field fw-field--datetime-block" onBlur={handleBlur}>
      <WidgetRenderer
        value={pairedValue}
        onChange={handlePairedChange}
        disabled={isDisabled}
        readOnly={isReadOnly}
        config={mergedConfig}
      />
    </div>
  );
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

      // Datetime pairs: render a single merged DateTimeBlock
      const groupType = groupFields[0]?.group;
      if (groupType?.startsWith('datetime-pair') && groupFields.length === 2) {
        elements.push(
          <DateTimePairRenderer
            key={`group-${field.group}`}
            groupFields={groupFields}
            onBlur={onBlur}
            onChange={onChange}
          />,
        );
      } else {
        elements.push(
          <div
            key={`group-${field.group}`}
            className="fw-field-group"
            role="group"
            aria-label={field.groupLabel}
          >
            {field.groupLabel && !field.group?.startsWith('datetime') && (
              <span className="fw-field-group__label">{field.groupLabel}</span>
            )}
            <div className="fw-field-group__fields">
              {groupFields.map((gf) => (
                <FieldRenderer key={gf.path} field={gf} onBlur={onBlur} onChange={onChange} />
              ))}
            </div>
          </div>,
        );
      }
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
  mode?: FormMode;
  onQuickApprove?: () => void;
  onQuickDeny?: () => void;
  children: React.ReactNode;
}

function AccordionWrapper({ title, defaultOpen, mode, onQuickApprove, onQuickDeny, children }: AccordionWrapperProps) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const isApproval = mode === 'approval';
  const bodyRef = useRef<HTMLDivElement>(null);

  // Animate height on toggle
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (open) {
      el.style.height = '0px';
      el.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        el.style.transition = 'height 0.25s ease';
        el.style.height = `${el.scrollHeight}px`;
        const handler = () => {
          el.style.height = 'auto';
          el.style.overflow = '';
          el.style.transition = '';
        };
        el.addEventListener('transitionend', handler, { once: true });
      });
    } else {
      el.style.height = `${el.scrollHeight}px`;
      el.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        el.style.transition = 'height 0.25s ease';
        el.style.height = '0px';
      });
    }
  }, [open]);

  return (
    <div className={`fw-accordion ${open ? 'fw-accordion--open' : ''}`}>
      <div className="fw-accordion__header-row" onClick={() => setOpen(!open)}>
        <span className="fw-accordion__title">{title}</span>
        {isApproval && !open && (
          <div className="fw-accordion__quick-actions" onClick={(e) => e.stopPropagation()}>
            {onQuickDeny && (
              <button type="button" className="fw-accordion__quick-btn fw-accordion__quick-btn--deny" onClick={onQuickDeny}>
                Deny
              </button>
            )}
            {onQuickApprove && (
              <button type="button" className="fw-accordion__quick-btn fw-accordion__quick-btn--approve" onClick={onQuickApprove}>
                Approve
              </button>
            )}
          </div>
        )}
        <span className="fw-accordion__chevron" aria-hidden="true">
          {open ? '\u25B2' : '\u25BC'}
        </span>
      </div>
      <div ref={bodyRef} className="fw-accordion__body">
        {children}
      </div>
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

  // ─── 3b. Sync values prop to store (only for untouched fields) ───
  useEffect(() => {
    if (!storeRef.current) return;
    const state = storeRef.current.getState();
    const updates: Record<string, any> = {};
    let hasUpdates = false;

    for (const [key, val] of Object.entries(mergedInitialValues)) {
      if (!state.touched[key] && state.values[key] !== val) {
        updates[key] = val;
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      state.setValues({ ...state.values, ...updates });
      const aiPaths = Object.keys(updates);
      state.markAiPrefilled(aiPaths);
    }
  }, [mergedInitialValues]);

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

      // If there are errors, scroll to and focus the first error field
      if (Object.keys(errors).length > 0) {
        const firstErrorPath = analysis.fields.find((f) => errors[f.path])?.path;
        if (firstErrorPath && formRef.current) {
          const errorEl = formRef.current.querySelector(
            `[class*="fw-field--has-error"], [aria-invalid="true"]`
          ) as HTMLElement | null;
          if (errorEl) {
            errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            requestAnimationFrame(() => {
              const focusable = errorEl.querySelector<HTMLElement>(
                'input, textarea, select, button, [tabindex]'
              );
              focusable?.focus();
            });
          }
        }
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
  // Get onToolCall from props
  const { onToolCall } = props;

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
      onToolCall,
    }),
    [store, themeConfig, themePreset, brand, mode, display, hasSubmitted, markBlurred, isBlurred, onToolCall],
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
    return `${names.join(', ')}${nonEssentialFields.length > 3 ? ', ...' : ''}`;
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
            position="header"
          />
          <div className="fw-form__fields">
            <GroupedFieldRenderer
              fields={currentPageFields}
              onBlur={handleFieldBlur}
              onChange={handleFieldChange}
            />
          </div>
          <WizardNav
            pages={analysis.wizardPages}
            currentPage={wizardPage}
            onNavigate={setWizardPage}
            onSubmit={handleFooterSubmit}
            submitLabel={effectiveSubmitLabel}
            submitDisabled={isSubmitting}
            position="footer"
          />
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
            hint=""
            label={`+ ${nonEssentialCount} more`}
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
      if (actions) {
        return (
          <FormFooter
            actions={actions}
            submitDisabled={isSubmitting}
            submitLoading={isSubmitting}
          />
        );
      }

      return (
        <FormFooter
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
    // Pass favicon URLs as serviceIcon, SVG paths as serviceSvg, emojis as serviceEmoji
    const serviceIcon = isFaviconUrl ? brand.icon : undefined;
    const serviceSvg = !isFaviconUrl && brand.svg ? brand.svg : undefined;
    const serviceEmoji = !isFaviconUrl && !brand.svg && brand.icon ? brand.icon : undefined;

    const effectiveHeading =
      heading ||
      analysis.title ||
      (analysis.actionLabel && analysis.actionLabel !== 'Submit'
        ? analysis.actionLabel
        : 'Form');

    return (
      <FormHeader
        serviceName={brand.name !== 'Form' ? brand.name : undefined}
        serviceIcon={serviceIcon}
        serviceSvg={serviceSvg}
        serviceEmoji={serviceEmoji}
        serviceColor={brand.color}
        actionLabel={effectiveHeading}
        description={description}
      />
    );
  };

  // ─── Compact display mode ───
  if (display === 'compact') {
    const isFaviconUrl = brand.source === 'favicon' && brand.icon.startsWith('http');
    const compactSvg = !isFaviconUrl && brand.svg ? brand.svg : undefined;
    const compactIcon = isFaviconUrl ? brand.icon : undefined;
    const compactEmoji = !isFaviconUrl && !brand.svg && brand.icon ? brand.icon : undefined;
    const summaryText = `${server?.name ?? 'Form'} ${heading || 'action completed'}`;

    return (
      <FormContext.Provider value={contextValue}>
        <div className={rootCls} style={style} aria-label={summaryText}>
          <div className="fw-compact">
            {compactIcon ? (
              <img src={compactIcon} alt="" className="fw-compact__icon" aria-hidden="true" />
            ) : compactSvg ? (
              <svg className="fw-compact__icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" dangerouslySetInnerHTML={{ __html: compactSvg }} />
            ) : compactEmoji ? (
              <span className="fw-compact__icon" aria-hidden="true">{compactEmoji}</span>
            ) : null}
            <span className="fw-compact__text">{summaryText}</span>
            {onSubmit && (
              <button type="button" className="fw-compact__action" onClick={() => onSubmit({})}>
                View
              </button>
            )}
          </div>
        </div>
      </FormContext.Provider>
    );
  }

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
        data-formweave=""
      >
        {/* Header for card and panel modes (accordion has its own title) */}
        {(display === 'card' || display === 'panel') &&
          renderHeader()}

        {/* Accordion wrapper */}
        {display === 'accordion' ? (
          <AccordionWrapper
            title={accordionTitle || heading || analysis.title || 'Form'}
            defaultOpen={accordionDefaultOpen}
            mode={mode}
            onQuickApprove={onSubmit ? handleFooterSubmit : undefined}
            onQuickDeny={onCancel}
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
