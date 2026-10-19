"use client";

import { ReactNode } from "react";
import { QueryClientProvider } from "./query-client-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export const Provider = ({ children }: { children: ReactNode }) => {
  return (
    <TooltipProvider>
      <QueryClientProvider>{children}</QueryClientProvider>
    </TooltipProvider>
  );
};
