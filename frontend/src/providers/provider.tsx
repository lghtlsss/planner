"use client";
import { ApiError, clearSession, getSession } from "@/lib/api";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

export const Provider = ({ children }: { children: ReactNode }) => {
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

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
