import { forwardRef, useId, useRef, useState, useCallback } from 'react';
import type { WidgetProps } from '@formweave/core';

export const TitleInput = forwardRef<HTMLInputElement, WidgetProps<string>>(
  function TitleInput(
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
    const innerRef = useRef<HTMLInputElement>(null);
    const inputEl = (ref as React.RefObject<HTMLInputElement>) ?? innerRef;

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
      },
      [onChange],
    );

    const focusInput = useCallback(() => {
      inputEl.current?.focus();
      // Place cursor at end of text
      const len = inputEl.current?.value.length ?? 0;
      inputEl.current?.setSelectionRange(len, len);
    }, [inputEl]);

    const rootCls = [
      'fw-title-input',
      focused && 'fw-title-input--focused',
      error && 'fw-title-input--error',
      disabled && 'fw-title-input--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={rootCls}>
        <div className="fw-title-input__wrapper" onClick={focusInput}>
          <input
            ref={inputEl}
            id={id}
            type="text"
            className="fw-title-input__native"
            value={value ?? ''}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            readOnly={readOnly}
            autoFocus={autoFocus}
            placeholder={placeholder ?? config.description ?? 'Enter title...'}
            aria-label={config.label}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            aria-required={config.required}
          />
          {!disabled && !readOnly && (
            <span
              className="fw-title-input__edit-icon"
              aria-hidden="true"
              onClick={(e) => { e.stopPropagation(); focusInput(); }}
              role="button"
              tabIndex={-1}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9.5 3.5L12.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
          )}
        </div>

        {error && (
          <span id={`${id}-error`} className="fw-title-input__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);
