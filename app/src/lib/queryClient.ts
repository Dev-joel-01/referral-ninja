import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Refetch when window regains focus (production only)
      refetchOnWindowFocus: process.env.NODE_ENV === 'production',
      // Refetch when reconnecting (network recovery)
      refetchOnReconnect: true,
      // Retry failed queries 3 times (not on 4xx errors)
      retry: (failureCount, error) => {
        // Don't retry on 4xx client errors
        if (error instanceof Error) {
          const statusCode = error.message.match(/4\d{2}/);
          if (statusCode) return false;
        }
        return failureCount < 3;
      },
      // Exponential backoff: 1s, 2s, 4s, max 30s
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry mutations once (they're more critical)
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 1;
      },
    },
  },
});