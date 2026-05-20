package server

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	db "github.com/Iknite-Space/bohikor2/db/sqlc"
)

type authQuerier interface {
	GetUserByFirebaseUID(ctx context.Context, firebaseUid string) (db.User, error)
}

type adminQuerier interface {
	GetAdminByFirebaseUID(ctx context.Context, firebaseUid string) (db.Admin, error)
}

func handleVerify(q authQuerier) gin.HandlerFunc {
	return func(c *gin.Context) {
		firebaseUID := c.GetString("firebase_uid")

		user, err := q.GetUserByFirebaseUID(c.Request.Context(), firebaseUID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "user not found",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data": user,
		})
	}
}

func handleAdminMe(q adminQuerier) gin.HandlerFunc {
	return func(c *gin.Context) {
		firebaseUID := c.GetString("firebase_uid")

		admin, err := q.GetAdminByFirebaseUID(c.Request.Context(), firebaseUID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "admin not found",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data": admin,
		})
	}
}

func handleUserMe(q authQuerier) gin.HandlerFunc {
	return func(c *gin.Context) {
		firebaseUID := c.GetString("firebase_uid")

		user, err := q.GetUserByFirebaseUID(c.Request.Context(), firebaseUID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "user not found",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data": user,
		})
	}
}
