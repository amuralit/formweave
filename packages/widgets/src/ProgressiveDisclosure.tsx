import { forwardRef, useId, useState, useRef, useCallback, useEffect } from 'react';

export interface ProgressiveDisclosureProps {
  hint?: string;
  label?: string;
  expanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}

export const ProgressiveDisclosure = forwardRef<HTMLDivElement, ProgressiveDisclosureProps>(
  function ProgressiveDisclosure(
    {
      hint = 'Add location, notes, or conference',
      label = 'Add details',
      expanded: controlledExpanded,
      onToggle,
      children,
      className,
    },
    ref,
  ) {
    const id = useId();
    const [internalExpanded, setInternalExpanded] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const isControlled = controlledExpanded !== undefined;
    const expanded = isControlled ? controlledExpanded : internalExpanded;

    const toggle = useCallback(() => {
      const next = !expanded;
      if (!isControlled) setInternalExpanded(next);
      onToggle?.(next);
    }, [expanded, isControlled, onToggle]);

    // Animate height
    useEffect(() => {
      const el = contentRef.current;
      if (!el) return;
      if (expanded) {
        el.style.height = '0px';
        requestAnimationFrame(() => {
          el.style.height = `${el.scrollHeight}px`;
          const handler = () => {
            el.style.height = 'auto';
          };
          el.addEventListener('transitionend', handler, { once: true });
        });
      } else {
        el.style.height = `${el.scrollHeight}px`;
        requestAnimationFrame(() => {
          el.style.height = '0px';
        });
      }
    }, [expanded]);

    const rootCls = [
      'fw-progressive',
      expanded && 'fw-progressive--expanded',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={rootCls}>
        {!expanded && (
          <button
            type="button"
            className="fw-progressive__trigger"
            onClick={toggle}
            aria-expanded={expanded}
            aria-controls={`${id}-content`}
          >
            <span className="fw-progressive__icon" aria-hidden="true">
              +
            </span>
            <span className="fw-progressive__text">
              <span className="fw-progressive__label">{label}</span>
              <span className="fw-progressive__hint">{hint}</span>
            </span>
          </button>
        )}

        {expanded && (
          <button
            type="button"
            className="fw-progressive__collapse"
            onClick={toggle}
            aria-label="Collapse details"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginRight: 6 }}>
              <path d="M9 7.5L6 4.5L3 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Less
          </button>
        )}

        <div
          id={`${id}-content`}
          ref={contentRef}
          className="fw-progressive__content"
          aria-hidden={!expanded}
        >
          {expanded && (
            <div className="fw-progressive__inner">
              {children}
            </div>
          )}
        </div>
      </div>
    );
  },
);
