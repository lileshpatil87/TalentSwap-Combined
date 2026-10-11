# BE-03 — Users

Owns account-state operations on `users`. Authentication remains owned by `auth`; profile, wallet and skill data are never accessed directly.

Routes: `GET /api/v1/users/:id`, `PATCH /api/v1/users/:id`, `DELETE /api/v1/users/:id`.

Mutations require authentication. Self-service may change email; administrators may also change role, verification and ban state.
