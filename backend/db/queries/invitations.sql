-- name: GetInvitationByEmail :one
SELECT * FROM invitations WHERE email = $1 LIMIT 1;

-- name: CreateInvitation :one
INSERT INTO invitations (email, invited_by, sent_at)
VALUES ($1, $2, $3) RETURNING *;

-- name: AcceptInvitation :one
UPDATE invitations SET status = 'accepted', accepted_at = NOW()
WHERE email = $1 RETURNING *;
