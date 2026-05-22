package handler

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	db "github.com/Iknite-Space/bohikor2/db/sqlc"
)

type eventsQuerier interface {
	ListEventsWithUser(ctx context.Context, arg db.ListEventsWithUserParams) ([]db.ListEventsWithUserRow, error)
}

func HandleListEvents(q eventsQuerier) gin.HandlerFunc {
	return func(c *gin.Context) {
		page := 1
		perPage := 50

		events, err := q.ListEventsWithUser(c.Request.Context(), db.ListEventsWithUserParams{
			Limit:  int32(perPage),
			Offset: int32((page - 1) * perPage),
		})
		if err != nil {
			slog.Error("list events", "error", err)
			JSONError(c, http.StatusInternalServerError, "internal_error", "failed to list events")
			return
		}

		if events == nil {
			events = []db.ListEventsWithUserRow{}
		}

		JSONSuccess(c, http.StatusOK, events)
	}
}
