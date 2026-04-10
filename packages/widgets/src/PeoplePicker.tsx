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
  return name.charAt(0).toUpperCase();
}

function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

export interface PeoplePickerProps extends WidgetProps<Person[]> {
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
    const people = value ?? [];

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
        onChange([...people, person]);
        setSearch('');
        setShowDropdown(false);
        searchRef.current?.focus();
      },
      [people, onChange, disabled, readOnly],
    );

    const removePerson = useCallback(
      (personId: string) => {
        if (disabled || readOnly) return;
        setRemovingIds((prev) => new Set(prev).add(personId));
        setTimeout(() => {
          onChange(people.filter((p) => p.id !== personId));
          setRemovingIds((prev) => {
            const next = new Set(prev);
            next.delete(personId);
            return next;
          });
        }, 120);
      },
      [people, onChange, disabled, readOnly],
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
        </span>

        <div className="fw-people-picker__chips">
          {people.map((person) => {
            const removing = removingIds.has(person.id);
            return (
              <span
                key={person.id}
                className={`fw-people-picker__chip${removing ? ' fw-people-picker__chip--removing' : ''}`}
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
              <span className="fw-people-picker__plus" aria-hidden="true">
                +
              </span>
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
              onBlur={() => {
                setTimeout(() => setShowDropdown(false), 200);
              }}
              placeholder="Search people..."
              aria-label="Search people"
              autoComplete="off"
            />

            <ul className="fw-people-picker__list" role="listbox">
              {filtered.length === 0 && (
                <li className="fw-people-picker__empty">No results</li>
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
