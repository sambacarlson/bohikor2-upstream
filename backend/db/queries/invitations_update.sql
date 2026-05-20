-- name: UpdateInvitationStatus :one
UPDATE invitations SET status = $1 WHERE id = $2 RETURNING *;
