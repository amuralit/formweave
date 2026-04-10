import { forwardRef, useId, useCallback } from 'react';
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

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
      },
      [onChange],
    );

    const rootCls = [
      'fw-title-input',
      error && 'fw-title-input--error',
      disabled && 'fw-title-input--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={rootCls}>
        <input
          ref={ref}
          id={id}
          type="text"
          className="fw-title-input__native"
          value={value ?? ''}
          onChange={handleChange}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus}
          placeholder={placeholder ?? config.label}
          aria-label={config.label}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-required={config.required}
        />

        {error && (
          <span id={`${id}-error`} className="fw-title-input__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);
