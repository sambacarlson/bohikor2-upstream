package server

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
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/Iknite-Space/bohikor2/db/sqlc"
	"github.com/Iknite-Space/bohikor2/internal/handler"
	"github.com/Iknite-Space/bohikor2/internal/middleware"
	"github.com/Iknite-Space/bohikor2/internal/service"
)

var errNotFound = errors.New("not found")

type testAuthVerifier struct {
	token *auth.Token
	err   error
}

func (v *testAuthVerifier) VerifyIDToken(ctx context.Context, idToken string) (*auth.Token, error) {
	return v.token, v.err
}

type testQuerier struct {
	admin    *db.Admin
	adminErr error
	user     *db.User
	userErr  error
}

func (q *testQuerier) GetAdminByFirebaseUID(ctx context.Context, firebaseUid string) (db.Admin, error) {
	if q.adminErr != nil {
		return db.Admin{}, q.adminErr
	}
	if q.admin == nil {
		return db.Admin{}, errNotFound
	}
	return *q.admin, nil
}

func (q *testQuerier) GetUserByFirebaseUID(ctx context.Context, firebaseUid string) (db.User, error) {
	if q.userErr != nil {
		return db.User{}, q.userErr
	}
	if q.user == nil {
		return db.User{}, errNotFound
	}
	return *q.user, nil
}

func TestHealthHandler_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/health", healthHandler)

	w := httptest.NewRecorder()
	req, _ := http.NewRequestWithContext(context.Background(), "GET", "/health", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp["status"] != "ok" {
		t.Fatalf("expected status ok, got %s", resp["status"])
	}
}

func TestVerifyEndpoint_NoToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.FirebaseAuth(&testAuthVerifier{}))
	r.POST("/api/auth/verify", handleVerify(&testQuerier{}))

	w := httptest.NewRecorder()
	req, _ := http.NewRequestWithContext(context.Background(), "POST", "/api/auth/verify", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestAdminMeEndpoint_NotAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	verifier := &testAuthVerifier{
		token: &auth.Token{UID: "test-uid", AuthTime: time.Now().Unix()},
	}
	r.Use(middleware.FirebaseAuth(verifier))
	r.Use(middleware.RequireAdmin(&testQuerier{}))
	r.GET("/api/admin/me", handleAdminMe(&testQuerier{}))

	w := httptest.NewRecorder()
	req, _ := http.NewRequestWithContext(context.Background(), "GET", "/api/admin/me", nil)
	req.Header.Set("Authorization", "Bearer test-token")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestUserMeEndpoint_UserNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	verifier := &testAuthVerifier{
		token: &auth.Token{UID: "test-uid", AuthTime: time.Now().Unix()},
	}
	r.Use(middleware.FirebaseAuth(verifier))
	r.Use(middleware.RequireActiveUser(&testQuerier{}))
	r.GET("/api/users/me", handleUserMe(&testQuerier{}))

	w := httptest.NewRecorder()
	req, _ := http.NewRequestWithContext(context.Background(), "GET", "/api/users/me", nil)
	req.Header.Set("Authorization", "Bearer test-token")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestUserMeEndpoint_SuspendedUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	q := &testQuerier{
		user: &db.User{
			ID: uuid.New(), FirebaseUid: "test-uid",
			Status: db.UserStatusSuspended,
		},
	}
	verifier := &testAuthVerifier{
		token: &auth.Token{UID: "test-uid", AuthTime: time.Now().Unix()},
	}
	r := gin.New()
	r.Use(middleware.FirebaseAuth(verifier))
	r.Use(middleware.RequireActiveUser(q))
	r.GET("/api/users/me", handleUserMe(q))

	w := httptest.NewRecorder()
	req, _ := http.NewRequestWithContext(context.Background(), "GET", "/api/users/me", nil)
	req.Header.Set("Authorization", "Bearer test-token")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestUserMeEndpoint_ActiveUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	userID := uuid.New()
	q := &testQuerier{
		user: &db.User{
			ID: userID, FirebaseUid: "test-uid", Email: "user@test.com",
			Status: db.UserStatusActive,
		},
	}
	verifier := &testAuthVerifier{
		token: &auth.Token{UID: "test-uid", AuthTime: time.Now().Unix()},
	}
	r := gin.New()
	r.Use(middleware.FirebaseAuth(verifier))
	r.Use(middleware.RequireActiveUser(q))
	r.GET("/api/users/me", handleUserMe(q))

	w := httptest.NewRecorder()
	req, _ := http.NewRequestWithContext(context.Background(), "GET", "/api/users/me", nil)
	req.Header.Set("Authorization", "Bearer test-token")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	data, ok := resp["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %v", resp["data"])
	}
	if data["firebase_uid"] != "test-uid" {
		t.Fatalf("expected firebase_uid test-uid, got %v", data["firebase_uid"])
	}
}

