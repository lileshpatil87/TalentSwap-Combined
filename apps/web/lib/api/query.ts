"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, type QueryKey, type UseMutationOptions, type UseQueryOptions } from "@tanstack/react-query";
import { NetworkError, parseApiError } from "@/lib/api";
import { isNetworkFallbackEnabled } from "@/lib/api/mode";

export interface LiveQueryOptions<TData> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  fallback?: TData | (() => TData);
  enabled?: boolean;
  staleTime?: number;
}

export function useLiveQuery<TData>({ queryKey, queryFn, fallback, enabled = true, staleTime }: LiveQueryOptions<TData>) {
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const query = useQuery<TData>({
    queryKey,
    queryFn: async () => {
      try {
        const data = await queryFn();
        setFallbackUsed(false);
        return data;
      } catch (error) {
        if (fallback !== undefined && error instanceof NetworkError && isNetworkFallbackEnabled()) {
          setFallbackUsed(true);
          return typeof fallback === "function" ? (fallback as () => TData)() : fallback;
        }
        throw error;
      }
    },
    enabled,
    staleTime,
  } as UseQueryOptions<TData>);
  useEffect(() => { if (!query.isFetching && query.error) setFallbackUsed(false); }, [query.error, query.isFetching]);
  return { ...query, errorMessage: query.error ? parseApiError(query.error).message : null, fallbackUsed };
}

export function useLiveMutation<TData, TVariables>(options: UseMutationOptions<TData, Error, TVariables>) {
  const mutation = useMutation(options);
  return { ...mutation, errorMessage: mutation.error ? parseApiError(mutation.error).message : null };
}
