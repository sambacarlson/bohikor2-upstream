export type UserStatus = "active" | "suspended";

export type InvitationStatus = "pending" | "sent" | "accepted" | "revoked" | "failed";

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
  invited_by: string | null;
  sent_at: string;
  accepted_at: string | null;
}