import { forwardRef, useId, useCallback, useState, useRef } from 'react';
import type { WidgetProps } from '@formweave/core';

export const NumberStepper = forwardRef<HTMLDivElement, WidgetProps<number>>(
  function NumberStepper(
    { value, onChange, error, disabled, readOnly, config, className },
    ref,
  ) {
    const id = useId();
    const { minimum, maximum, step = 1 } = config.constraints;
    const current = value ?? minimum ?? 0;
    const [focused, setFocused] = useState(false);
    const [localValue, setLocalValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const clamp = useCallback(
      (n: number) => {
        let v = n;
        if (minimum != null) v = Math.max(minimum, v);
        if (maximum != null) v = Math.min(maximum, v);
        return v;
      },
      [minimum, maximum],
    );

    const handleFocus = useCallback(() => {
      setFocused(true);
      setLocalValue(String(current));
    }, [current]);

    const handleBlur = useCallback(() => {
      setFocused(false);
      const parsed = Number(localValue);
      if (!isNaN(parsed)) {
        onChange(clamp(parsed));
      }
    }, [localValue, clamp, onChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onChange(clamp(current + step));
        setLocalValue(String(clamp(current + step)));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onChange(clamp(current - step));
        setLocalValue(String(clamp(current - step)));
      } else if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur();
      }
    }, [current, step, clamp, onChange]);

    const formatted = current.toLocaleString();

    const rootCls = [
      'fw-number-stepper',
      focused && 'fw-number-stepper--focused',
      error && 'fw-number-stepper--error',
      disabled && 'fw-number-stepper--disabled',
      className,
    ].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={rootCls}>
        <label htmlFor={id} className="fw-number-stepper__label">
          {config.label}
        </label>

        <div className="fw-number-stepper__field" onClick={() => !focused && handleFocus()} style={error ? { borderColor: '#ef4444' } : undefined}>
          {focused ? (
            <input
              ref={inputRef}
              id={id}
              type="number"
              className="fw-number-stepper__input"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              min={minimum}
              max={maximum}
              step={step}
              disabled={disabled}
              readOnly={readOnly}
              aria-invalid={!!error}
              autoFocus
            />
          ) : (
            <span className="fw-number-stepper__display">
              {formatted}
            </span>
          )}
        </div>

        {focused && !error && (
          <span className="fw-number-stepper__hint" aria-hidden="true">
            Use &uarr;&darr; arrow keys
          </span>
        )}

        {error && (
          <span className="fw-number-stepper__error" role="alert" style={{ color: '#ef4444' }}>{error}</span>
        )}
      </div>
    );
  },
);
