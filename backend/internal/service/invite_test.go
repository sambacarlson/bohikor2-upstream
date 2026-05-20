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
	invitation *db.Invitation
	getErr     error
	createErr  error
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

func (m *mockStore) CreateInvitation(ctx context.Context, email string, invitedBy uuid.UUID) (db.Invitation, error) {
	if m.createErr != nil {
		return db.Invitation{}, m.createErr
	}
	uid := pgtype.UUID{}
	_ = uid.Scan(invitedBy)
	return db.Invitation{
		ID:        uuid.New(),
		Email:     email,
		Status:    db.InvitationStatusSent,
		InvitedBy: uid,
		SentAt:    time.Now().UTC(),
	}, nil
}

type mockEmailSender struct {
	sendErr error
}

func (m *mockEmailSender) SendInvitation(ctx context.Context, email string) error {
	return m.sendErr
}

func TestInvite_HappyPath(t *testing.T) {
	store := &mockStore{}
	emailSender := &mockEmailSender{}
	svc := NewInviteService(store, emailSender)

	adminID := uuid.New()
	result, err := svc.Invite(context.Background(), "newadmin@example.com", adminID)
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
}

func TestInvite_ActiveInvitationExists(t *testing.T) {
	store := &mockStore{
		invitation: &db.Invitation{
			Email:  "existing@example.com",
			Status: db.InvitationStatusSent,
		},
	}
	svc := NewInviteService(store, &mockEmailSender{})

	_, err := svc.Invite(context.Background(), "existing@example.com", uuid.New())
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
	svc := NewInviteService(store, &mockEmailSender{})

	_, err := svc.Invite(context.Background(), "accepted@example.com", uuid.New())
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
	svc := NewInviteService(store, emailSender)

	result, err := svc.Invite(context.Background(), "expired@example.com", uuid.New())
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
	svc := NewInviteService(store, emailSender)

	_, err := svc.Invite(context.Background(), "fail@example.com", uuid.New())
	if err == nil {
		t.Fatal("expected error when email send fails")
	}
}
