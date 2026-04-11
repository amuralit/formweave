import {
  forwardRef,
  useId,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type { WidgetProps } from '@formweave/core';

export interface Person {
  id: string;
  name: string;
  avatar?: string;
}

function initialLetter(name: string): string {
  return (name.charAt(0) || '?').toUpperCase();
}

function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

/** Convert a raw string (email) into a Person object */
function toPerson(input: string | Person): Person {
  if (typeof input === 'object' && input !== null && 'id' in input) {
    return input;
  }
  const str = String(input);
  const name = str.includes('@') ? str.split('@')[0] : str;
  // Capitalize first letter of each word
  const displayName = name
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { id: str, name: displayName };
}

/** Convert Person[] back to string[] for onChange if the original value was strings */
function toOutputValue(people: Person[], originalWasStrings: boolean): any {
  if (originalWasStrings) {
    return people.map((p) => p.id);
  }
  return people;
}

export interface PeoplePickerProps extends WidgetProps<any> {
  suggestions?: Person[];
}

export const PeoplePicker = forwardRef<HTMLDivElement, PeoplePickerProps>(
  function PeoplePicker(
    {
      value,
      onChange,
      error,
      disabled,
      readOnly,
      config,
      className,
      suggestions = [],
    },
    ref,
  ) {
    const id = useId();
    const [search, setSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
    const searchRef = useRef<HTMLInputElement>(null);

    // Normalize input: handle string[] or Person[]
    const rawValue = Array.isArray(value) ? value : [];
    const originalWasStrings = rawValue.length > 0 && typeof rawValue[0] === 'string';
    const people: Person[] = rawValue.map(toPerson);

    const filtered = useMemo(() => {
      const selectedIds = new Set(people.map((p) => p.id));
      let pool = suggestions.filter((s) => !selectedIds.has(s.id));
      if (search) {
        const q = search.toLowerCase();
        pool = pool.filter((s) => s.name.toLowerCase().includes(q));
      }
      return pool;
    }, [suggestions, people, search]);

    const addPerson = useCallback(
      (person: Person) => {
        if (disabled || readOnly) return;
        const next = [...people, person];
        onChange(toOutputValue(next, originalWasStrings));
        setSearch('');
        setShowDropdown(false);
        searchRef.current?.focus();
      },
      [people, onChange, disabled, readOnly, originalWasStrings],
    );

    const addFromSearch = useCallback(() => {
      if (disabled || readOnly || !search.trim()) return;
      const person = toPerson(search.trim());
      const next = [...people, person];
      onChange(toOutputValue(next, originalWasStrings));
      setSearch('');
      searchRef.current?.focus();
    }, [people, onChange, disabled, readOnly, search, originalWasStrings]);

    const removePerson = useCallback(
      (personId: string) => {
        if (disabled || readOnly) return;
        setRemovingIds((prev) => new Set(prev).add(personId));
        setTimeout(() => {
          const next = people.filter((p) => p.id !== personId);
          onChange(toOutputValue(next, originalWasStrings));
          setRemovingIds((prev) => {
            const s = new Set(prev);
            s.delete(personId);
            return s;
          });
        }, 120);
      },
      [people, onChange, disabled, readOnly, originalWasStrings],
    );

    const rootCls = [
      'fw-people-picker',
      error && 'fw-people-picker--error',
      disabled && 'fw-people-picker--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={rootCls} aria-labelledby={`${id}-label`}>
        <span id={`${id}-label`} className="fw-people-picker__label">
          {config.label}
          {people.length > 0 && (
            <span className="fw-people-picker__count" aria-label={`${people.length} ${people.length === 1 ? 'person' : 'people'} selected`}>
              {people.length} {people.length === 1 ? 'person' : 'people'}
            </span>
          )}
        </span>

        <div className="fw-people-picker__chips" style={error ? { borderColor: '#ef4444' } : undefined}>
          {people.map((person) => {
            const removing = removingIds.has(person.id);
            return (
              <span
                key={person.id}
                className={`fw-chip${removing ? ' fw-chip--removing' : ''}`}
                aria-label={person.name}
              >
                <span
                  className="fw-people-picker__avatar"
                  style={{ backgroundColor: nameToColor(person.name) }}
                  aria-hidden="true"
                >
                  {initialLetter(person.name)}
                </span>
                <span className="fw-people-picker__name">{person.name}</span>
                {!disabled && !readOnly && (
                  <button
                    type="button"
                    className="fw-people-picker__remove"
                    onClick={() => removePerson(person.id)}
                    aria-label={`Remove ${person.name}`}
                  >
                    &times;
                  </button>
                )}
              </span>
            );
          })}

          {!disabled && !readOnly && (
            <button
              type="button"
              className="fw-people-picker__add-btn"
              onClick={() => {
                setShowDropdown(true);
                requestAnimationFrame(() => searchRef.current?.focus());
              }}
              aria-label={`Add ${config.label}`}
            >
              <span className="fw-people-picker__plus" aria-hidden="true">+</span>
              <span className="fw-people-picker__add-text">Add</span>
            </button>
          )}
        </div>

        {showDropdown && (
          <div className="fw-people-picker__dropdown">
            <input
              ref={searchRef}
              type="text"
              className="fw-people-picker__search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filtered.length > 0) {
                    addPerson(filtered[0]);
                  } else {
                    addFromSearch();
                  }
                }
                if (e.key === 'Escape') {
                  setShowDropdown(false);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowDropdown(false), 200);
              }}
              placeholder="Search or type email..."
              aria-label="Search people"
              autoComplete="off"
            />

            <ul className="fw-people-picker__list" role="listbox">
              {filtered.length === 0 && search && (
                <li
                  className="fw-people-picker__option"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addFromSearch();
                  }}
                >
                  Add "{search}"
                </li>
              )}
              {filtered.length === 0 && !search && (
                <li className="fw-people-picker__empty">Type to add people</li>
              )}
              {filtered.map((person) => (
                <li
                  key={person.id}
                  role="option"
                  aria-selected={false}
                  className="fw-people-picker__option"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addPerson(person);
                  }}
                >
                  <span
                    className="fw-people-picker__avatar fw-people-picker__avatar--sm"
                    style={{ backgroundColor: nameToColor(person.name) }}
                    aria-hidden="true"
                  >
                    {initialLetter(person.name)}
                  </span>
                  {person.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <span className="fw-people-picker__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);
