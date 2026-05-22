-- name: CreateEvent :one
INSERT INTO events (user_id, admin_id, event_type, metadata)
VALUES ($1, $2, $3, $4) RETURNING *;

-- name: ListEvents :many
SELECT * FROM events
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListEventsWithUser :many
SELECT e.*, u.email AS user_email
FROM events e
LEFT JOIN users u ON e.user_id = u.id
ORDER BY e.created_at DESC
LIMIT $1 OFFSET $2;