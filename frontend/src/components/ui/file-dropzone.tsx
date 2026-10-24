"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { AlertCircle, FileSpreadsheet, Upload, X } from "lucide-react";
import { cn } from "cn";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 МБ

export interface FileDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  className?: string;
}

export function FileDropzone({
  file,
  onFileChange,
  disabled = false,
  className,
}: FileDropzoneProps) {
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [rejectedFile, setRejectedFile] = React.useState<{
    name: string;
    size: number;
  } | null>(null);

  const onDrop = React.useCallback(
    (acceptedFiles: File[], fileRejections: { file: File }[]) => {
      if (fileRejections.length > 0) {
        const rejected = fileRejections[0].file;
        setRejectedFile({ name: rejected.name, size: rejected.size });
        onFileChange(null);
        if (!rejected.name.toLowerCase().endsWith(".xlsx")) {
          setErrorMessage("Неподходящий формат. Нужен файл Excel (.xlsx)");
        } else if (rejected.size > MAX_SIZE_BYTES) {
          setErrorMessage("Файл слишком большой. Максимальный размер — 10 МБ");
        } else {
          setErrorMessage("Не удалось выбрать файл");
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        setErrorMessage(null);
        setRejectedFile(null);
        onFileChange(acceptedFiles[0]);
      }
    },
    [onFileChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    multiple: false,
    maxSize: MAX_SIZE_BYTES,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} МБ`;
  };

  if (rejectedFile && errorMessage) {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-danger bg-danger-light px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <FileSpreadsheet className="size-5 shrink-0 text-danger" />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-text-main">
                {rejectedFile.name}
              </p>
              <p className="text-caption text-text-secondary">
                {formatSize(rejectedFile.size)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setRejectedFile(null);
              setErrorMessage(null);
            }}
            className="text-text-secondary hover:text-text-main"
            aria-label="Удалить файл"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="flex items-center gap-1.5 text-caption text-danger">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      </div>
    );
  }

  if (file) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5",
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <FileSpreadsheet className="size-5 shrink-0 text-success" />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-text-main">
              {file.name}
            </p>
            <p className="text-caption text-success">
              {formatSize(file.size)} · файл подходит
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onFileChange(null)}
          className="text-text-secondary hover:text-text-main"
          aria-label="Удалить файл"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-7 text-center transition-colors outline-none",
        isDragActive
          ? "border-brand-primary bg-brand-primary-light"
          : "border-border-strong bg-bg-page/60 hover:border-brand-primary hover:bg-brand-primary-light/50",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <input {...getInputProps()} />
      <span className="flex size-10 items-center justify-center rounded-xl bg-surface text-brand-primary shadow-xs">
        <Upload className="size-5" />
      </span>
      <p className="mt-2.5 text-[14px] leading-[20px] font-medium text-text-main">
        {isDragActive ? (
          <span className="text-brand-primary">
            Отпустите файл, чтобы загрузить
          </span>
        ) : (
          <>
            Перетащите файл или{" "}
            <span className="text-brand-primary">нажмите, чтобы выбрать</span>
          </>
        )}
      </p>
      <p className="mt-0.5 text-caption text-text-placeholder">
        Формат .xlsx, до 10 МБ
      </p>
    </div>
  );
}
