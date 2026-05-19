import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AdvanceRequest, PaginatedResponse } from "@/types";

export function useRequests(page = 1, perPage = 20, status?: string) {
  return useQuery({
    queryKey: ["requests", page, perPage, status],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<AdvanceRequest>>(
        "/api/requests",
        {
          params: { page, per_page: perPage, status },
        }
      );
      return data;
    },
  });
}

export function useRetryFailedRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data } = await api.post<AdvanceRequest>(
        `/api/requests/${requestId}/retry`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}
