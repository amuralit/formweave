import { forwardRef, useId, useState, useCallback } from 'react';
import type { WidgetProps } from '@formweave/core';

export const ArrayListItem = forwardRef<HTMLDivElement, WidgetProps<any[]>>(
  function ArrayListItem(
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
    const [input, setInput] = useState('');
    const items = value ?? [];

    const addItem = useCallback(() => {
      const trimmed = input.trim();
      if (!trimmed || disabled || readOnly) return;
      if (config.constraints.maxItems != null && items.length >= config.constraints.maxItems) return;
      onChange([...items, trimmed]);
      setInput('');
    }, [input, items, onChange, disabled, readOnly, config.constraints.maxItems]);

    const removeItem = useCallback(
      (index: number) => {
        if (disabled || readOnly) return;
        onChange(items.filter((_, i) => i !== index));
      },
      [items, onChange, disabled, readOnly],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addItem();
        }
      },
      [addItem],
    );

    const rootCls = [
      'fw-array-list',
      error && 'fw-array-list--error',
      disabled && 'fw-array-list--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={rootCls} aria-labelledby={`${id}-label`}>
        <span id={`${id}-label`} className="fw-array-list__label">
          {config.label}
        </span>

        <ul className="fw-array-list__items" role="list">
          {items.map((item, i) => (
            <li key={`${item}-${i}`} className="fw-array-list__item">
              <span className="fw-array-list__item-text">{String(item)}</span>
              {!disabled && !readOnly && (
                <button
                  type="button"
                  className="fw-array-list__item-remove"
                  onClick={() => removeItem(i)}
                  aria-label={`Remove ${String(item)}`}
                >
                  &times;
                </button>
              )}
            </li>
          ))}
        </ul>

        {!disabled && !readOnly && (
          <div className="fw-array-list__add">
            <input
              type="text"
              className="fw-array-list__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add item..."
              disabled={disabled}
              aria-label={`Add to ${config.label}`}
            />
            <button
              type="button"
              className="fw-array-list__add-btn"
              onClick={addItem}
              disabled={!input.trim()}
            >
              + Add
            </button>
          </div>
        )}

        {error && (
          <span className="fw-array-list__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);
