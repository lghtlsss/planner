"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

export function Sheet({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1F2333]/45">
      <button className="absolute inset-0" aria-label="Закрыть" onClick={onClose} />
      <div className="relative max-h-[92dvh] w-full max-w-lg overflow-auto rounded-t-[28px] bg-card px-4 pt-3 pb-6">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-h2">{title}</h2>
            {subtitle && (
              <p className="text-caption text-text-secondary">{subtitle}</p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть">
            <X className="size-5 text-text-secondary" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
