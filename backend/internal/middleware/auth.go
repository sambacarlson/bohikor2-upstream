package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"firebase.google.com/go/v4/auth"
	"github.com/gin-gonic/gin"
)

const sessionMaxAge = 30 * 24 * time.Hour

type AuthVerifier interface {
	VerifyIDToken(ctx context.Context, idToken string) (*auth.Token, error)
}

func FirebaseAuth(verifier AuthVerifier) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "missing authorization header",
			})
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token == authHeader {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid authorization format, expected Bearer <token>",
			})
			return
		}

		idToken, err := verifier.VerifyIDToken(c.Request.Context(), token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid token",
			})
			return
		}

		authTimeUnix := time.Unix(idToken.AuthTime, 0)
		if time.Since(authTimeUnix) > sessionMaxAge {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":           "session_expired",
				"reauth_required": true,
			})
			return
		}

		c.Set("firebase_uid", idToken.UID)
		if email, ok := idToken.Claims["email"].(string); ok {
			c.Set("email", email)
		}
		if phone, ok := idToken.Claims["phone_number"].(string); ok {
			c.Set("phone_number", phone)
		}

		c.Next()
	}
}
