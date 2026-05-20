package firebaseapp

import (
	"context"
	"testing"
)

func TestNewClient_MalformedJSON(t *testing.T) {
	_, err := NewClient(context.Background(), "not-json", "test-project")
	if err == nil {
		t.Fatal("expected error for malformed JSON, got nil")
	}
}

func TestNewClient_EmptyJSON(t *testing.T) {
	_, err := NewClient(context.Background(), "", "test-project")
	if err == nil {
		t.Fatal("expected error for empty JSON, got nil")
	}
}

func TestNewClient_MissingRequiredFields(t *testing.T) {
	// JSON with type but missing private_key and project_id
	jsonCreds := `{"type": "service_account"}`
	_, err := NewClient(context.Background(), jsonCreds, "test-project")
	if err == nil {
		t.Fatal("expected error for incomplete credentials, got nil")
	}
}
