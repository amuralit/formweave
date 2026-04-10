import { forwardRef, useMemo } from 'react';
import type { WizardPage } from '@formweave/core';

export interface WizardNavProps {
  pages: WizardPage[];
  currentPage: number;
  onNavigate: (pageIndex: number) => void;
  onSubmit?: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
  className?: string;
}

export const WizardNav = forwardRef<HTMLDivElement, WizardNavProps>(
  function WizardNav(
    {
      pages,
      currentPage,
      onNavigate,
      onSubmit,
      submitLabel = 'Submit',
      submitDisabled,
      className,
    },
    ref,
  ) {
    const totalPages = pages.length;
    const isFirst = currentPage === 0;
    const isLast = currentPage === totalPages - 1;
    const currentLabel = pages[currentPage]?.label ?? '';

    const progressPercent = useMemo(() => {
      if (totalPages <= 1) return 100;
      return Math.round(((currentPage + 1) / totalPages) * 100);
    }, [currentPage, totalPages]);

    const rootCls = ['fw-wizard-nav', className].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={rootCls} role="navigation" aria-label="Form wizard navigation">
        {/* Step indicators */}
        <div className="fw-wizard-nav__steps" aria-hidden="true">
          {pages.map((page, i) => {
            const status =
              i < currentPage ? 'completed' : i === currentPage ? 'active' : 'upcoming';
            return (
              <div key={i} className="fw-wizard-nav__step-group">
                <button
                  type="button"
                  className={`fw-wizard-nav__step fw-wizard-nav__step--${status}`}
                  onClick={() => {
                    if (i <= currentPage) onNavigate(i);
                  }}
                  disabled={i > currentPage}
                  aria-label={`Step ${i + 1}: ${page.label}`}
                >
                  {i + 1}
                </button>
                {i < totalPages - 1 && (
                  <span
                    className={`fw-wizard-nav__connector${i < currentPage ? ' fw-wizard-nav__connector--filled' : ''}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Subtitle */}
        <div className="fw-wizard-nav__subtitle" aria-live="polite">
          Step {currentPage + 1} of {totalPages}
          {currentLabel && <> &mdash; {currentLabel}</>}
        </div>

        {/* Progress bar */}
        <div
          className="fw-wizard-nav__progress-track"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="fw-wizard-nav__progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Navigation buttons */}
        <div className="fw-wizard-nav__actions">
          <button
            type="button"
            className="fw-wizard-nav__btn fw-wizard-nav__btn--back"
            onClick={() => onNavigate(currentPage - 1)}
            disabled={isFirst}
          >
            Back
          </button>

          {isLast ? (
            <button
              type="button"
              className="fw-wizard-nav__btn fw-wizard-nav__btn--submit"
              onClick={onSubmit}
              disabled={submitDisabled}
            >
              {submitLabel}
            </button>
          ) : (
            <button
              type="button"
              className="fw-wizard-nav__btn fw-wizard-nav__btn--next"
              onClick={() => onNavigate(currentPage + 1)}
            >
              Next
            </button>
          )}
        </div>
      </div>
    );
  },
);
