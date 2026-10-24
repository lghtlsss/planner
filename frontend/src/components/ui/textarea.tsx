import * as React from "react";
import { cn } from "cn";

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  maxCount?: number;
}

export function Textarea({
  className,
  maxCount = 300,
  value,
  defaultValue,
  onChange,
  ...props
}: TextareaProps) {
  const [internalLength, setInternalLength] = React.useState(() => {
    const initial = value ?? defaultValue ?? "";
    return String(initial).length;
  });

  const currentLength =
    value !== undefined ? String(value).length : internalLength;

  return (
    <div className="flex w-full flex-col gap-1">
      <textarea
        data-slot="textarea"
        maxLength={maxCount}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => {
          setInternalLength(e.target.value.length);
          onChange?.(e);
        }}
        className={cn(
          "min-h-[96px] w-full resize-none rounded-[10px] border border-border-subtle bg-surface px-3.5 py-2.5 text-[15px] leading-[22px] text-text-main transition-colors outline-none placeholder:text-text-placeholder focus-visible:border-brand-primary focus-visible:ring-3 focus-visible:ring-brand-primary/15 disabled:cursor-not-allowed disabled:bg-bg-page disabled:text-text-placeholder aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/15",
          className,
        )}
        {...props}
      />
      {maxCount && (
        <span className="self-end text-[12px] leading-[16px] text-text-placeholder">
          {currentLength} / {maxCount}
        </span>
      )}
    </div>
  );
}
