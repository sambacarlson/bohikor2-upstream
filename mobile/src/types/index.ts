export type UserStatus = "active" | "suspended";

export type RequestStatus = "initiated" | "pending" | "success" | "failed";

export type VerificationStatus = "pending" | "verified" | "failed";

export interface User {
  id: string;
  email: string;
  firebase_uid: string;
  full_name: string | null;
  phone_number: string | null;
  status: UserStatus;
  is_terms_accepted: boolean;
  terms_accepted_at: string | null;
  terms_version: string | null;
  user_ip_at_consent: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdvanceRequest {
  id: string;
  user_id: string;
  amount_xaf: string;
  status: RequestStatus;
  campay_payout_ref: string | null;
  failure_reason: string | null;
  payout_duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface PhoneVerification {
  id: string;
  user_id: string;
  phone_number: string;
  transaction_id: string | null;
  verification_code: string | null;
  fee_xaf: string;
  status: VerificationStatus;
  created_at: string;
  verified_at: string | null;
}

export interface Event {
  id: string;
  user_id: string | null;
  admin_id: string | null;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Survey {
  id: string;
  user_id: string;
  request_id: string;
  satisfaction_score: number | null;
  feedback: string | null;
  created_at: string;
}

export interface KillSwitchState {
  active: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}