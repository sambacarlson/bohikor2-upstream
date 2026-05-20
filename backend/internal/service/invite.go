package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/Iknite-Space/bohikor2/db/sqlc"
)

var ErrActiveInvitationExists = errors.New("an active invitation already exists for this email")

type InviteStore interface {
	GetInvitationByEmail(ctx context.Context, email string) (db.Invitation, error)
	CreateInvitation(ctx context.Context, email string, invitedBy pgtype.UUID) (db.Invitation, error)
}

type AdminQuerier interface {
	GetAdminByFirebaseUID(ctx context.Context, firebaseUid string) (db.Admin, error)
}

type EmailSender interface {
	SendInvitation(ctx context.Context, email string) error
}

type InviteService struct {
	store   InviteStore
	email   EmailSender
	querier AdminQuerier
}

func NewInviteService(store InviteStore, email EmailSender, querier AdminQuerier) *InviteService {
	return &InviteService{
		store:   store,
		email:   email,
		querier: querier,
	}
}

type InviteResult struct {
	Invitation db.Invitation
}

func (s *InviteService) Invite(ctx context.Context, email string, invitedByFirebaseUID string) (*InviteResult, error) {
	admin, err := s.querier.GetAdminByFirebaseUID(ctx, invitedByFirebaseUID)
	if err != nil {
		return nil, fmt.Errorf("lookup admin: %w", err)
	}

	invitedBy := pgtype.UUID{Bytes: admin.ID, Valid: true}

	existing, err := s.store.GetInvitationByEmail(ctx, email)
	if err == nil {
		if existing.Status == db.InvitationStatusSent || existing.Status == db.InvitationStatusAccepted {
			return nil, ErrActiveInvitationExists
		}
	}

	invitation, err := s.store.CreateInvitation(ctx, email, invitedBy)
	if err != nil {
		return nil, fmt.Errorf("create invitation: %w", err)
	}

	if err := s.email.SendInvitation(ctx, email); err != nil {
		return nil, fmt.Errorf("send invitation email: %w", err)
	}

	return &InviteResult{Invitation: invitation}, nil
}

type RealInviteStore struct {
	queries *db.Queries
}

func NewRealInviteStore(queries *db.Queries) *RealInviteStore {
	return &RealInviteStore{queries: queries}
}

func (s *RealInviteStore) GetInvitationByEmail(ctx context.Context, email string) (db.Invitation, error) {
	return s.queries.GetInvitationByEmail(ctx, email)
}

func (s *RealInviteStore) CreateInvitation(ctx context.Context, email string, invitedBy pgtype.UUID) (db.Invitation, error) {
	return s.queries.CreateInvitation(ctx, db.CreateInvitationParams{
		Email:     email,
		Status:    db.InvitationStatusSent,
		InvitedBy: invitedBy,
		SentAt:    time.Now().UTC(),
	})
}
