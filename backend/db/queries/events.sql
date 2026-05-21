-- name: CreateEvent :one
INSERT INTO events (user_id, admin_id, event_type, metadata)
VALUES ($1, $2, $3, $4) RETURNING *;