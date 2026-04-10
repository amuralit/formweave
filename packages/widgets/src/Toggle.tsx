import { forwardRef, useId, useCallback } from 'react';
import type { WidgetProps } from '@formweave/core';

export const Toggle = forwardRef<HTMLButtonElement, WidgetProps<boolean>>(
  function Toggle(
    {
      value,
      onChange,
      error,
      disabled,
      readOnly,
      config,
      className,
    },
    ref,
  ) {
    const id = useId();
    const checked = !!value;

    const toggle = useCallback(() => {
      if (disabled || readOnly) return;
      onChange(!checked);
    }, [checked, onChange, disabled, readOnly]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          toggle();
        }
      },
      [toggle],
    );

    const rootCls = [
      'fw-toggle',
      checked && 'fw-toggle--on',
      error && 'fw-toggle--error',
      disabled && 'fw-toggle--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={rootCls}>
        <label htmlFor={id} className="fw-toggle__label">
          {config.label}
        </label>

        <button
          ref={ref}
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          className="fw-toggle__track"
          onClick={toggle}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-readonly={readOnly || undefined}
        >
          <span className="fw-toggle__knob" />
        </button>

        {error && (
          <span className="fw-toggle__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);
