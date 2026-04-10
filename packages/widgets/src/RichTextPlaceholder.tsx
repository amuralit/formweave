import { forwardRef } from 'react';
import type { WidgetProps } from '@formweave/core';

/**
 * Placeholder component for rich-text editing.
 * To be replaced with a full rich-text editor integration
 * (e.g., TipTap, Slate, ProseMirror) by the consuming application.
 */
export const RichTextPlaceholder = forwardRef<HTMLDivElement, WidgetProps<string>>(
  function RichTextPlaceholder(
    { value, onChange, error, disabled, readOnly, config, className },
    ref,
  ) {
    const rootCls = [
      'fw-rich-text',
      error && 'fw-rich-text--error',
      disabled && 'fw-rich-text--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={rootCls}>
        <label className="fw-rich-text__label">{config.label}</label>
        <div
          className="fw-rich-text__editor"
          contentEditable={!disabled && !readOnly}
          suppressContentEditableWarning
          onBlur={(e) => {
            onChange(e.currentTarget.textContent ?? '');
          }}
          role="textbox"
          aria-multiline="true"
          aria-label={config.label}
          aria-invalid={!!error}
        >
          {value}
        </div>
        {error && (
          <span className="fw-rich-text__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);
