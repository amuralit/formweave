import { forwardRef, useId, useRef, useCallback, useEffect } from 'react';
import type { WidgetProps, FieldDefinition } from '@formweave/core';

function getContextualPlaceholder(config: FieldDefinition): string {
  const name = config.path.toLowerCase();
  const format = config.constraints.format;

  if (format === 'email') return 'name@company.com';
  if (format === 'uri' || format === 'url') return 'https://';
  if (/^(phone|tel|mobile)/.test(name)) return '(555) 000-0000';
  if (/^(street|address)/.test(name)) return 'Search for an address...';
  if (/^(city)/.test(name)) return 'City name';
  if (/^(state|province|region)/.test(name)) return 'State or province';
  if (/^(zip|postal|postcode)/.test(name)) return '00000';
  if (/^(name|full_name)/.test(name)) return 'Full name';
  if (/^(company|org)/.test(name)) return 'Company name';
  if (/^(description|body|content|notes)/.test(name)) return 'Add a description...';
  if (/^(title|summary|subject|heading)/.test(name)) return 'Give it a title...';
  if (/^(location|venue|place)/.test(name)) return 'Conference room or virtual link';
  if (/^(channel)/.test(name)) return '#channel-name';
  if (/^(project)/.test(name)) return 'Project name';
  if (/^(repo|repository)/.test(name)) return 'owner/repository';
  return config.description || '';
}

export const Textarea = forwardRef<HTMLTextAreaElement, WidgetProps<string>>(
  function Textarea(
    {
      value,
      onChange,
      error,
      disabled,
      readOnly,
      config,
      autoFocus,
      placeholder,
      className,
    },
    ref,
  ) {
    const id = useId();
    const innerRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) ?? innerRef;
    const maxLength = config.constraints.maxLength;

    const autoGrow = useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;
      requestAnimationFrame(() => {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      });
    }, [textareaRef]);

    useEffect(() => { autoGrow(); }, [value, autoGrow]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        autoGrow();
      },
      [onChange, autoGrow],
    );

    const rootCls = [
      'fw-textarea',
      error && 'fw-textarea--error',
      disabled && 'fw-textarea--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={rootCls}>
        <label htmlFor={id} className="fw-textarea__label">
          {config.label}
        </label>

        <textarea
          ref={textareaRef}
          id={id}
          className="fw-textarea__native"
          value={value ?? ''}
          onChange={handleChange}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus}
          placeholder={placeholder || getContextualPlaceholder(config)}
          maxLength={maxLength}
          rows={3}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-required={config.required}
        />

        {(error || maxLength != null) && (
          <div className="fw-textarea__footer">
            {error && (
              <span id={`${id}-error`} className="fw-textarea__error" role="alert">
                {error}
              </span>
            )}
            {maxLength != null && (
              <span className="fw-textarea__count">
                {(value ?? '').length}/{maxLength}
              </span>
            )}
          </div>
        )}
      </div>
    );
  },
);
