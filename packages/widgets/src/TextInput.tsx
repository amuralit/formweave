import { forwardRef, useId, useRef, useState, useCallback } from 'react';
import type { WidgetProps } from '@formweave/core';

export interface TextInputProps extends WidgetProps<string> {
  icon?: React.ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput(
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
      icon,
    },
    ref,
  ) {
    const id = useId();
    const [focused, setFocused] = useState(false);
    const innerRef = useRef<HTMLInputElement>(null);
    const inputRef = (ref as React.RefObject<HTMLInputElement>) ?? innerRef;

    const maxLength = config.constraints.maxLength;
    const hasValue = value != null && value !== '';
    const floated = focused || hasValue;

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
      },
      [onChange],
    );

    const rootCls = [
      'fw-text-input',
      focused && 'fw-text-input--focused',
      hasValue && 'fw-text-input--filled',
      error && 'fw-text-input--error',
      disabled && 'fw-text-input--disabled',
      icon && 'fw-text-input--has-icon',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={rootCls}>
        {icon && <span className="fw-text-input__icon">{icon}</span>}

        <div className="fw-text-input__field">
          <input
            ref={inputRef}
            id={id}
            type="text"
            className="fw-text-input__native"
            value={value ?? ''}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            readOnly={readOnly}
            autoFocus={autoFocus}
            placeholder={floated ? placeholder : undefined}
            maxLength={maxLength}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            aria-required={config.required}
          />

          <label
            htmlFor={id}
            className={`fw-text-input__label${floated ? ' fw-text-input__label--floated' : ''}`}
          >
            {config.label}
          </label>
        </div>

        <div className="fw-text-input__footer">
          {error && (
            <span id={`${id}-error`} className="fw-text-input__error" role="alert">
              {error}
            </span>
          )}
          {maxLength != null && (
            <span className="fw-text-input__count">
              {(value ?? '').length}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  },
);
