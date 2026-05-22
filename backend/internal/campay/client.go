package campay

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v4"
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
	Reference         string  `json:"reference"`
	Status            string  `json:"status"`
	Message           string  `json:"message,omitempty"`
	Amount            float64 `json:"amount,omitempty"`
	Currency          string  `json:"currency,omitempty"`
	Operator          string  `json:"operator,omitempty"`
	Code              string  `json:"code,omitempty"`
	OperatorReference string  `json:"operator_reference,omitempty"`
}

type WebhookPayload struct {
	Reference         string `json:"reference"`
	Status            string `json:"status"`
	Amount            string `json:"amount"`
	Currency          string `json:"currency"`
	Operator          string `json:"operator"`
	Code              string `json:"code"`
	OperatorReference string `json:"operator_reference"`
	Endpoint          string `json:"endpoint"`
	Signature         string `json:"signature"`
	ExternalReference string `json:"external_reference"`
	PhoneNumber       string `json:"phone_number"`
	Description       string `json:"description"`
	Reason            string `json:"reason"`
}

type campayClaims struct {
	jwt.StandardClaims
	Source string `json:"source"`
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

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/withdraw/", bytes.NewReader(body))
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

	if tr.Status == "FAILED" {
		return &tr, fmt.Errorf("transfer failed: %s", tr.Message)
	}

	return &tr, nil
}

func (c *Client) VerifyWebhook(token string) bool {
	claims := &campayClaims{}
	_, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(c.webhookSecret), nil
	})
	if err != nil {
		slog.Warn("webhook JWT verification failed", "error", err)
		return false
	}
	if claims.Source != "CamPay" {
		slog.Warn("webhook invalid source claim", "source", claims.Source)
		return false
	}
	return true
}
