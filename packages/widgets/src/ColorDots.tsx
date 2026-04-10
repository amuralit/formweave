import { forwardRef, useId, useRef, useCallback } from 'react';
import type { WidgetProps } from '@formweave/core';

export const ColorDots = forwardRef<HTMLDivElement, WidgetProps<string>>(
  function ColorDots(
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
    const options = (config.constraints.enum ?? []) as string[];
    const descriptions = config.constraints.enumDescriptions ?? [];
    const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent, index: number) => {
        let next: number | null = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          next = (index + 1) % options.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          next = (index - 1 + options.length) % options.length;
        }
        if (next != null) {
          dotRefs.current[next]?.focus();
          if (!disabled && !readOnly) {
            onChange(options[next]);
          }
        }
      },
      [options, onChange, disabled, readOnly],
    );

    const rootCls = [
      'fw-color-dots',
      error && 'fw-color-dots--error',
      disabled && 'fw-color-dots--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={rootCls}>
        <span id={`${id}-label`} className="fw-color-dots__label">
          {config.label}
        </span>

        <div
          className="fw-color-dots__row"
          role="radiogroup"
          aria-labelledby={`${id}-label`}
        >
          {options.map((color, i) => {
            const active = value === color;
            return (
              <button
                key={color}
                ref={(el) => {
                  dotRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={descriptions[i] || color}
                tabIndex={active || (value == null && i === 0) ? 0 : -1}
                className={`fw-color-dots__dot${active ? ' fw-color-dots__dot--active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => {
                  if (!disabled && !readOnly) onChange(color);
                }}
                onKeyDown={(e) => handleKeyDown(e, i)}
                disabled={disabled}
              >
                {active && (
                  <span className="fw-color-dots__check" aria-hidden="true">
                    &#10003;
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <span className="fw-color-dots__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);
