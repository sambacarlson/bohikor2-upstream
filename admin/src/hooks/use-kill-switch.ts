import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { KillSwitchState } from "@/types";

export function useKillSwitch() {
  return useQuery({
    queryKey: ["kill-switch"],
    queryFn: async () => {
      const { data } = await api.get<KillSwitchState>("/api/kill-switch");
      return data;
    },
    refetchInterval: 10000,
  });
}

export function useToggleKillSwitch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (active: boolean) => {
      const { data } = await api.put<KillSwitchState>("/api/kill-switch", {
        active,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kill-switch"] });
    },
  });
}
