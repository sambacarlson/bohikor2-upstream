package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	db "github.com/Iknite-Space/bohikor2/db/sqlc"
)

type invitationsQuerier interface {
	ListInvitations(ctx context.Context) ([]db.Invitation, error)
}

func HandleListInvitations(q invitationsQuerier) gin.HandlerFunc {
	return func(c *gin.Context) {
		invitations, err := q.ListInvitations(c.Request.Context())
		if err != nil {
			JSONError(c, http.StatusInternalServerError, "internal_error", "failed to list invitations")
			return
		}

		if invitations == nil {
			invitations = []db.Invitation{}
		}

		JSONSuccess(c, http.StatusOK, invitations)
	}
}
