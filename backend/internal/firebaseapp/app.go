package firebaseapp

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
)

type Client struct {
	Auth *auth.Client
}

func NewClient(ctx context.Context, credentialsJSON, projectID string) (*Client, error) {
	if credentialsJSON == "" {
		return nil, fmt.Errorf("firebase credentials JSON is empty")
	}

	// Validate JSON structure
	var creds map[string]any
	if err := json.Unmarshal([]byte(credentialsJSON), &creds); err != nil {
		return nil, fmt.Errorf("parse firebase credentials JSON: %w", err)
	}

	// Check for required fields
	requiredFields := []string{"type", "project_id", "private_key", "client_email"}
	for _, field := range requiredFields {
		if _, ok := creds[field]; !ok {
			return nil, fmt.Errorf("missing required firebase credential field: %s", field)
		}
	}

	// Write credentials to temp file and set GOOGLE_APPLICATION_CREDENTIALS
	// This avoids deprecated option.WithCredentialsJSON/File.
	// The temp file persists for the lifetime of the process — never defer-clean it here
	// because other parts of the Firebase SDK may re-read credentials (e.g. token refresh).
	tmpFile, err := os.CreateTemp("", "firebase-creds-*.json")
	if err != nil {
		return nil, fmt.Errorf("create temp credentials file: %w", err)
	}
	tmpPath := tmpFile.Name()

	if _, err := tmpFile.WriteString(credentialsJSON); err != nil {
		_ = tmpFile.Close()
		return nil, fmt.Errorf("write temp credentials file: %w", err)
	}
	if err := tmpFile.Close(); err != nil {
		return nil, fmt.Errorf("close temp credentials file: %w", err)
	}

	if err := os.Setenv("GOOGLE_APPLICATION_CREDENTIALS", tmpPath); err != nil {
		return nil, fmt.Errorf("set GOOGLE_APPLICATION_CREDENTIALS: %w", err)
	}

	app, err := firebase.NewApp(ctx, &firebase.Config{
		ProjectID: projectID,
	})
	if err != nil {
		return nil, fmt.Errorf("initialize firebase app: %w", err)
	}

	authClient, err := app.Auth(ctx)
	if err != nil {
		return nil, fmt.Errorf("initialize firebase auth client: %w", err)
	}

	return &Client{Auth: authClient}, nil
}