type mockInviteStore struct {
	email      string
	invitation *db.Invitation
	getErr     error
	createErr  error
}

func (m *mockInviteStore) GetInvitationByEmail(ctx context.Context, email string) (db.Invitation, error) {
	if m.getErr != nil {
		return db.Invitation{}, m.getErr
	}
	if m.invitation == nil || m.email != email {
		return db.Invitation{}, errNotFound
	}
	return *m.invitation, nil
}

func (m *mockInviteStore) CreateInvitation(ctx context.Context, email string, invitedBy pgtype.UUID) (db.Invitation, error) {
	if m.createErr != nil {
		return db.Invitation{}, m.createErr
	}
	if m.invitation != nil {
		return *m.invitation, nil
	}
	return db.Invitation{
		ID:     uuid.New(),
		Email:  email,
		Status: db.InvitationStatusSent,
		SentAt: time.Now().UTC(),
	}, nil
}

type mockEmailSender struct {
	sendErr error
}

func (m *mockEmailSender) SendInvitation(ctx context.Context, email string) error {
	return m.sendErr
}

func TestInviteEndpoint_AdminInvites(t *testing.T) {
	gin.SetMode(gin.TestMode)
	adminID := uuid.New()
	verifier := &testAuthVerifier{
		token: &auth.Token{UID: adminID.String(), AuthTime: time.Now().Unix()},
	}
	adminQuerier := &testQuerier{
		admin: &db.Admin{
			ID:          uuid.New(),
			Email:       "admin@example.com",
			FirebaseUid: adminID.String(),
		},
	}
	inviteStore := &mockInviteStore{
		invitation: nil,
	}
	emailSender := &mockEmailSender{}
	inviteSvc := service.NewInviteService(inviteStore, emailSender, adminQuerier)

	r := gin.New()
	r.Use(middleware.FirebaseAuth(verifier))
	r.Use(middleware.RequireAdmin(adminQuerier))
	r.POST("/api/admin/invite", handler.HandleInvite(inviteSvc))

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
}

func TestInviteEndpoint_DuplicateInvitation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	adminID := uuid.New()
	verifier := &testAuthVerifier{
		token: &auth.Token{UID: adminID.String(), AuthTime: time.Now().Unix()},
	}
	adminQuerier := &testQuerier{
		admin: &db.Admin{
			ID:          uuid.New(),
			Email:       "admin@example.com",
			FirebaseUid: adminID.String(),
		},
	}
	inviteStore := &mockInviteStore{
		email: "existing@example.com",
		invitation: &db.Invitation{
			Email:  "existing@example.com",
			Status: db.InvitationStatusSent,
		},
	}
	inviteSvc := service.NewInviteService(inviteStore, &mockEmailSender{}, adminQuerier)

	r := gin.New()
	r.Use(middleware.FirebaseAuth(verifier))
	r.Use(middleware.RequireAdmin(adminQuerier))
	r.POST("/api/admin/invite", handler.HandleInvite(inviteSvc))

	w := httptest.NewRecorder()
	req, _ := http.NewRequestWithContext(context.Background(), "POST", "/api/admin/invite", strings.NewReader(`{"email":"existing@example.com"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d", w.Code)
	}
}
