package email

import (
	"context"
	"testing"
)

func TestSendOTP_InvalidEmail(t *testing.T) {
	client := NewClient("test-key", "noreply@test.com")
	err := client.SendOTP(context.Background(), "not-an-email", "123456")
	if err == nil {
		t.Fatal("expected error for invalid email, got nil")
	}
}

func TestSendOTP_EmptyEmail(t *testing.T) {
	client := NewClient("test-key", "noreply@test.com")
	err := client.SendOTP(context.Background(), "", "123456")
	if err == nil {
		t.Fatal("expected error for empty email, got nil")
	}
}

func TestSendOTP_EmptyCode(t *testing.T) {
	client := NewClient("test-key", "noreply@test.com")
	err := client.SendOTP(context.Background(), "user@example.com", "")
	if err == nil {
		t.Fatal("expected error for empty code, got nil")
	}
}

func TestSendOTP_CodeTooShort(t *testing.T) {
	client := NewClient("test-key", "noreply@test.com")
	err := client.SendOTP(context.Background(), "user@example.com", "12345")
	if err == nil {
		t.Fatal("expected error for short code, got nil")
	}
}

func TestSendOTP_CodeTooLong(t *testing.T) {
	client := NewClient("test-key", "noreply@test.com")
	err := client.SendOTP(context.Background(), "user@example.com", "1234567")
	if err == nil {
		t.Fatal("expected error for long code, got nil")
	}
}

func TestSendOTP_CodeNonNumeric(t *testing.T) {
	client := NewClient("test-key", "noreply@test.com")
	err := client.SendOTP(context.Background(), "user@example.com", "abcdef")
	if err == nil {
		t.Fatal("expected error for non-numeric code, got nil")
	}
}
