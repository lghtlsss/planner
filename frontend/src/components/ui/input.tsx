import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-[10px] border border-border-subtle bg-surface px-3.5 py-2 text-[15px] leading-[22px] text-text-main transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-main placeholder:text-text-placeholder focus-visible:border-brand-primary focus-visible:ring-3 focus-visible:ring-brand-primary/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-bg-page disabled:text-text-placeholder aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/15",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
