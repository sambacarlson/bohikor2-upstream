import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import type { AdvanceRequest, User } from "@/src/types";

export function useAcceptTerms() {
  return useMutation({
    mutationFn: async ({ version }: { version: string }) => {
      const { data } = await api.put<{ data: User }>("/api/users/terms", { version });
      return data.data;
    },
  });
}

export function useCreateAdvanceRequest() {
  return useMutation({
    mutationFn: async ({ phoneNumber }: { phoneNumber: string }) => {
      const { data } = await api.post<{ data: AdvanceRequest }>("/api/advance-requests", {
        phone_number: phoneNumber,
      });
      return data.data;
    },
  });
}

export function useAdvanceRequests() {
  return useQuery({
    queryKey: ["advance-requests"],
    queryFn: async () => {
      const { data } = await api.get<{ data: AdvanceRequest[] }>("/api/advance-requests");
      return data.data;
    },
  });
}
