import { Check } from "lucide-react";

export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Check className="size-6" strokeWidth={3} />
      </span>
      <span className="text-[22px] font-semibold tracking-tight">Планер</span>
    </div>
  );
}
