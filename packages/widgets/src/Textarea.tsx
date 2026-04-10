import { forwardRef, useId, useRef, useCallback, useEffect } from 'react';
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
          placeholder={placeholder || 'Type here...'}
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
