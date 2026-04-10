import { Form } from '@formweave/react';
import type { FormProps } from '@formweave/core';

export interface AgentFormProps extends Omit<FormProps, 'onSubmit' | 'onCancel' | 'mode'> {
  /** Current status of the agent interaction. */
  status?: 'awaiting' | 'executing' | 'complete' | 'error';
  /** Called when the user approves the form data. */
  onApprove?: (data: Record<string, any>) => void;
  /** Called when the user rejects/cancels the form. */
  onReject?: () => void;
  /** Error message to display when status is 'error'. */
  errorMessage?: string;
}

/**
 * A thin wrapper around `<Form>` from `@formweave/react` that adds AG-UI /
 * CopilotKit specific behavior.  It maps four agent lifecycle states
 * (`awaiting`, `executing`, `complete`, `error`) onto the base Form's
 * `mode`, `actions`, and `disabled` props.
 */
export function AgentForm({
  status = 'awaiting',
  onApprove,
  onReject,
  errorMessage,
  actions: externalActions,
  ...formProps
}: AgentFormProps) {
  const isDisabled = status === 'executing' || status === 'complete';

  // ── Build the action buttons based on status ──

  const resolvedActions: FormProps['actions'] = (() => {
    switch (status) {
      case 'awaiting':
        return [
          ...(externalActions ?? []),
          {
            label: 'Reject',
            variant: 'outline' as const,
            onClick: () => onReject?.(),
            position: 'left' as const,
          },
          {
            label: 'Approve',
            variant: 'primary' as const,
            onClick: (data: Record<string, any>) => onApprove?.(data),
            position: 'right' as const,
          },
        ];

      case 'error':
        return [
          {
            label: 'Try again',
            variant: 'primary' as const,
            onClick: (data: Record<string, any>) => onApprove?.(data),
            position: 'right' as const,
          },
        ];

      // executing & complete: no interactive actions
      default:
        return externalActions ?? [];
    }
  })();

  // ── Render the overlay / status chrome around the Form ──

  if (status === 'complete') {
    return (
      <div className="fw-agent-form fw-agent-form--complete">
        <div className="fw-agent-form__success">
          <svg
            className="fw-agent-form__checkmark"
            viewBox="0 0 24 24"
            width="48"
            height="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="fw-agent-form__success-text">Done</span>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="fw-agent-form fw-agent-form--error">
        {errorMessage && (
          <div className="fw-agent-form__error-banner" role="alert">
            {errorMessage}
          </div>
        )}
        <Form
          {...formProps}
          mode="approval"
          actions={resolvedActions}
        />
      </div>
    );
  }

  // status === 'awaiting' | 'executing'
  return (
    <div
      className={`fw-agent-form fw-agent-form--${status}`}
      aria-busy={status === 'executing'}
    >
      {status === 'executing' && (
        <div className="fw-agent-form__overlay">
          <div className="fw-agent-form__spinner" aria-label="Agent is working" />
          <span className="fw-agent-form__overlay-text">Agent is working...</span>
        </div>
      )}

      <Form
        {...formProps}
        mode="approval"
        actions={resolvedActions}
        // Spread a className that signals disabled styling to the underlying Form
        className={[formProps.className, isDisabled ? 'fw-agent-form__disabled' : '']
          .filter(Boolean)
          .join(' ')}
      />
    </div>
  );
}
