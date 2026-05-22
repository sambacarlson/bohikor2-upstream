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
	permanentToken string
	baseURL        string
	webhookSecret  string
	httpClient     *http.Client
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

func NewClient(permanentToken, baseURL, webhookSecret string) *Client {
	return &Client{
		permanentToken: permanentToken,
		baseURL:        baseURL,
		webhookSecret:  webhookSecret,
		httpClient:     &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) InitiateTransfer(ctx context.Context, phoneNumber string, amount decimal.Decimal, description string, externalRef string) (*TransferResponse, error) {
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
	req.Header.Set("Authorization", "Token "+c.permanentToken)

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
