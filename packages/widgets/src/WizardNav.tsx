import { forwardRef, useMemo } from 'react';
import type { WizardPage } from '@formweave/core';

export interface WizardNavProps {
  pages: WizardPage[];
  currentPage: number;
  onNavigate: (pageIndex: number) => void;
  onSubmit?: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
  position?: 'header' | 'footer' | 'both';
  className?: string;
}

export const WizardNav = forwardRef<HTMLDivElement, WizardNavProps>(
  function WizardNav(
    { pages, currentPage, onNavigate, onSubmit, submitLabel = 'Submit', submitDisabled, position = 'both', className },
    ref,
  ) {
    const totalPages = pages.length;
    const isFirst = currentPage === 0;
    const isLast = currentPage === totalPages - 1;

    const progressPercent = useMemo(() => {
      if (totalPages <= 1) return 100;
      return Math.round(((currentPage + 1) / totalPages) * 100);
    }, [currentPage, totalPages]);

    const rootCls = ['fw-wizard-nav', className].filter(Boolean).join(' ');
    const showHeader = position === 'header' || position === 'both';
    const showFooter = position === 'footer' || position === 'both';

    return (
      <div ref={ref} className={rootCls} role="navigation" aria-label="Form wizard">
        {showHeader && (
          <div className="fw-wizard-nav__header">
            <div className="fw-wizard-nav__steps">
              {pages.map((page, i) => {
                const status = i < currentPage ? 'completed' : i === currentPage ? 'active' : 'upcoming';
                return (
                  <div key={i} className="fw-wizard-nav__step-group">
                    <button
                      type="button"
                      className={`fw-wizard-nav__step fw-wizard-nav__step--${status}`}
                      onClick={() => { if (i <= currentPage) onNavigate(i); }}
                      disabled={i > currentPage}
                      aria-label={`Step ${i + 1}: ${page.label}`}
                    >
                      {status === 'completed' ? (
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </button>
                    {i < totalPages - 1 && (
                      <span className={`fw-wizard-nav__connector${i < currentPage ? ' fw-wizard-nav__connector--filled' : ''}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="fw-wizard-nav__progress" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
              <div className="fw-wizard-nav__progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}

        {showFooter && (
          <div className="fw-wizard-nav__footer">
            {!isFirst && (
              <button type="button" className="fw-wizard-nav__btn fw-wizard-nav__btn--back" onClick={() => onNavigate(currentPage - 1)}>
                Back
              </button>
            )}
            <div className="fw-wizard-nav__spacer" />
            {isLast ? (
              <button type="submit" className="fw-wizard-nav__btn fw-wizard-nav__btn--submit" onClick={onSubmit} disabled={submitDisabled}>
                {submitLabel}
              </button>
            ) : (
              <button type="button" className="fw-wizard-nav__btn fw-wizard-nav__btn--next" onClick={() => onNavigate(currentPage + 1)}>
                Next
              </button>
            )}
          </div>
        )}
      </div>
    );
  },
);
