import {
  forwardRef,
  useId,
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import type { WidgetProps } from '@formweave/core';

export const DropdownSelect = forwardRef<HTMLDivElement, WidgetProps<string>>(
  function DropdownSelect(
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
    const options = config.constraints.enum ?? [];
    const descriptions = config.constraints.enumDescriptions ?? [];
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [highlightIdx, setHighlightIdx] = useState(-1);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const filtered = useMemo(() => {
      if (!search) return options as string[];
      const q = search.toLowerCase();
      return (options as string[]).filter((o) => o.toLowerCase().includes(q));
    }, [options, search]);

    useEffect(() => {
      setHighlightIdx(-1);
    }, [filtered]);

    const openDropdown = useCallback(() => {
      if (disabled || readOnly) return;
      setOpen(true);
      setSearch('');
      requestAnimationFrame(() => searchRef.current?.focus());
    }, [disabled, readOnly]);

    const closeDropdown = useCallback(() => {
      setOpen(false);
      setSearch('');
      triggerRef.current?.focus();
    }, []);

    const select = useCallback(
      (opt: string) => {
        onChange(opt);
        closeDropdown();
      },
      [onChange, closeDropdown],
    );

    const handleTriggerKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDropdown();
        }
      },
      [openDropdown],
    );

    const handleListKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setHighlightIdx((i) => Math.max(i - 1, 0));
            break;
          case 'Enter':
            e.preventDefault();
            if (highlightIdx >= 0 && highlightIdx < filtered.length) {
              select(filtered[highlightIdx]);
            }
            break;
          case 'Escape':
            e.preventDefault();
            closeDropdown();
            break;
          case 'Home':
            e.preventDefault();
            setHighlightIdx(0);
            break;
          case 'End':
            e.preventDefault();
            setHighlightIdx(filtered.length - 1);
            break;
        }
      },
      [filtered, highlightIdx, select, closeDropdown],
    );

    // Scroll highlighted item into view
    useEffect(() => {
      if (!open || highlightIdx < 0) return;
      const list = listRef.current;
      const item = list?.children[highlightIdx] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }, [highlightIdx, open]);

    // Close on outside click
    useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        const container = (ref as React.RefObject<HTMLDivElement>)?.current;
        if (container && !container.contains(e.target as Node)) {
          closeDropdown();
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [open, ref, closeDropdown]);

    const displayValue =
      value != null && value !== '' ? value : placeholder ?? config.label;

    const rootCls = [
      'fw-dropdown',
      open && 'fw-dropdown--open',
      error && 'fw-dropdown--error',
      disabled && 'fw-dropdown--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={rootCls}>
        <label id={`${id}-label`} className="fw-dropdown__label">
          {config.label}
        </label>

        <button
          ref={triggerRef}
          type="button"
          className="fw-dropdown__trigger"
          onClick={() => (open ? closeDropdown() : openDropdown())}
          onKeyDown={handleTriggerKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={`${id}-label`}
          autoFocus={autoFocus}
        >
          <span className="fw-dropdown__value">{displayValue}</span>
          <span className="fw-dropdown__chevron" aria-hidden="true">
            &#9662;
          </span>
        </button>

        {open && (
          <div className="fw-dropdown__overlay" onKeyDown={handleListKeyDown}>
            <input
              ref={searchRef}
              type="text"
              className="fw-dropdown__search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              aria-label="Search options"
              autoComplete="off"
            />

            <ul
              ref={listRef}
              className="fw-dropdown__list"
              role="listbox"
              aria-labelledby={`${id}-label`}
            >
              {filtered.length === 0 && (
                <li className="fw-dropdown__empty">No results</li>
              )}
              {filtered.length > 200 && (
                <li className="fw-dropdown__empty">
                  {filtered.length - 200} more — refine your search
                </li>
              )}
              {filtered.slice(0, 200).map((opt, i) => {
                const selected = opt === value;
                const highlighted = i === highlightIdx;
                return (
                  <li
                    key={opt}
                    role="option"
                    aria-selected={selected}
                    className={[
                      'fw-dropdown__option',
                      selected && 'fw-dropdown__option--selected',
                      highlighted && 'fw-dropdown__option--highlighted',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => select(opt)}
                    onMouseEnter={() => setHighlightIdx(i)}
                    title={
                      descriptions[options.indexOf(opt)] || undefined
                    }
                  >
                    {opt}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {error && (
          <span className="fw-dropdown__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);
