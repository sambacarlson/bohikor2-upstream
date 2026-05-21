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

	client := NewClient("user", "pass", "http://localhost", secret)
	if !client.VerifyWebhook(payload, signature) {
		t.Fatal("expected valid signature verification")
	}
}

func TestVerifyWebhook_Invalid(t *testing.T) {
	secret := "test-secret"
	payload := []byte(`{"reference":"ref-123","status":"success"}`)

	client := NewClient("user", "pass", "http://localhost", secret)
	if client.VerifyWebhook(payload, "invalid-signature") {
		t.Fatal("expected invalid signature to fail")
	}
}

func TestVerifyWebhook_WrongSecret(t *testing.T) {
	payload := []byte(`{"reference":"ref-123","status":"success"}`)

	mac := hmac.New(sha256.New, []byte("correct-secret"))
	mac.Write(payload)
	signature := hex.EncodeToString(mac.Sum(nil))

	client := NewClient("user", "pass", "http://localhost", "wrong-secret")
	if client.VerifyWebhook(payload, signature) {
		t.Fatal("expected signature from different secret to fail")
	}
}

func TestInitiateTransfer_Success(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/token/" {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(TokenResponse{
				Token:     "test-access-token",
				ExpiresIn: 3600,
			})
			return
		}
		if r.URL.Path == "/transfer/" {
			if r.Header.Get("Authorization") != "Bearer test-access-token" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(TransferResponse{
				Reference: "campay-ref-123",
				Status:    "success",
			})
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	client := NewClient("user", "pass", ts.URL, "secret")
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
		if r.URL.Path == "/token/" {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(TokenResponse{
				Token:     "test-token",
				ExpiresIn: 3600,
			})
			return
		}
		if r.URL.Path == "/transfer/" {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(TransferResponse{
				Reference: "campay-ref-pending",
				Status:    "pending",
			})
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	client := NewClient("user", "pass", ts.URL, "secret")
	resp, err := client.InitiateTransfer(t.Context(), "237600000000", decimal.NewFromInt(10000), "test", "ext-1")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if resp.Status != "pending" {
		t.Fatalf("expected status pending, got %s", resp.Status)
	}
}

func TestInitiateTransfer_TokenFailure(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid credentials"})
	}))
	defer ts.Close()

	client := NewClient("user", "wrong", ts.URL, "secret")
	_, err := client.InitiateTransfer(t.Context(), "237600000000", decimal.NewFromInt(10000), "test", "ext-1")
	if err == nil {
		t.Fatal("expected error for token failure")
	}
}

func TestInitiateTransfer_ServerError(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/token/" {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(TokenResponse{
				Token:     "test-token",
				ExpiresIn: 3600,
			})
			return
		}
		if r.URL.Path == "/transfer/" {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "internal server error"})
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	client := NewClient("user", "pass", ts.URL, "secret")
	_, err := client.InitiateTransfer(t.Context(), "237600000000", decimal.NewFromInt(10000), "test", "ext-1")
	if err == nil {
		t.Fatal("expected error for server error")
	}
}

func TestNewClient(t *testing.T) {
	client := NewClient("user", "pass", "https://demo.campay.net/api", "secret")
	if client.username != "user" {
		t.Fatalf("expected username user, got %s", client.username)
	}
	if client.baseURL != "https://demo.campay.net/api" {
		t.Fatalf("expected baseURL, got %s", client.baseURL)
	}
	if client.httpClient == nil {
		t.Fatal("expected httpClient to be initialized")
	}
}
