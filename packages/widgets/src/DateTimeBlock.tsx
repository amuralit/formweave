import { forwardRef, useId, useState, useCallback, useMemo } from 'react';
import type { WidgetProps } from '@formweave/core';

interface DateTimeValue {
  start?: string;
  end?: string;
  date?: string;
  time?: string;
}

function parseISO(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: '', time: '' };
  const date = d.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 5);
  return { date, time };
}

function formatDateDisplay(iso: string): { dayNum: string; dayName: string; monthYear: string } {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { dayNum: '--', dayName: '---', monthYear: '' };
  const dayNum = String(d.getDate());
  const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
  const monthYear = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  return { dayNum, dayName, monthYear };
}

function durationBetween(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
  const diffMs = e.getTime() - s.getTime();
  if (diffMs <= 0) return '';
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

export const DateTimeBlock = forwardRef<HTMLDivElement, WidgetProps<string | DateTimeValue>>(
  function DateTimeBlock(
    {
      value,
      onChange,
      error,
      disabled,
      readOnly,
      config,
      className,
    },
    ref,
  ) {
    const id = useId();
    const [editMode, setEditMode] = useState(false);
    const paired = config.group === 'datetime';

    const normalizedValue = useMemo<DateTimeValue>(() => {
      if (value == null) return {};
      if (typeof value === 'string') {
        const parsed = parseISO(value);
        return { date: parsed.date, time: parsed.time, start: value };
      }
      return value as DateTimeValue;
    }, [value]);

    const startDisplay = normalizedValue.start
      ? formatDateDisplay(normalizedValue.start)
      : null;

    const endDisplay =
      paired && normalizedValue.end
        ? formatDateDisplay(normalizedValue.end)
        : null;

    const startTime = normalizedValue.start
      ? parseISO(normalizedValue.start).time
      : normalizedValue.time ?? '';

    const endTime =
      paired && normalizedValue.end
        ? parseISO(normalizedValue.end).time
        : '';

    const duration =
      paired && normalizedValue.start && normalizedValue.end
        ? durationBetween(normalizedValue.start, normalizedValue.end)
        : '';

    const handleDateChange = useCallback(
      (field: 'start' | 'end', dateStr: string) => {
        const prev = normalizedValue;
        const existing = field === 'start' ? prev.start : prev.end;
        const timePart = existing ? parseISO(existing).time : '09:00';
        const iso = `${dateStr}T${timePart}:00`;
        if (paired) {
          onChange({
            start: field === 'start' ? iso : prev.start ?? '',
            end: field === 'end' ? iso : prev.end ?? '',
          } as any);
        } else {
          onChange(iso as any);
        }
      },
      [normalizedValue, paired, onChange],
    );

    const handleTimeChange = useCallback(
      (field: 'start' | 'end', timeStr: string) => {
        const prev = normalizedValue;
        const existing = field === 'start' ? prev.start : prev.end;
        const datePart = existing
          ? parseISO(existing).date
          : new Date().toISOString().slice(0, 10);
        const iso = `${datePart}T${timeStr}:00`;
        if (paired) {
          onChange({
            start: field === 'start' ? iso : prev.start ?? '',
            end: field === 'end' ? iso : prev.end ?? '',
          } as any);
        } else {
          onChange(iso as any);
        }
      },
      [normalizedValue, paired, onChange],
    );

    const rootCls = [
      'fw-datetime',
      paired && 'fw-datetime--paired',
      editMode && 'fw-datetime--editing',
      error && 'fw-datetime--error',
      disabled && 'fw-datetime--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={rootCls} aria-labelledby={`${id}-label`}>
        <span id={`${id}-label`} className="fw-datetime__label">
          {config.label}
        </span>

        {!editMode ? (
          <button
            type="button"
            className="fw-datetime__display"
            onClick={() => {
              if (!disabled && !readOnly) setEditMode(true);
            }}
            disabled={disabled}
            aria-label={`Edit ${config.label}`}
          >
            <div className="fw-datetime__block">
              {startDisplay ? (
                <>
                  <span className="fw-datetime__day-num">{startDisplay.dayNum}</span>
                  <span className="fw-datetime__day-name">{startDisplay.dayName}</span>
                  <span className="fw-datetime__month">{startDisplay.monthYear}</span>
                  {startTime && (
                    <span className="fw-datetime__time">{startTime}</span>
                  )}
                </>
              ) : (
                <span className="fw-datetime__placeholder">Set date</span>
              )}
            </div>

            {paired && (
              <>
                <span className="fw-datetime__separator">&rarr;</span>
                <div className="fw-datetime__block">
                  {endDisplay ? (
                    <>
                      <span className="fw-datetime__day-num">{endDisplay.dayNum}</span>
                      <span className="fw-datetime__day-name">{endDisplay.dayName}</span>
                      <span className="fw-datetime__month">{endDisplay.monthYear}</span>
                      {endTime && (
                        <span className="fw-datetime__time">{endTime}</span>
                      )}
                    </>
                  ) : (
                    <span className="fw-datetime__placeholder">Set end</span>
                  )}
                </div>
              </>
            )}

            {duration && (
              <span className="fw-datetime__duration">{duration}</span>
            )}
          </button>
        ) : (
          <div className="fw-datetime__editor">
            <div className="fw-datetime__row">
              <label className="fw-datetime__input-label">
                {paired ? 'Start date' : 'Date'}
                <input
                  type="date"
                  className="fw-datetime__input"
                  value={normalizedValue.start ? parseISO(normalizedValue.start).date : ''}
                  onChange={(e) => handleDateChange('start', e.target.value)}
                  disabled={disabled}
                />
              </label>
              <label className="fw-datetime__input-label">
                {paired ? 'Start time' : 'Time'}
                <input
                  type="time"
                  className="fw-datetime__input"
                  value={startTime}
                  onChange={(e) => handleTimeChange('start', e.target.value)}
                  disabled={disabled}
                />
              </label>
            </div>

            {paired && (
              <div className="fw-datetime__row">
                <label className="fw-datetime__input-label">
                  End date
                  <input
                    type="date"
                    className="fw-datetime__input"
                    value={normalizedValue.end ? parseISO(normalizedValue.end).date : ''}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    disabled={disabled}
                  />
                </label>
                <label className="fw-datetime__input-label">
                  End time
                  <input
                    type="time"
                    className="fw-datetime__input"
                    value={endTime}
                    onChange={(e) => handleTimeChange('end', e.target.value)}
                    disabled={disabled}
                  />
                </label>
              </div>
            )}

            <button
              type="button"
              className="fw-datetime__done"
              onClick={() => setEditMode(false)}
            >
              Done
            </button>
          </div>
        )}

        {error && (
          <span className="fw-datetime__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);
