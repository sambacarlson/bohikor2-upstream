package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"firebase.google.com/go/v4/auth"
	"github.com/gin-gonic/gin"
)

type mockAuthClient struct {
	token *auth.Token
	err   error
}

func (m *mockAuthClient) VerifyIDToken(ctx context.Context, idToken string) (*auth.Token, error) {
	return m.token, m.err
}

func setupTestRouter(authClient AuthVerifier) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(FirebaseAuth(authClient))
	r.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"uid": c.GetString("firebase_uid")})
	})
	return r
}

func TestFirebaseAuth_MissingHeader(t *testing.T) {
	r := setupTestRouter(&mockAuthClient{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequestWithContext(context.Background(), "GET", "/protected", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}

	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp["error"] != "missing authorization header" {
		t.Fatalf("expected missing auth header error, got %s", resp["error"])
	}
}

func TestFirebaseAuth_InvalidToken(t *testing.T) {
	r := setupTestRouter(&mockAuthClient{
		err: context.DeadlineExceeded,
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequestWithContext(context.Background(), "GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}

	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp["error"] != "invalid token" {
		t.Fatalf("expected invalid token error, got %s", resp["error"])
	}
}

func TestFirebaseAuth_ExpiredSession(t *testing.T) {
	thirtyOneDaysAgo := time.Now().Add(-31 * 24 * time.Hour).Unix()
	r := setupTestRouter(&mockAuthClient{
		token: &auth.Token{
			UID:      "test-uid",
			AuthTime: thirtyOneDaysAgo,
			Claims:   map[string]interface{}{"email": "test@example.com"},
		},
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequestWithContext(context.Background(), "GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer valid-token")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp["error"] != "session_expired" {
		t.Fatalf("expected session_expired error, got %v", resp["error"])
	}
	if resp["reauth_required"] != true {
		t.Fatalf("expected reauth_required=true, got %v", resp["reauth_required"])
	}
}

func TestFirebaseAuth_ValidToken(t *testing.T) {
	now := time.Now().Unix()
	r := setupTestRouter(&mockAuthClient{
		token: &auth.Token{
			UID:      "test-uid",
			AuthTime: now,
			Claims:   map[string]interface{}{"email": "test@example.com"},
		},
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequestWithContext(context.Background(), "GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer valid-token")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp["uid"] != "test-uid" {
		t.Fatalf("expected test-uid, got %s", resp["uid"])
	}
}
