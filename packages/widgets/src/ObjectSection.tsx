import { forwardRef, useId, useState, useCallback } from 'react';
import type { WidgetProps } from '@formweave/core';

export interface ObjectSectionProps extends WidgetProps<Record<string, any>> {
  children?: React.ReactNode;
}

export const ObjectSection = forwardRef<HTMLDivElement, ObjectSectionProps>(
  function ObjectSection(
    {
      error,
      disabled,
      config,
      className,
      children,
    },
    ref,
  ) {
    const id = useId();
    const [expanded, setExpanded] = useState(true);

    const toggle = useCallback(() => {
      setExpanded((prev) => !prev);
    }, []);

    const rootCls = [
      'fw-object-section',
      expanded && 'fw-object-section--expanded',
      error && 'fw-object-section--error',
      disabled && 'fw-object-section--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={rootCls} role="group" aria-labelledby={`${id}-heading`}>
        <button
          type="button"
          className="fw-object-section__header"
          id={`${id}-heading`}
          onClick={toggle}
          aria-expanded={expanded}
          aria-controls={`${id}-content`}
        >
          <span
            className={`fw-object-section__chevron${expanded ? ' fw-object-section__chevron--open' : ''}`}
            aria-hidden="true"
          >
            &#9656;
          </span>
          <span className="fw-object-section__title">{config.label}</span>
          {config.description && (
            <span className="fw-object-section__desc">{config.description}</span>
          )}
        </button>

        <div
          id={`${id}-content`}
          className="fw-object-section__body"
          role="region"
          aria-labelledby={`${id}-heading`}
          hidden={!expanded}
        >
          {children}
        </div>

        {error && (
          <span className="fw-object-section__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);
