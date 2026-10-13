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
import { ReactNode } from "react";

export const QueryClientProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();

  function handleApiError(error: Error): void {
    if (!(error instanceof ApiError)) return;
    if (!error.isUnauthorized || !error.invalidatesSession) return;

    if (!getSession()) return;

    clearSession();
    router.push("/");
  }

  function createQueryClient(): QueryClient {
    return new QueryClient({
      queryCache: new QueryCache({ onError: handleApiError }),
      mutationCache: new MutationCache({ onError: handleApiError }),
    });
  }

  const queryClient = createQueryClient();

  return <QueryProvider client={queryClient}>{children}</QueryProvider>;
};
