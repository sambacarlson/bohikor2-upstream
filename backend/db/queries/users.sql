-- name: GetUserByFirebaseUID :one
SELECT * FROM users WHERE firebase_uid = $1 LIMIT 1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1 LIMIT 1;

-- name: CreateUser :one
INSERT INTO users (
    email, email_verified, firebase_uid, full_name,
    phone_number, phone_verified, status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
) RETURNING *;

-- name: UpdateUserStatus :one
UPDATE users SET status = $2, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: UpdateTermsAcceptance :one
UPDATE users SET
    is_terms_accepted = $2,
    terms_accepted_at = $3,
    terms_version = $4,
    user_ip_at_consent = $5,
    updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: ListUsers :many
SELECT * FROM users
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;
