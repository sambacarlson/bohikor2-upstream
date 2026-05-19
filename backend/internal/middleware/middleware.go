package middleware

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
)

func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		c.Next()

		latency := time.Since(start)
		slog.Info("request",
			"method", c.Request.Method,
			"path", path,
			"status", c.Writer.Status(),
			"latency_ms", latency.Milliseconds(),
			"ip", c.ClientIP(),
		)
	}
}

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateID()
		}
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

func generateID() string {
	return time.Now().Format("20060102150405.000000")
}
