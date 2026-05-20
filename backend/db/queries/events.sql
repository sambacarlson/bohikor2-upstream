-- name: CreateEvent :one
INSERT INTO events (user_id, admin_id, event_type, metadata)
VALUES ($1, $2, $3, $4) RETURNING *;

-- name: ListEvents :many
SELECT * FROM events
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListEventsByEventType :many
SELECT * FROM events
WHERE event_type = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
