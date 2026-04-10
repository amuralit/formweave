import { forwardRef, useId, useCallback } from 'react';
import type { WidgetProps, FieldDefinition } from '@formweave/core';

type RowData = Record<string, any>;

export const ArrayTable = forwardRef<HTMLDivElement, WidgetProps<RowData[]>>(
  function ArrayTable(
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
    const rows = value ?? [];
    const columns: FieldDefinition[] = config.children ?? [];

    const addRow = useCallback(() => {
      if (disabled || readOnly) return;
      const emptyRow: RowData = {};
      for (const col of columns) {
        emptyRow[col.path] = col.constraints.default ?? '';
      }
      onChange([...rows, emptyRow]);
    }, [rows, columns, onChange, disabled, readOnly]);

    const removeRow = useCallback(
      (index: number) => {
        if (disabled || readOnly) return;
        onChange(rows.filter((_, i) => i !== index));
      },
      [rows, onChange, disabled, readOnly],
    );

    const updateCell = useCallback(
      (rowIndex: number, colPath: string, cellValue: any) => {
        if (disabled || readOnly) return;
        const updated = rows.map((row, i) =>
          i === rowIndex ? { ...row, [colPath]: cellValue } : row,
        );
        onChange(updated);
      },
      [rows, onChange, disabled, readOnly],
    );

    const rootCls = [
      'fw-array-table',
      error && 'fw-array-table--error',
      disabled && 'fw-array-table--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={rootCls} aria-labelledby={`${id}-label`}>
        <span id={`${id}-label`} className="fw-array-table__label">
          {config.label}
        </span>

        <div className="fw-array-table__wrapper">
          <table className="fw-array-table__table" role="grid">
            <thead>
              <tr className="fw-array-table__head-row">
                {columns.map((col) => (
                  <th key={col.path} className="fw-array-table__th" scope="col">
                    {col.label}
                  </th>
                ))}
                {!disabled && !readOnly && (
                  <th className="fw-array-table__th fw-array-table__th--actions" scope="col">
                    <span className="fw-sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="fw-array-table__row">
                  {columns.map((col) => (
                    <td key={col.path} className="fw-array-table__td">
                      <input
                        type="text"
                        className="fw-array-table__cell-input"
                        value={row[col.path] ?? ''}
                        onChange={(e) => updateCell(ri, col.path, e.target.value)}
                        disabled={disabled}
                        readOnly={readOnly}
                        aria-label={`${col.label} row ${ri + 1}`}
                      />
                    </td>
                  ))}
                  {!disabled && !readOnly && (
                    <td className="fw-array-table__td fw-array-table__td--actions">
                      <button
                        type="button"
                        className="fw-array-table__remove-btn"
                        onClick={() => removeRow(ri)}
                        aria-label={`Remove row ${ri + 1}`}
                      >
                        &times;
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!disabled && !readOnly && (
          <button
            type="button"
            className="fw-array-table__add-btn"
            onClick={addRow}
          >
            + Add row
          </button>
        )}

        {error && (
          <span className="fw-array-table__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);
