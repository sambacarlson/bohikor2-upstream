-- name: GetAdminByFirebaseUID :one
SELECT * FROM admins WHERE firebase_uid = $1 LIMIT 1;

-- name: CreateAdmin :one
INSERT INTO admins (email, firebase_uid)
VALUES ($1, $2) RETURNING *;
