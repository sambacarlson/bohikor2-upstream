package handler

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/Iknite-Space/bohikor2/db/sqlc"
	"github.com/Iknite-Space/bohikor2/internal/email"
)

type AuthHandler struct {
	queries *db.Queries
	email   *email.Client
}

func NewAuthHandler(queries *db.Queries, email *email.Client) *AuthHandler {
	return &AuthHandler{queries: queries, email: email}
}

// CheckInvitation checks if an email has an active invitation.
func (h *AuthHandler) CheckInvitation(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		JSONError(c, http.StatusBadRequest, "missing_email", "email query parameter is required")
		return
	}

	invitation, err := h.queries.GetActiveInvitationByEmail(c.Request.Context(), email)
	if err != nil {
		JSONError(c, http.StatusNotFound, "no_invitation", "No invitation found for this email. Contact your manager.")
		return
	}

	JSONSuccess(c, http.StatusOK, gin.H{
		"has_invitation": true,
		"status":         string(invitation.Status),
	})
}

// SendEmailOTP generates and sends an email OTP.
func (h *AuthHandler) SendEmailOTP(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		JSONError(c, http.StatusBadRequest, "invalid_request", "email is required")
		return
	}

	invitation, err := h.queries.GetActiveInvitationByEmail(c.Request.Context(), req.Email)
	if err != nil {
		JSONError(c, http.StatusNotFound, "no_invitation", "No invitation found for this email. Contact your manager.")
		return
	}
	if invitation.Status != db.InvitationStatusPending && invitation.Status != db.InvitationStatusSent {
		JSONError(c, http.StatusForbidden, "invitation_not_active", "Invitation is no longer active")
		return
	}

	code, err := generateOTP()
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "otp_generation_failed", "Failed to generate OTP")
		return
	}

	expiresAt := time.Now().UTC().Add(10 * time.Minute)
	_, err = h.queries.CreateEmailOTP(c.Request.Context(), db.CreateEmailOTPParams{
		Email:     req.Email,
		Code:      code,
		ExpiresAt: expiresAt,
	})
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "store_otp_failed", "Failed to store OTP")
		return
	}

	if err := h.email.SendOTP(c.Request.Context(), req.Email, code); err != nil {
		JSONError(c, http.StatusInternalServerError, "send_otp_failed", "Failed to send OTP email")
		return
	}

	JSONOK(c, http.StatusOK)
}

// VerifyEmailOTP verifies the email OTP code.
func (h *AuthHandler) VerifyEmailOTP(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
		Code  string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		JSONError(c, http.StatusBadRequest, "invalid_request", "email and code are required")
		return
	}

	storedOTP, err := h.queries.GetEmailOTPByEmail(c.Request.Context(), req.Email)
	if err != nil {
		JSONError(c, http.StatusBadRequest, "invalid_otp", "Invalid or expired OTP")
		return
	}

	if storedOTP.Code != req.Code {
		JSONError(c, http.StatusBadRequest, "invalid_otp", "Invalid OTP code")
		return
	}

	if err := h.queries.DeleteEmailOTP(c.Request.Context(), req.Email); err != nil {
		JSONError(c, http.StatusInternalServerError, "cleanup_failed", "Failed to cleanup OTP")
		return
	}

	if _, err := h.queries.AcceptInvitation(c.Request.Context(), req.Email); err != nil {
		JSONError(c, http.StatusInternalServerError, "accept_invitation_failed", "Failed to accept invitation")
		return
	}

	JSONOK(c, http.StatusOK)
}

// VerifyPhoneOTP verifies the phone OTP and creates the user.
func (h *AuthHandler) VerifyPhoneOTP(c *gin.Context) {
	firebaseUID, ok := c.Get("firebase_uid")
	if !ok {
		JSONError(c, http.StatusUnauthorized, "unauthorized", "Firebase UID not found in context")
		return
	}

	emailVal, ok := c.Get("email")
	if !ok {
		JSONError(c, http.StatusBadRequest, "missing_email", "Email not found in Firebase token")
		return
	}
	email := emailVal.(string)

	var req struct {
		PhoneNumber string `json:"phone_number" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		JSONError(c, http.StatusBadRequest, "invalid_request", "phone_number is required")
		return
	}

	ctx := c.Request.Context()

	existingUser, err := h.queries.GetUserByFirebaseUID(ctx, firebaseUID.(string))
	if err == nil {
		JSONSuccess(c, http.StatusOK, existingUser)
		return
	}

	_, err = h.queries.GetUserByEmail(ctx, email)
	if err == nil {
		JSONError(c, http.StatusConflict, "user_exists", "User already exists with this email")
		return
	}

	invitation, err := h.queries.GetActiveInvitationByEmail(ctx, email)
	if err != nil {
		JSONError(c, http.StatusForbidden, "no_invitation", "No active invitation found")
		return
	}

	invitedBy := pgtype.UUID{Valid: true}
	if invitation.InvitedBy.Valid {
		invitedBy.Bytes = invitation.InvitedBy.Bytes
	}

	user, err := h.queries.CreateUser(ctx, db.CreateUserParams{
		Email:         email,
		EmailVerified: true,
		FirebaseUid:   firebaseUID.(string),
		PhoneNumber:   req.PhoneNumber,
		PhoneVerified: true,
		Status:        db.UserStatusActive,
	})
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "create_user_failed", "Failed to create user")
		return
	}

	if _, err := h.queries.AcceptInvitation(ctx, email); err != nil {
		JSONError(c, http.StatusInternalServerError, "accept_invitation_failed", "Failed to accept invitation")
		return
	}

	metadata, _ := json.Marshal(map[string]string{"source": "mobile"})
	_, _ = h.queries.CreateEvent(ctx, db.CreateEventParams{
		UserID:    pgtype.UUID{Bytes: user.ID, Valid: true},
		EventType: "signup_completed",
		Metadata:  metadata,
	})

	JSONSuccess(c, http.StatusCreated, user)
}

func generateOTP() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", fmt.Errorf("generate random OTP: %w", err)
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}
