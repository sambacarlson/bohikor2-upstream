import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Event, PaginatedResponse } from "@/types";

export function useEvents(page = 1, perPage = 50) {
  return useQuery({
    queryKey: ["events", page, perPage],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Event>>("/api/events", {
        params: { page, per_page: perPage },
      });
      return data;
    },
  });
}
