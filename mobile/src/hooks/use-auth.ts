import { useMutation } from "@tanstack/react-query";
import { api } from "@/src/lib/api";

export interface CheckInvitationResponse {
  has_invitation: boolean;
  status: string;
}

export function useCheckInvitation() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.get<{ data: CheckInvitationResponse }>(
        `/api/auth/check-invite?email=${encodeURIComponent(email)}`
      );
      return data.data;
    },
  });
}

export function useSendEmailOTP() {
  return useMutation({
    mutationFn: async (email: string) => {
      await api.post("/api/auth/send-email-otp", { email });
    },
  });
}

export function useVerifyEmailOTP() {
  return useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      await api.post("/api/auth/verify-email-otp", { email, code });
    },
  });
}

export interface VerifyPhoneOTPResponse {
  id: string;
  email: string;
  email_verified: boolean;
  firebase_uid: string;
  full_name: string | null;
  phone_number: string;
  phone_verified: boolean;
  status: string;
  is_terms_accepted: boolean;
  terms_accepted_at: string | null;
  terms_version: string | null;
  user_ip_at_consent: string | null;
  created_at: string;
  updated_at: string;
}

export function useVerifyPhoneOTP() {
  return useMutation({
    mutationFn: async ({ email, phoneNumber }: { email: string; phoneNumber: string }) => {
      const { data } = await api.post<{ data: VerifyPhoneOTPResponse }>(
        "/api/auth/verify-phone-otp",
        { email, phone_number: phoneNumber }
      );
      return data.data;
    },
  });
}
