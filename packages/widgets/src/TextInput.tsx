import { forwardRef, useId, useRef, useCallback, useState, useEffect } from 'react';
import type { WidgetProps } from '@formweave/core';

export interface TextInputProps extends WidgetProps<string> {
  icon?: React.ReactNode;
  onToolCall?: (toolName: string, args: Record<string, any>) => Promise<any>;
}

/** Map field names to HTML autocomplete tokens for browser-native autofill */
const AUTOCOMPLETE_MAP: Record<string, string> = {
  name: 'name', full_name: 'name', fullname: 'name',
  first_name: 'given-name', firstname: 'given-name',
  last_name: 'family-name', lastname: 'family-name',
  email: 'email', customer_email: 'email',
  phone: 'tel', telephone: 'tel', mobile: 'tel',
  street: 'street-address', street_address: 'street-address', address: 'street-address',
  apartment: 'address-line2', apt: 'address-line2', suite: 'address-line2', unit: 'address-line2',
  city: 'address-level2',
  state: 'address-level1', province: 'address-level1', region: 'address-level1',
  zip: 'postal-code', zipcode: 'postal-code', postal_code: 'postal-code', postcode: 'postal-code',
  country: 'country-name',
  company: 'organization', organization: 'organization', org: 'organization',
};

function getAutoComplete(fieldName: string): string | undefined {
  const lower = fieldName.toLowerCase().replace(/[-\s]/g, '_');
  return AUTOCOMPLETE_MAP[lower];
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput(
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
      icon,
      onToolCall,
    },
    ref,
  ) {
    const id = useId();
    const innerRef = useRef<HTMLInputElement>(null);
    const inputRef = (ref as React.RefObject<HTMLInputElement>) ?? innerRef;
    const maxLength = config.constraints.maxLength;
    const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string }>>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    const hasToolMatch = !!config.toolMatch;
    const autoCompleteAttr = hasToolMatch ? 'off' : getAutoComplete(config.path);
    const isPhone = /^(phone|telephone|mobile|tel|cell)$/i.test(config.path);
    const inputType = config.constraints.format === 'email' ? 'email' : isPhone ? 'tel' : 'text';

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onChange(val);

        // Tool-aware autocomplete
        if (hasToolMatch && onToolCall && val.length >= 2) {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(async () => {
            try {
              const results = await onToolCall(config.toolMatch!.toolName, { query: val });
              if (Array.isArray(results)) {
                setSuggestions(results.slice(0, 6));
                setShowSuggestions(true);
              }
            } catch {
              // Tool call failed silently — degrade to plain input
            }
          }, 250);
        } else {
          setShowSuggestions(false);
        }
      },
      [onChange, hasToolMatch, onToolCall, config.toolMatch],
    );

    const selectSuggestion = useCallback((suggestion: { id: string; name: string }) => {
      onChange(suggestion.name);
      setShowSuggestions(false);
      setSuggestions([]);
    }, [onChange]);

    // Cleanup debounce
    useEffect(() => () => clearTimeout(debounceRef.current), []);

    const rootCls = [
      'fw-text-input',
      hasToolMatch && 'fw-text-input--tool-enhanced',
      error && 'fw-text-input--error',
      disabled && 'fw-text-input--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={rootCls}>
        <label htmlFor={id} className="fw-text-input__label">
          {config.label}
          {hasToolMatch && (
            <span className="fw-text-input__tool-badge" aria-label={`Enhanced by ${config.toolMatch!.toolName}`}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1"/>
                <path d="M3 5.5L4.5 7L7 3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          )}
        </label>

        <div className="fw-text-input__field">
          {icon && <span className="fw-text-input__icon">{icon}</span>}
          <input
            ref={inputRef}
            id={id}
            type={inputType}
            className="fw-text-input__native"
            value={value ?? ''}
            onChange={handleChange}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            disabled={disabled}
            readOnly={readOnly}
            autoFocus={autoFocus}
            placeholder={placeholder || 'Type here...'}
            maxLength={maxLength}
            autoComplete={autoCompleteAttr}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            aria-required={config.required}
            aria-autocomplete={hasToolMatch ? 'list' : undefined}
          />

          {/* Tool-powered suggestion dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="fw-text-input__suggestions">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="fw-text-input__suggestion"
                  onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {(error || maxLength != null) && (
          <div className="fw-text-input__footer">
            {error && (
              <span id={`${id}-error`} className="fw-text-input__error" role="alert">
                {error}
              </span>
            )}
            {maxLength != null && (
              <span className="fw-text-input__count">
                {(value ?? '').length}/{maxLength}
              </span>
            )}
          </div>
        )}
      </div>
    );
  },
);
