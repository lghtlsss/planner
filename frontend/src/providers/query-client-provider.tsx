"use client";

import { ApiError } from "@/lib/api";
import { clearSession, getSession } from "@/lib/session";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider as QueryProvider,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ReactNode, useState } from "react";

export const QueryClientProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();

  function handleApiError(error: Error): void {
    if (!(error instanceof ApiError)) return;
    if (!error.isUnauthorized || !error.invalidatesSession) return;
    if (!getSession()) return;

    clearSession();
    router.push("/login");
  }

  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: handleApiError }),
        mutationCache: new MutationCache({ onError: handleApiError }),
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      }),
  );

  return <QueryProvider client={queryClient}>{children}</QueryProvider>;
};
