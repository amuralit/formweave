import { forwardRef, useId, useRef, useCallback } from 'react';
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
    const innerRef = useRef<HTMLInputElement>(null);
    const inputRef = (ref as React.RefObject<HTMLInputElement>) ?? innerRef;
    const maxLength = config.constraints.maxLength;

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
      },
      [onChange],
    );

    const rootCls = [
      'fw-text-input',
      error && 'fw-text-input--error',
      disabled && 'fw-text-input--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={rootCls}>
        <label htmlFor={id} className="fw-text-input__label">
          {config.label}
        </label>

        <div className="fw-text-input__field">
          {icon && <span className="fw-text-input__icon">{icon}</span>}
          <input
            ref={inputRef}
            id={id}
            type="text"
            className="fw-text-input__native"
            value={value ?? ''}
            onChange={handleChange}
            disabled={disabled}
            readOnly={readOnly}
            autoFocus={autoFocus}
            placeholder={placeholder ?? ''}
            maxLength={maxLength}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            aria-required={config.required}
          />
        </div>

        {(error || maxLength != null) && (
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
        )}
      </div>
    );
  },
);
