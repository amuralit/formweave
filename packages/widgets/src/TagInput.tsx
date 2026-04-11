import {
  forwardRef,
  useId,
  useRef,
  useState,
  useCallback,
} from 'react';
import type { WidgetProps } from '@formweave/core';

export const TagInput = forwardRef<HTMLDivElement, WidgetProps<string[]>>(
  function TagInput(
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
    const [input, setInput] = useState('');
    const [removingIdx, setRemovingIdx] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const tags = Array.isArray(value) ? value : value ? [value] : [];

    const addTag = useCallback(
      (tag: string) => {
        const trimmed = tag.trim();
        if (!trimmed || disabled || readOnly) return;
        if (config.constraints.uniqueItems && tags.includes(trimmed)) return;
        if (config.constraints.maxItems != null && tags.length >= config.constraints.maxItems) return;
        onChange([...tags, trimmed]);
        setInput('');
      },
      [tags, onChange, disabled, readOnly, config.constraints],
    );

    const removeTag = useCallback(
      (index: number) => {
        if (disabled || readOnly) return;
        setRemovingIdx(index);
        setTimeout(() => {
          onChange(tags.filter((_, i) => i !== index));
          setRemovingIdx(null);
        }, 120);
      },
      [tags, onChange, disabled, readOnly],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addTag(input);
        } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
          removeTag(tags.length - 1);
        }
      },
      [input, tags, addTag, removeTag],
    );

    const rootCls = [
      'fw-tag-input',
      error && 'fw-tag-input--error',
      disabled && 'fw-tag-input--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={rootCls}>
        <label id={`${id}-label`} className="fw-tag-input__label">
          {config.label}
          {tags.length > 0 && (
            <span className="fw-tag-input__count" aria-label={`${tags.length} ${tags.length === 1 ? 'tag' : 'tags'}`}>
              {tags.length}
            </span>
          )}
        </label>

        <div
          className="fw-tag-input__container"
          onClick={() => inputRef.current?.focus()}
          aria-labelledby={`${id}-label`}
        >
          {tags.map((tag, i) => {
            const removing = removingIdx === i;
            return (
              <span
                key={`${tag}-${i}`}
                className={`fw-tag-input__chip${removing ? ' fw-tag-input__chip--removing' : ''}`}
              >
                <span className="fw-tag-input__chip-text">{tag}</span>
                {!disabled && !readOnly && (
                  <button
                    type="button"
                    className="fw-tag-input__chip-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(i);
                    }}
                    aria-label={`Remove ${tag}`}
                  >
                    &times;
                  </button>
                )}
              </span>
            );
          })}

          <input
            ref={inputRef}
            type="text"
            className="fw-tag-input__native"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            readOnly={readOnly}
            autoFocus={autoFocus}
            placeholder={tags.length === 0 ? (placeholder ?? 'Type and press Enter') : ''}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        </div>

        {error && (
          <span id={`${id}-error`} className="fw-tag-input__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);
