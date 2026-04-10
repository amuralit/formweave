import { forwardRef, useId, useRef, useCallback } from 'react';
import type { WidgetProps } from '@formweave/core';

export interface FileInfo {
  name: string;
  size: number;
  type: string;
}

/**
 * Placeholder component for file uploads.
 * Provides a basic file input UI. Can be replaced with a
 * more sophisticated drag-and-drop uploader by the consuming application.
 */
export const FileUploadPlaceholder = forwardRef<HTMLDivElement, WidgetProps<FileInfo[]>>(
  function FileUploadPlaceholder(
    { value, onChange, error, disabled, readOnly, config, className },
    ref,
  ) {
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const files = value ?? [];

    const handleFiles = useCallback(
      (fileList: FileList) => {
        const infos: FileInfo[] = Array.from(fileList).map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
        }));
        onChange([...files, ...infos]);
      },
      [files, onChange],
    );

    const removeFile = useCallback(
      (index: number) => {
        onChange(files.filter((_, i) => i !== index));
      },
      [files, onChange],
    );

    const rootCls = [
      'fw-file-upload',
      error && 'fw-file-upload--error',
      disabled && 'fw-file-upload--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={rootCls}>
        <label id={`${id}-label`} className="fw-file-upload__label">
          {config.label}
        </label>

        <div className="fw-file-upload__files">
          {files.map((file, i) => (
            <span key={`${file.name}-${i}`} className="fw-file-upload__file">
              <span className="fw-file-upload__file-name">{file.name}</span>
              {!disabled && !readOnly && (
                <button
                  type="button"
                  className="fw-file-upload__file-remove"
                  onClick={() => removeFile(i)}
                  aria-label={`Remove ${file.name}`}
                >
                  &times;
                </button>
              )}
            </span>
          ))}
        </div>

        {!disabled && !readOnly && (
          <>
            <button
              type="button"
              className="fw-file-upload__trigger"
              onClick={() => inputRef.current?.click()}
              aria-describedby={`${id}-label`}
            >
              Choose files
            </button>
            <input
              ref={inputRef}
              type="file"
              className="fw-file-upload__native"
              multiple
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = '';
              }}
              tabIndex={-1}
              aria-hidden="true"
            />
          </>
        )}

        {error && (
          <span className="fw-file-upload__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);
