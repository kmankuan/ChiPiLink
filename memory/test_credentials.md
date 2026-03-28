# Test Credentials

## Super Admin
- Email: teck@koh.one
- Password: Acdb##0897
- Role: Admin (is_admin: true)
- Login endpoint: POST /api/auth-v2/login
- Token field in response: `token`

## Notes
- Auth endpoint returns `token` (not `access_token`)
- Bearer token format required for Authorization header
- Admin guard: `is_admin: true` field in JWT payload
