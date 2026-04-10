import { forwardRef, useId, useCallback } from 'react';
import type { WidgetProps } from '@formweave/core';

export interface NumberStepperProps extends WidgetProps<number> {
  unit?: string;
}

export const NumberStepper = forwardRef<HTMLDivElement, NumberStepperProps>(
  function NumberStepper(
    {
      value,
      onChange,
      error,
      disabled,
      readOnly,
      config,
      className,
      unit,
    },
    ref,
  ) {
    const id = useId();
    const { minimum, maximum, step = 1 } = config.constraints;
    const current = value ?? minimum ?? 0;

    const clamp = useCallback(
      (n: number) => {
        let v = n;
        if (minimum != null) v = Math.max(minimum, v);
        if (maximum != null) v = Math.min(maximum, v);
        return v;
      },
      [minimum, maximum],
    );

    const increment = useCallback(() => {
      if (disabled || readOnly) return;
      onChange(clamp(current + step));
    }, [current, step, clamp, onChange, disabled, readOnly]);

    const decrement = useCallback(() => {
      if (disabled || readOnly) return;
      onChange(clamp(current - step));
    }, [current, step, clamp, onChange, disabled, readOnly]);

    const canDecrement = minimum == null || current - step >= minimum;
    const canIncrement = maximum == null || current + step <= maximum;

    const displayUnit =
      unit ??
      (config as WidgetProps<number>['config'] & { unit?: string }).description
        ?.match(/\(([^)]+)\)/)?.[1];

    const rootCls = [
      'fw-number-stepper',
      error && 'fw-number-stepper--error',
      disabled && 'fw-number-stepper--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={rootCls} role="group" aria-labelledby={`${id}-label`}>
        <span id={`${id}-label`} className="fw-number-stepper__label">
          {config.label}
        </span>

        <div className="fw-number-stepper__controls">
          <button
            type="button"
            className="fw-number-stepper__btn fw-number-stepper__btn--dec"
            onClick={decrement}
            disabled={disabled || readOnly || !canDecrement}
            aria-label={`Decrease ${config.label}`}
          >
            &minus;
          </button>

          <span className="fw-number-stepper__value" aria-live="polite">
            {current}
            {displayUnit && (
              <span className="fw-number-stepper__unit">{displayUnit}</span>
            )}
          </span>

          <button
            type="button"
            className="fw-number-stepper__btn fw-number-stepper__btn--inc"
            onClick={increment}
            disabled={disabled || readOnly || !canIncrement}
            aria-label={`Increase ${config.label}`}
          >
            +
          </button>
        </div>

        {error && (
          <span className="fw-number-stepper__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);
