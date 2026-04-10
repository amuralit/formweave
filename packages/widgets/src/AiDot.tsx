import { forwardRef } from 'react';

export interface AiDotProps {
  visible?: boolean;
  className?: string;
}

export const AiDot = forwardRef<HTMLSpanElement, AiDotProps>(
  function AiDot({ visible = true, className }, ref) {
    if (!visible) return null;

    const rootCls = ['fw-ai-dot', className].filter(Boolean).join(' ');

    return (
      <span
        ref={ref}
        className={rootCls}
        aria-label="AI-prefilled value"
        title="This value was prefilled by AI"
        role="img"
      />
    );
  },
);
