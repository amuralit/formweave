import { forwardRef, useId, useRef, useState, useCallback, useEffect } from 'react';
import type { WidgetProps } from '@formweave/core';

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
    const [focused, setFocused] = useState(false);
    const innerRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) ?? innerRef;

    const maxLength = config.constraints.maxLength;
    const hasValue = value != null && value !== '';
    const floated = focused || hasValue;

    const autoGrow = useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }, [textareaRef]);

    useEffect(() => {
      autoGrow();
    }, [value, autoGrow]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        autoGrow();
      },
      [onChange, autoGrow],
    );

    const rootCls = [
      'fw-textarea',
      focused && 'fw-textarea--focused',
      hasValue && 'fw-textarea--filled',
      error && 'fw-textarea--error',
      disabled && 'fw-textarea--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={rootCls}>
        <div className="fw-textarea__field">
          <textarea
            ref={textareaRef}
            id={id}
            className="fw-textarea__native"
            value={value ?? ''}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            readOnly={readOnly}
            autoFocus={autoFocus}
            placeholder={floated ? placeholder : undefined}
            maxLength={maxLength}
            rows={2}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            aria-required={config.required}
          />

          <label
            htmlFor={id}
            className={`fw-textarea__label${floated ? ' fw-textarea__label--floated' : ''}`}
          >
            {config.label}
          </label>
        </div>

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
      </div>
    );
  },
);
