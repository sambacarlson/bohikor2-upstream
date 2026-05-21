-- name: CreateEmailOTP :one
INSERT INTO email_otps (email, code, expires_at)
VALUES ($1, $2, $3) RETURNING *;

-- name: GetEmailOTPByEmail :one
SELECT * FROM email_otps WHERE email = $1 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1;

-- name: DeleteEmailOTP :exec
DELETE FROM email_otps WHERE email = $1;

-- name: CleanupExpiredOTPs :exec
DELETE FROM email_otps WHERE expires_at < NOW();
