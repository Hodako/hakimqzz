import { useQuery } from "@tanstack/react-query";
import { getCashbox } from "@/lib/queries";
import type { CashboxEntry } from "@/lib/queries";

export function useCashboxQuery() {
  return useQuery<CashboxEntry[]>({
    queryKey: ["cashbox"],
    queryFn: getCashbox,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 3000, // Real-time sync for immediate cashbox drawer updates
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}
