-- name: ListInvitations :many
SELECT * FROM invitations ORDER BY sent_at DESC;
