package middleware

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	db "github.com/Iknite-Space/bohikor2/db/sqlc"
)

type Querier interface {
	GetAdminByFirebaseUID(ctx context.Context, firebaseUid string) (db.Admin, error)
	GetUserByFirebaseUID(ctx context.Context, firebaseUid string) (db.User, error)
}

func RequireAdmin(q Querier) gin.HandlerFunc {
	return func(c *gin.Context) {
		firebaseUID := c.GetString("firebase_uid")
		if firebaseUID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "unauthenticated",
			})
			return
		}

		_, err := q.GetAdminByFirebaseUID(c.Request.Context(), firebaseUID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "admin access required",
			})
			return
		}

		c.Next()
	}
}

func RequireActiveUser(q Querier) gin.HandlerFunc {
	return func(c *gin.Context) {
		firebaseUID := c.GetString("firebase_uid")
		if firebaseUID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "unauthenticated",
			})
			return
		}

		user, err := q.GetUserByFirebaseUID(c.Request.Context(), firebaseUID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{
				"error": "user not found",
			})
			return
		}

		if user.Status == db.UserStatusSuspended {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "account suspended",
			})
			return
		}

		c.Set("user_id", user.ID)
		c.Set("user_email", user.Email)
		c.Next()
	}
}
