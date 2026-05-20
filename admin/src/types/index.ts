export type UserStatus = "active" | "suspended";
export type RequestStatus = "initiated" | "pending" | "success" | "failed";
export type InvitationStatus = "pending" | "sent" | "accepted" | "expired" | "revoked" | "failed";

export interface User {
  id: string;
  email: string;
  email_verified: boolean;
  firebase_uid: string;
  full_name: string | null;
  phone_number: string;
  phone_verified: boolean;
  status: UserStatus;
  is_terms_accepted: boolean;
  terms_accepted_at: string | null;
  terms_version: string | null;
  user_ip_at_consent: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: string;
  email: string;
  status: InvitationStatus;
  sent_at: string;
  accepted_at: string | null;
}

export interface Admin {
  id: string;
  email: string;
  firebase_uid: string;
  created_at: string;
}

export interface AdvanceRequest {
  id: string;
  user_id: string;
  amount_xaf: number;
  status: RequestStatus;
  campay_payout_ref: string | null;
  failure_reason: string | null;
  payout_duration_seconds: number | null;
  created_at: string;
  updated_at: string;
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

export interface SystemConfig {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
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

export interface DashboardStats {
  total_users: number;
  active_users: number;
  total_requests: number;
  successful_payouts: number;
  failed_payouts: number;
  pending_payouts: number;
  avg_payout_duration_seconds: number | null;
}
