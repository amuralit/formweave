import { forwardRef } from 'react';

export interface FormHeaderProps {
  serviceName?: string;
  serviceIcon?: string;
  serviceSvg?: string;
  serviceEmoji?: string;
  serviceColor?: string;
  actionLabel?: string;
  description?: string;
  className?: string;
}

const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)|[a-zA-Z]{1,30})$/;

export const FormHeader = forwardRef<HTMLDivElement, FormHeaderProps>(
  function FormHeader(
    {
      serviceName,
      serviceIcon,
      serviceSvg,
      serviceEmoji,
      serviceColor,
      actionLabel,
      description,
      className,
    },
    ref,
  ) {
    const rootCls = ['fw-form-header', className].filter(Boolean).join(' ');
    // Sanitize color to prevent CSS injection
    const safeColor = serviceColor && COLOR_RE.test(serviceColor) ? serviceColor : undefined;

    return (
      <div ref={ref} className={rootCls}>
        {/* Accent gradient bar */}
        <div
          className="fw-form-header__accent"
          style={
            safeColor
              ? { background: safeColor }
              : undefined
          }
        />

        <div className="fw-form-header__body">
          {/* Service badge */}
          {(serviceIcon || serviceSvg || serviceEmoji || serviceName) && (
            <div className="fw-form-header__service">
              {serviceIcon ? (
                <img
                  src={serviceIcon}
                  alt=""
                  className="fw-form-header__service-icon"
                  aria-hidden="true"
                />
              ) : serviceSvg ? (
                <svg
                  className="fw-form-header__service-icon"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: serviceSvg }}
                />
              ) : serviceEmoji ? (
                <span className="fw-form-header__service-emoji" aria-hidden="true">
                  {serviceEmoji}
                </span>
              ) : null}
              {serviceName && (
                <span className="fw-form-header__service-name">
                  {serviceName}
                </span>
              )}
            </div>
          )}

          {/* Action heading */}
          {actionLabel && (
            <h2 className="fw-form-header__heading">{actionLabel}</h2>
          )}

          {/* Description */}
          {description && (
            <p className="fw-form-header__description">{description}</p>
          )}
        </div>
      </div>
    );
  },
);
