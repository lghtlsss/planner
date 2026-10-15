"use client";

import { ReactNode } from "react";
import { QueryClientProvider } from "./query-client-provider";

export const Provider = ({ children }: { children: ReactNode }) => {
  return <QueryClientProvider>{children}</QueryClientProvider>;
};
