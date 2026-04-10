import { forwardRef, useId } from 'react';
import type { WidgetProps } from '@formweave/core';

/**
 * Placeholder component for code editing.
 * To be replaced with a full code editor integration
 * (e.g., CodeMirror, Monaco) by the consuming application.
 */
export const CodeEditorPlaceholder = forwardRef<HTMLDivElement, WidgetProps<string>>(
  function CodeEditorPlaceholder(
    { value, onChange, error, disabled, readOnly, config, className },
    ref,
  ) {
    const id = useId();
    const rootCls = [
      'fw-code-editor',
      error && 'fw-code-editor--error',
      disabled && 'fw-code-editor--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={rootCls}>
        <label htmlFor={id} className="fw-code-editor__label">
          {config.label}
        </label>
        <textarea
          id={id}
          className="fw-code-editor__textarea"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          readOnly={readOnly}
          spellCheck={false}
          aria-invalid={!!error}
        />
        {error && (
          <span className="fw-code-editor__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);
