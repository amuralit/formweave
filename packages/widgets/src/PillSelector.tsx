import { forwardRef, useId, useRef, useCallback } from 'react';
import type { WidgetProps } from '@formweave/core';

export const PillSelector = forwardRef<HTMLDivElement, WidgetProps<string>>(
  function PillSelector(
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
    const options = config.constraints.enum ?? [];
    const descriptions = config.constraints.enumDescriptions ?? [];
    const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent, index: number) => {
        let next: number | null = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          next = (index + 1) % options.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          next = (index - 1 + options.length) % options.length;
        } else if (e.key === 'Home') {
          e.preventDefault();
          next = 0;
        } else if (e.key === 'End') {
          e.preventDefault();
          next = options.length - 1;
        }

        if (next != null) {
          pillRefs.current[next]?.focus();
          if (!disabled && !readOnly) {
            onChange(options[next]);
          }
        }
      },
      [options, onChange, disabled, readOnly],
    );

    const rootCls = [
      'fw-pill-selector',
      error && 'fw-pill-selector--error',
      disabled && 'fw-pill-selector--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={rootCls}>
        <span id={`${id}-label`} className="fw-pill-selector__label">
          {config.label}
        </span>

        <div
          className="fw-pill-selector__pills"
          role="radiogroup"
          aria-labelledby={`${id}-label`}
        >
          {options.map((opt: string, i: number) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                ref={(el) => {
                  pillRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active || (value == null && i === 0) ? 0 : -1}
                className={`fw-pill-selector__pill${active ? ' fw-pill-selector__pill--active' : ''}`}
                onClick={() => {
                  if (!disabled && !readOnly) onChange(opt);
                }}
                onKeyDown={(e) => handleKeyDown(e, i)}
                disabled={disabled}
                title={descriptions[i] || undefined}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            );
          })}
        </div>

        {error && (
          <span className="fw-pill-selector__error" role="alert" style={{ color: '#ef4444' }}>
            {error}
          </span>
        )}
      </div>
    );
  },
);
