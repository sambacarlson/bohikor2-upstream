package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/Iknite-Space/bohikor2/db/sqlc"
)

var errTestNotFound = errors.New("not found")
var errTestSendFailed = errors.New("send failed")

type mockStore struct {
	invitation    *db.Invitation
	getErr        error
	createErr     error
	updateErr     error
	updatedID     *pgtype.UUID
	updatedStatus *db.InvitationStatus
	createdEmail  string
}

func (m *mockStore) GetInvitationByEmail(ctx context.Context, email string) (db.Invitation, error) {
	if m.getErr != nil {
		return db.Invitation{}, m.getErr
	}
	if m.invitation == nil {
		return db.Invitation{}, errTestNotFound
	}
	return *m.invitation, nil
}

func (m *mockStore) CreateInvitation(ctx context.Context, email string, invitedBy pgtype.UUID) (db.Invitation, error) {
	if m.createErr != nil {
		return db.Invitation{}, m.createErr
	}
	m.createdEmail = email
	return db.Invitation{
		ID:        uuid.New(),
		Email:     email,
		Status:    db.InvitationStatusPending,
		InvitedBy: invitedBy,
		SentAt:    time.Now().UTC(),
	}, nil
}

func (m *mockStore) UpdateInvitationStatus(ctx context.Context, status db.InvitationStatus, id pgtype.UUID) (db.Invitation, error) {
	if m.updateErr != nil {
		return db.Invitation{}, m.updateErr
	}
	m.updatedID = &id
	m.updatedStatus = &status
	uid := uuid.UUID(id.Bytes)
	return db.Invitation{
		ID:     uid,
		Email:  m.createdEmail,
		Status: status,
	}, nil
}

type mockEmailSender struct {
	sendErr error
}

func (m *mockEmailSender) SendInvitation(ctx context.Context, email string) error {
	return m.sendErr
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
		return db.Admin{}, errTestNotFound
	}
	return *m.admin, nil
}

func TestInvite_HappyPath(t *testing.T) {
	store := &mockStore{}
	emailSender := &mockEmailSender{}
	adminQuerier := &mockAdminQuerier{
		admin: &db.Admin{
			ID:          uuid.New(),
			Email:       "admin@example.com",
			FirebaseUid: "firebase-uid-123",
		},
	}
	svc := NewInviteService(store, emailSender, adminQuerier)

	result, err := svc.Invite(context.Background(), "newadmin@example.com", "firebase-uid-123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if result.Invitation.Email != "newadmin@example.com" {
		t.Fatalf("expected email newadmin@example.com, got %s", result.Invitation.Email)
	}
	if result.Invitation.Status != db.InvitationStatusSent {
		t.Fatalf("expected status sent, got %s", result.Invitation.Status)
	}
	if store.updatedStatus == nil || *store.updatedStatus != db.InvitationStatusSent {
		t.Fatal("expected status to be updated to sent")
	}
}

func TestInvite_ActiveInvitationExists(t *testing.T) {
	store := &mockStore{
		invitation: &db.Invitation{
			Email:  "existing@example.com",
			Status: db.InvitationStatusSent,
		},
	}
	adminQuerier := &mockAdminQuerier{
		admin: &db.Admin{ID: uuid.New(), FirebaseUid: "firebase-uid-123"},
	}
	svc := NewInviteService(store, &mockEmailSender{}, adminQuerier)

	_, err := svc.Invite(context.Background(), "existing@example.com", "firebase-uid-123")
	if err == nil {
		t.Fatal("expected error for active invitation")
	}
	if !errors.Is(err, ErrActiveInvitationExists) {
		t.Fatalf("expected ErrActiveInvitationExists, got %v", err)
	}
}

func TestInvite_AcceptedInvitationExists(t *testing.T) {
	store := &mockStore{
		invitation: &db.Invitation{
			Email:  "accepted@example.com",
			Status: db.InvitationStatusAccepted,
		},
	}
	adminQuerier := &mockAdminQuerier{
		admin: &db.Admin{ID: uuid.New(), FirebaseUid: "firebase-uid-123"},
	}
	svc := NewInviteService(store, &mockEmailSender{}, adminQuerier)

	_, err := svc.Invite(context.Background(), "accepted@example.com", "firebase-uid-123")
	if err == nil {
		t.Fatal("expected error for accepted invitation")
	}
	if !errors.Is(err, ErrActiveInvitationExists) {
		t.Fatalf("expected ErrActiveInvitationExists, got %v", err)
	}
}

func TestInvite_ReinviteAfterExpiry(t *testing.T) {
	store := &mockStore{
		invitation: &db.Invitation{
			Email:  "expired@example.com",
			Status: db.InvitationStatusExpired,
		},
	}
	emailSender := &mockEmailSender{}
	adminQuerier := &mockAdminQuerier{
		admin: &db.Admin{ID: uuid.New(), FirebaseUid: "firebase-uid-123"},
	}
	svc := NewInviteService(store, emailSender, adminQuerier)

	result, err := svc.Invite(context.Background(), "expired@example.com", "firebase-uid-123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected result, got nil")
	}
}

func TestInvite_EmailSendFails(t *testing.T) {
	store := &mockStore{}
	emailSender := &mockEmailSender{sendErr: errTestSendFailed}
	adminQuerier := &mockAdminQuerier{
		admin: &db.Admin{ID: uuid.New(), FirebaseUid: "firebase-uid-123"},
	}
	svc := NewInviteService(store, emailSender, adminQuerier)

	_, err := svc.Invite(context.Background(), "fail@example.com", "firebase-uid-123")
	if err == nil {
		t.Fatal("expected error when email send fails")
	}
	if store.updatedStatus == nil || *store.updatedStatus != db.InvitationStatusFailed {
		t.Fatal("expected status to be updated to failed")
	}
}

func TestInvite_AdminNotFound(t *testing.T) {
	store := &mockStore{}
	adminQuerier := &mockAdminQuerier{adminErr: errTestNotFound}
	svc := NewInviteService(store, &mockEmailSender{}, adminQuerier)

	_, err := svc.Invite(context.Background(), "newadmin@example.com", "unknown-firebase-uid")
	if err == nil {
		t.Fatal("expected error when admin not found")
	}
}
