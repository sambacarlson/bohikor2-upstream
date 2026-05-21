-- name: UpdateInvitationStatus :one
UPDATE invitations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *;
