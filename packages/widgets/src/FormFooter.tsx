import { forwardRef } from 'react';
import type { ActionConfig } from '@formweave/core';

export interface FormFooterProps {
  actions?: ActionConfig[];
  submitLabel?: string;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitDisabled?: boolean;
  submitLoading?: boolean;
  className?: string;
}

export const FormFooter = forwardRef<HTMLElement, FormFooterProps>(
  function FormFooter(
    {
      actions,
      submitLabel = 'Submit',
      onSubmit,
      onCancel,
      submitDisabled,
      submitLoading,
      className,
    },
    ref,
  ) {
    const rootCls = ['fw-form-footer', className].filter(Boolean).join(' ');

    // If custom actions provided, render those
    if (actions && actions.length > 0) {
      const leftActions = actions.filter((a) => a.position === 'left');
      const rightActions = actions.filter((a) => a.position !== 'left');

      return (
        <footer ref={ref} className={rootCls} role="contentinfo">
          <div className="fw-form-footer__left">
            {leftActions.map((action, i) => (
              <button
                key={i}
                type="button"
                className={`fw-form-footer__btn fw-form-footer__btn--${action.variant}`}
                onClick={() => action.onClick({})}
                disabled={action.disabled || action.loading}
              >
                {action.loading && <span className="fw-form-footer__spinner" aria-hidden="true" />}
                {action.label}
              </button>
            ))}
          </div>
          <div className="fw-form-footer__right">
            {rightActions.map((action, i) => (
              <button
                key={i}
                type="button"
                className={`fw-form-footer__btn fw-form-footer__btn--${action.variant}`}
                onClick={() => action.onClick({})}
                disabled={action.disabled || action.loading}
              >
                {action.loading && <span className="fw-form-footer__spinner" aria-hidden="true" />}
                {action.label}
              </button>
            ))}
          </div>
        </footer>
      );
    }

    // Default: Cancel + Submit
    return (
      <footer ref={ref} className={rootCls} role="contentinfo">
        <div className="fw-form-footer__left" />
        <div className="fw-form-footer__right">
          {onCancel && (
            <button
              type="button"
              className="fw-form-footer__btn fw-form-footer__btn--outline"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          {onSubmit && (
            <button
              type="submit"
              className="fw-form-footer__btn fw-form-footer__btn--primary"
              onClick={onSubmit}
              disabled={submitDisabled || submitLoading}
            >
              {submitLoading && (
                <span className="fw-form-footer__spinner" aria-hidden="true" />
              )}
              {submitLabel}
            </button>
          )}
        </div>
      </footer>
    );
  },
);
