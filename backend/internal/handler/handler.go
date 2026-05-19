package handler

import (
	"github.com/gin-gonic/gin"
)

type ErrorResponse struct {
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
	Details any    `json:"details,omitempty"`
}

func JSONError(c *gin.Context, status int, code, message string, details ...any) {
	resp := ErrorResponse{
		Error: message,
		Code:  code,
	}
	if len(details) > 0 {
		resp.Details = details[0]
	}
	c.JSON(status, resp)
}

func JSONSuccess(c *gin.Context, status int, data any) {
	c.JSON(status, gin.H{"data": data})
}

func JSONOK(c *gin.Context, status int) {
	c.JSON(status, gin.H{"status": "ok"})
}
