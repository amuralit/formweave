import { forwardRef, useId, useRef, useCallback, useState, useEffect } from 'react';
import type { WidgetProps, FieldDefinition } from '@formweave/core';

export interface TextInputProps extends WidgetProps<string> {
  icon?: React.ReactNode;
  onToolCall?: (toolName: string, args: Record<string, any>) => Promise<any>;
  /** Called when a tool suggestion contains structured fields to populate siblings */
  onFieldsPopulate?: (fields: Record<string, any>) => void;
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

function getContextualPlaceholder(config: FieldDefinition): string {
  const name = config.path.toLowerCase();
  const format = config.constraints.format;

  if (format === 'email') return 'name@company.com';
  if (format === 'uri' || format === 'url') return 'https://';
  if (/^(phone|tel|mobile)/.test(name)) return '(555) 000-0000';
  if (/^(street|address)/.test(name)) return 'Search for an address...';
  if (/^(city)/.test(name)) return 'City name';
  if (/^(state|province|region)/.test(name)) return 'State or province';
  if (/^(zip|postal|postcode)/.test(name)) return '00000';
  if (/^(name|full_name)/.test(name)) return 'Full name';
  if (/^(company|org)/.test(name)) return 'Company name';
  if (/^(description|body|content|notes)/.test(name)) return 'Add a description...';
  if (/^(title|summary|subject|heading)/.test(name)) return 'Give it a title...';
  if (/^(location|venue|place)/.test(name)) return 'Conference room or virtual link';
  if (/^(channel)/.test(name)) return '#channel-name';
  if (/^(project)/.test(name)) return 'Project name';
  if (/^(repo|repository)/.test(name)) return 'owner/repository';
  return config.description || '';
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
      onFieldsPopulate,
    },
    ref,
  ) {
    const id = useId();
    const innerRef = useRef<HTMLInputElement>(null);
    const inputRef = (ref as React.RefObject<HTMLInputElement>) ?? innerRef;
    const maxLength = config.constraints.maxLength;
    const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string }>>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const hasToolMatch = !!config.toolMatch;
    // Disable browser autocomplete to prevent native popups from covering our UI
    const autoCompleteAttr = 'new-password';
    const isPhone = /^(phone|telephone|mobile|tel|cell)$/i.test(config.path);
    const inputType = config.constraints.format === 'email' ? 'email' : isPhone ? 'tel' : 'text';

    // Smarter inputMode based on field semantics
    const inputMode: React.HTMLAttributes<HTMLInputElement>['inputMode'] = (() => {
      if (config.constraints.format === 'email') return 'email';
      if (config.constraints.format === 'uri' || config.constraints.format === 'url') return 'url';
      if (isPhone) return 'tel';
      if (/amount|price|cost|quantity|count/i.test(config.path)) return 'numeric';
      return undefined;
    })();

    const formatPhone = useCallback((raw: string): string => {
      const digits = raw.replace(/\D/g, '').slice(0, 10);
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }, []);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        if (isPhone) val = formatPhone(val);
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

    const selectSuggestion = useCallback((suggestion: any) => {
      // If suggestion has structured fields, populate siblings
      if (suggestion._fields && onFieldsPopulate) {
        const fields = suggestion._fields as Record<string, any>;
        // Set the current field to just the street part (not full address)
        onChange(fields[config.path] || suggestion.name);
        onFieldsPopulate(fields);
      } else {
        onChange(suggestion.name);
      }
      setShowSuggestions(false);
      setSuggestions([]);
    }, [onChange, onFieldsPopulate, config.path]);

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

        <div className="fw-text-input__field" style={error ? { borderColor: '#ef4444' } : undefined}>
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
            placeholder={placeholder || getContextualPlaceholder(config)}
            maxLength={maxLength}
            inputMode={inputMode}
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

        {(error || (maxLength != null && (value ?? '').length > maxLength * 0.8)) && (
          <div className="fw-text-input__footer">
            {error && (
              <span id={`${id}-error`} className="fw-text-input__error" role="alert">
                {error}
              </span>
            )}
            {maxLength != null && (value ?? '').length > maxLength * 0.8 && (
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
