import { SquareCheckBig } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <SquareCheckBig className="size-5" />
      </span>
      {!compact && <span className="text-xl font-semibold tracking-tight">Планер</span>}
    </div>
  );
}
