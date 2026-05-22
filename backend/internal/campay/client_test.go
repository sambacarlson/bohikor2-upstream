package campay

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/shopspring/decimal"
)

func TestVerifyWebhook_Valid(t *testing.T) {
	secret := "test-secret"
	payload := []byte(`{"reference":"ref-123","status":"success"}`)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	signature := hex.EncodeToString(mac.Sum(nil))

	client := NewClient("token-abc", "http://localhost", secret)
	if !client.VerifyWebhook(payload, signature) {
		t.Fatal("expected valid signature verification")
	}
}

func TestVerifyWebhook_Invalid(t *testing.T) {
	secret := "test-secret"
	payload := []byte(`{"reference":"ref-123","status":"success"}`)

	client := NewClient("token-abc", "http://localhost", secret)
	if client.VerifyWebhook(payload, "invalid-signature") {
		t.Fatal("expected invalid signature to fail")
	}
}

func TestVerifyWebhook_WrongSecret(t *testing.T) {
	payload := []byte(`{"reference":"ref-123","status":"success"}`)

	mac := hmac.New(sha256.New, []byte("correct-secret"))
	mac.Write(payload)
	signature := hex.EncodeToString(mac.Sum(nil))

	client := NewClient("token-abc", "http://localhost", "wrong-secret")
	if client.VerifyWebhook(payload, signature) {
		t.Fatal("expected signature from different secret to fail")
	}
}

func TestInitiateTransfer_Success(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/transfer/" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		if r.Header.Get("Authorization") != "Token perm-token-123" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(TransferResponse{
			Reference: "campay-ref-123",
			Status:    "success",
		})
	}))
	defer ts.Close()

	client := NewClient("perm-token-123", ts.URL, "secret")
	resp, err := client.InitiateTransfer(t.Context(), "237600000000", decimal.NewFromInt(10000), "test transfer", "ext-ref-1")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if resp.Reference != "campay-ref-123" {
		t.Fatalf("expected reference campay-ref-123, got %s", resp.Reference)
	}
	if resp.Status != "success" {
		t.Fatalf("expected status success, got %s", resp.Status)
	}
}

func TestInitiateTransfer_Pending(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/transfer/" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(TransferResponse{
			Reference: "campay-ref-pending",
			Status:    "pending",
		})
	}))
	defer ts.Close()

	client := NewClient("perm-token", ts.URL, "secret")
	resp, err := client.InitiateTransfer(t.Context(), "237600000000", decimal.NewFromInt(10000), "test", "ext-1")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if resp.Status != "pending" {
		t.Fatalf("expected status pending, got %s", resp.Status)
	}
}

func TestInitiateTransfer_ServerError(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "internal server error"})
	}))
	defer ts.Close()

	client := NewClient("perm-token", ts.URL, "secret")
	_, err := client.InitiateTransfer(t.Context(), "237600000000", decimal.NewFromInt(10000), "test", "ext-1")
	if err == nil {
		t.Fatal("expected error for server error")
	}
}

func TestInitiateTransfer_Unauthorized(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"detail": "Invalid token"})
	}))
	defer ts.Close()

	client := NewClient("bad-token", ts.URL, "secret")
	_, err := client.InitiateTransfer(t.Context(), "237600000000", decimal.NewFromInt(10000), "test", "ext-1")
	if err == nil {
		t.Fatal("expected error for unauthorized")
	}
}

func TestNewClient(t *testing.T) {
	client := NewClient("perm-token", "https://demo.campay.net/api", "secret")
	if client.permanentToken != "perm-token" {
		t.Fatalf("expected permanentToken perm-token, got %s", client.permanentToken)
	}
	if client.baseURL != "https://demo.campay.net/api" {
		t.Fatalf("expected baseURL, got %s", client.baseURL)
	}
	if client.httpClient == nil {
		t.Fatal("expected httpClient to be initialized")
	}
}

func TestInitiateTransfer_CampayFailureStatus(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(TransferResponse{
			Reference: "ref-fail",
			Status:    "failed",
			Message:   "insufficient balance",
		})
	}))
	defer ts.Close()

	client := NewClient("perm-token", ts.URL, "secret")
	_, err := client.InitiateTransfer(t.Context(), "237600000000", decimal.NewFromInt(10000), "test", "ext-1")
	if err == nil {
		t.Fatal("expected error for failed transfer status")
	}
}
