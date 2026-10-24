"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon } from "lucide-react";
import { cn } from "cn";

export function Checkbox({
  className,
  ...props
}: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-border-strong bg-surface transition-colors outline-none hover:border-brand-primary focus-visible:ring-3 focus-visible:ring-brand-primary/20 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-brand-primary data-checked:bg-brand-primary data-checked:text-white",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <CheckIcon className="size-3.5 stroke-[2.5]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
