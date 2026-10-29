import { useQuery } from "@tanstack/react-query";
import { getCashbox } from "@/lib/queries";
import type { CashboxEntry } from "@/lib/queries";

export function useCashboxQuery() {
  return useQuery<CashboxEntry[]>({
    queryKey: ["cashbox"],
    queryFn: getCashbox,
    staleTime: 15 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 30000, // 30-second heartbeat for real-time sync without overwhelming the CPU/laptop
    refetchOnWindowFocus: true,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
}
