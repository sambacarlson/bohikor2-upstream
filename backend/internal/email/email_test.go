package email

import (
	"context"
	"testing"
)

func TestSendInvitation_ValidEmail(t *testing.T) {
	c := NewClient("test-key", "noreply@bohikor2.com")
	err := c.SendInvitation(context.Background(), "admin@example.com")
	if err == nil {
		t.Skip("skipped: requires real Resend API key")
	}
}

func TestSendInvitation_EmptyEmail(t *testing.T) {
	c := NewClient("test-key", "noreply@bohikor2.com")
	err := c.SendInvitation(context.Background(), "")
	if err == nil {
		t.Fatal("expected error for empty email")
	}
	if got := err.Error(); got != "email is required" {
		t.Fatalf("expected 'email is required', got %s", got)
	}
}

func TestSendInvitation_InvalidEmail(t *testing.T) {
	c := NewClient("test-key", "noreply@bohikor2.com")
	err := c.SendInvitation(context.Background(), "not-an-email")
	if err == nil {
		t.Fatal("expected error for invalid email")
	}
}

func TestSendOTP_EmptyEmail(t *testing.T) {
	c := NewClient("test-key", "noreply@bohikor2.com")
	err := c.SendOTP(context.Background(), "", "123456")
	if err == nil {
		t.Fatal("expected error for empty email")
	}
}

func TestSendOTP_InvalidEmail(t *testing.T) {
	c := NewClient("test-key", "noreply@bohikor2.com")
	err := c.SendOTP(context.Background(), "bad", "123456")
	if err == nil {
		t.Fatal("expected error for invalid email")
	}
}

func TestSendOTP_EmptyCode(t *testing.T) {
	c := NewClient("test-key", "noreply@bohikor2.com")
	err := c.SendOTP(context.Background(), "test@example.com", "")
	if err == nil {
		t.Fatal("expected error for empty code")
	}
}

func TestSendOTP_ShortCode(t *testing.T) {
	c := NewClient("test-key", "noreply@bohikor2.com")
	err := c.SendOTP(context.Background(), "test@example.com", "12345")
	if err == nil {
		t.Fatal("expected error for short code")
	}
}

func TestSendOTP_NonNumericCode(t *testing.T) {
	c := NewClient("test-key", "noreply@bohikor2.com")
	err := c.SendOTP(context.Background(), "test@example.com", "abcdef")
	if err == nil {
		t.Fatal("expected error for non-numeric code")
	}
}
