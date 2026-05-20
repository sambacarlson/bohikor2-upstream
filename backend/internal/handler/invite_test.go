package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"firebase.google.com/go/v4/auth"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	db "github.com/Iknite-Space/bohikor2/db/sqlc"
	"github.com/Iknite-Space/bohikor2/internal/middleware"
	"github.com/Iknite-Space/bohikor2/internal/service"
)

type mockInviteQuerier struct {
	result *service.InviteResult
	err    error
}

func (m *mockInviteQuerier) Invite(ctx context.Context, email string, invitedBy uuid.UUID) (*service.InviteResult, error) {
	return m.result, m.err
}

type mockAdminQuerier struct {
	admin    *db.Admin
	adminErr error
}

func (m *mockAdminQuerier) GetAdminByFirebaseUID(ctx context.Context, firebaseUid string) (db.Admin, error) {
	if m.adminErr != nil {
		return db.Admin{}, m.adminErr
	}
	if m.admin == nil {
		return db.Admin{}, errors.New("not found")
	}
	return *m.admin, nil
}

func (m *mockAdminQuerier) GetUserByFirebaseUID(ctx context.Context, firebaseUid string) (db.User, error) {
	return db.User{}, errors.New("not found")
}

type mockAuthVerifier struct {
	token *auth.Token
	err   error
}

func (m *mockAuthVerifier) VerifyIDToken(ctx context.Context, idToken string) (*auth.Token, error) {
	return m.token, m.err
}

func TestHandleInvite_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.FirebaseAuth(&mockAuthVerifier{}))
	r.POST("/api/admin/invite", HandleInvite(&mockInviteQuerier{}))

	w := httptest.NewRecorder()
	req, _ := http.NewRequestWithContext(context.Background(), "POST", "/api/admin/invite", strings.NewReader(`{"email":"test@example.com"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleInvite_NonAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	verifier := &mockAuthVerifier{
		token: &auth.Token{UID: "test-uid", AuthTime: time.Now().Unix()},
	}
	r := gin.New()
	r.Use(middleware.FirebaseAuth(verifier))
	r.Use(middleware.RequireAdmin(&mockAdminQuerier{}))
	r.POST("/api/admin/invite", HandleInvite(&mockInviteQuerier{}))

	w := httptest.NewRecorder()
	req, _ := http.NewRequestWithContext(context.Background(), "POST", "/api/admin/invite", strings.NewReader(`{"email":"test@example.com"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestHandleInvite_ValidRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	adminID := uuid.New()
	verifier := &mockAuthVerifier{
		token: &auth.Token{UID: adminID.String(), AuthTime: time.Now().Unix()},
	}
	adminQuerier := &mockAdminQuerier{
		admin: &db.Admin{
			ID:          uuid.New(),
			Email:       "admin@example.com",
			FirebaseUid: adminID.String(),
		},
	}
	inviteQuerier := &mockInviteQuerier{
		result: &service.InviteResult{
			Invitation: db.Invitation{
				ID:     uuid.New(),
				Email:  "newadmin@example.com",
				Status: db.InvitationStatusSent,
				SentAt: time.Now().UTC(),
			},
		},
	}

	r := gin.New()
	r.Use(middleware.FirebaseAuth(verifier))
	r.Use(middleware.RequireAdmin(adminQuerier))
	r.POST("/api/admin/invite", HandleInvite(inviteQuerier))

	w := httptest.NewRecorder()
	req, _ := http.NewRequestWithContext(context.Background(), "POST", "/api/admin/invite", strings.NewReader(`{"email":"newadmin@example.com"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	data, ok := resp["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %v", resp)
	}
	if data["email"] != "newadmin@example.com" {
		t.Fatalf("expected email newadmin@example.com, got %v", data["email"])
	}
	if data["status"] != "sent" {
		t.Fatalf("expected status sent, got %v", data["status"])
	}
}

func TestHandleInvite_DuplicateInvitation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	adminID := uuid.New()
	verifier := &mockAuthVerifier{
		token: &auth.Token{UID: adminID.String(), AuthTime: time.Now().Unix()},
	}
	adminQuerier := &mockAdminQuerier{
		admin: &db.Admin{
			ID:          uuid.New(),
			Email:       "admin@example.com",
			FirebaseUid: adminID.String(),
		},
	}
	inviteQuerier := &mockInviteQuerier{
		err: service.ErrActiveInvitationExists,
	}

	r := gin.New()
	r.Use(middleware.FirebaseAuth(verifier))
	r.Use(middleware.RequireAdmin(adminQuerier))
	r.POST("/api/admin/invite", HandleInvite(inviteQuerier))

	w := httptest.NewRecorder()
	req, _ := http.NewRequestWithContext(context.Background(), "POST", "/api/admin/invite", strings.NewReader(`{"email":"existing@example.com"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d", w.Code)
	}
}

func TestHandleInvite_BadRequestBody(t *testing.T) {
	gin.SetMode(gin.TestMode)
	adminID := uuid.New()
	verifier := &mockAuthVerifier{
		token: &auth.Token{UID: adminID.String(), AuthTime: time.Now().Unix()},
	}
	adminQuerier := &mockAdminQuerier{
		admin: &db.Admin{
			ID:          uuid.New(),
			Email:       "admin@example.com",
			FirebaseUid: adminID.String(),
		},
	}

	r := gin.New()
	r.Use(middleware.FirebaseAuth(verifier))
	r.Use(middleware.RequireAdmin(adminQuerier))
	r.POST("/api/admin/invite", HandleInvite(&mockInviteQuerier{}))

	w := httptest.NewRecorder()
	req, _ := http.NewRequestWithContext(context.Background(), "POST", "/api/admin/invite", strings.NewReader(`{"email":"not-an-email"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestHandleInvite_MissingEmail(t *testing.T) {
	gin.SetMode(gin.TestMode)
	adminID := uuid.New()
	verifier := &mockAuthVerifier{
		token: &auth.Token{UID: adminID.String(), AuthTime: time.Now().Unix()},
	}
	adminQuerier := &mockAdminQuerier{
		admin: &db.Admin{
			ID:          uuid.New(),
			Email:       "admin@example.com",
			FirebaseUid: adminID.String(),
		},
	}

	r := gin.New()
	r.Use(middleware.FirebaseAuth(verifier))
	r.Use(middleware.RequireAdmin(adminQuerier))
	r.POST("/api/admin/invite", HandleInvite(&mockInviteQuerier{}))

	w := httptest.NewRecorder()
	req, _ := http.NewRequestWithContext(context.Background(), "POST", "/api/admin/invite", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}
