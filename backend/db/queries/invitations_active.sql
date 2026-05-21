-- name: GetActiveInvitationByEmail :one
SELECT * FROM invitations
WHERE email = $1 AND status IN ('pending', 'sent', 'accepted')
LIMIT 1;
