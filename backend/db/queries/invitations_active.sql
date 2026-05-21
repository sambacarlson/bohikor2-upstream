-- name: GetActiveInvitationByEmail :one
SELECT * FROM invitations
WHERE email = $1 AND status IN ('pending', 'sent')
LIMIT 1;
