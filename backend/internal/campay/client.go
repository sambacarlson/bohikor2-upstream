package campay

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/shopspring/decimal"
)

type Client struct {
	username      string
	password      string
	baseURL       string
	webhookSecret string
	httpClient    *http.Client
	accessToken   string
	tokenExpiry   time.Time
}

type TokenResponse struct {
	Token     string `json:"token"`
	ExpiresIn int    `json:"expires_in"`
}

type TransferRequest struct {
	Amount            decimal.Decimal `json:"amount"`
	To                string          `json:"to"`
	Description       string          `json:"description"`
	ExternalReference string          `json:"external_reference"`
}

type TransferResponse struct {
	Reference string `json:"reference"`
	Status    string `json:"status"`
	Message   string `json:"message,omitempty"`
}

type WebhookPayload struct {
	Reference string `json:"reference"`
	Status    string `json:"status"`
	Message   string `json:"message,omitempty"`
}

func NewClient(username, password, baseURL, webhookSecret string) *Client {
	return &Client{
		username:      username,
		password:      password,
		baseURL:       baseURL,
		webhookSecret: webhookSecret,
		httpClient:    &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) getToken(ctx context.Context) (string, error) {
	if c.accessToken != "" && time.Now().Before(c.tokenExpiry) {
		return c.accessToken, nil
	}

	payload := map[string]string{
		"username": c.username,
		"password": c.password,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("marshal token request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/token/", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("create token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("token request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read token response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token request failed: status=%d body=%s", resp.StatusCode, string(respBody))
	}

	var tr TokenResponse
	if err := json.Unmarshal(respBody, &tr); err != nil {
		return "", fmt.Errorf("unmarshal token response: %w", err)
	}

	if tr.Token == "" {
		return "", fmt.Errorf("empty token in response")
	}

	c.accessToken = tr.Token
	c.tokenExpiry = time.Now().Add(time.Duration(tr.ExpiresIn) * time.Second)

	return c.accessToken, nil
}

func (c *Client) InitiateTransfer(ctx context.Context, phoneNumber string, amount decimal.Decimal, description string, externalRef string) (*TransferResponse, error) {
	token, err := c.getToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("get token: %w", err)
	}

	transferReq := TransferRequest{
		Amount:            amount,
		To:                phoneNumber,
		Description:       description,
		ExternalReference: externalRef,
	}
	body, err := json.Marshal(transferReq)
	if err != nil {
		return nil, fmt.Errorf("marshal transfer request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/transfer/", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create transfer request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	slog.Info("campay transfer request",
		"phone", phoneNumber,
		"amount", amount.String(),
		"ref", externalRef,
	)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("transfer request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read transfer response: %w", err)
	}

	slog.Info("campay transfer response",
		"status", resp.StatusCode,
		"body", string(respBody),
	)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("transfer failed: status=%d body=%s", resp.StatusCode, string(respBody))
	}

	var tr TransferResponse
	if err := json.Unmarshal(respBody, &tr); err != nil {
		return nil, fmt.Errorf("unmarshal transfer response: %w", err)
	}

	if tr.Status == "failed" || tr.Status == "error" {
		return &tr, fmt.Errorf("transfer failed: %s", tr.Message)
	}

	return &tr, nil
}

func (c *Client) VerifyWebhook(payload []byte, signature string) bool {
	mac := hmac.New(sha256.New, []byte(c.webhookSecret))
	mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}
