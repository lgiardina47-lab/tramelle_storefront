import { QueryClient } from "@tanstack/react-query"

export const MEDUSA_BACKEND_URL = __BACKEND_URL__ ?? "/"

const isDev = import.meta.env.DEV

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dev: cache sempre stale → nuovi dati al cambio route / focus tab senza F5.
      // Prod: al focus rifetch se oltre staleTime (evita polling globale).
      refetchOnWindowFocus: isDev ? "always" : true,
      refetchOnReconnect: true,
      staleTime: isDev ? 0 : 90_000,
      refetchInterval: isDev ? 20_000 : false,
      refetchIntervalInBackground: false,
      retry: 1,
    },
  },
})
