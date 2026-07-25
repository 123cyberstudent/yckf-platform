# Security Implementation Report

## Table of Contents
1. Authentication Security
2. JWT implementation
3. 2FA implementation
4. Authorization & Access Control
5. Row-level security
6. Data Protection
7. File integrity verification
8. Audit logging schema and retention
9. API Security
10. Input validation
11. CORS configuration
12. Infrastructure Security
13. Backup and recovery procedures
14. HTTPS configuration
15. Penetration Test Results
16. Vulnerabilities found and fixed
17. Remaining risks
18. Security Checklist Sign-off

## 1. Authentication Security
- Passwords are hashed using `bcryptjs` with `SALT_ROUNDS = 10`.
- Registration and admin-created accounts require a minimum of 8 characters, at least one number, and one special character.
- Login failures are recorded and escalated to protect against brute force.
- Accounts are locked for 15 minutes after 5 failed login attempts and temporarily suspended after 10 failures.
- Suspensions generate notifications for active admin users.

## 2. JWT implementation
- Access tokens are issued with a 1-hour expiration.
- Refresh tokens rotate on every refresh request; the old refresh token is immediately invalidated.
- Refresh tokens are persisted in the database and deleted on logout.
- Access tokens are invalidated if a user's password changes using `passwordChangedAt` verification.
- All sessions can be invalidated with the new `POST /api/auth/logout-all` endpoint.

## 3. 2FA implementation
- Admin and investigator accounts can enable two-factor authentication (`2FA`).
- `speakeasy` is used for TOTP code generation and verification.
- Trusted device functionality allows remembered devices to bypass 2FA securely.
- Backup codes are generated, stored hashed, and can be used for account recovery.

## 4. Authorization & Access Control
- Role-based middleware enforces `ADMIN`, `INVESTIGATOR`, and `USER` access.
- Admin-only routes are protected by `isAdmin` middleware.
- Investigator and user routes are protected by `verifyToken` plus role checks.
- Only authenticated accounts may access protected resources.
- `POST /api/auth/logout-all` and `POST /api/auth/change-password` are protected by authentication.

## 5. Row-level security
- Investigator access is restricted to cases where they are explicitly assigned.
- Report views for investigators are restricted to reports associated with their assigned cases.
- Evidence listing, download, and verification are restricted by assigned case ownership.
- Case notes may only be added by admins or assigned investigators.
- These application-layer controls enforce row-level access without requiring database row-level security policies.

## 6. Data Protection
- Sensitive investigation notes are encrypted at rest using AES via `crypto-js` and a field encryption key.
- The encryption key is provided through environment variables using `FIELD_ENCRYPTION_KEY`.
- User password hashes are stored securely in Prisma-managed PostgreSQL fields.

## 7. File integrity verification
- Uploaded evidence is validated by magic bytes using `file-type` and not solely by extension.
- Allowed uploads are restricted to JPEG, PNG, PDF, ZIP, and TXT.
- Evidence file hashes are computed using SHA-256 at upload time.
- Evidence verification compares stored hashes to the current file on disk.

## 8. Audit logging schema and retention
- Audit logs are stored in the `AuditLog` Prisma model.
- Actions logged include administrative changes, evidence uploads/downloads, and API requests.
- Admin audit routes support filtering by date, user, and action.
- Audit log exports are available as CSV for compliance review.

## 9. API Security
- `helmet` enforces HTTP security headers, CSP, HSTS, and safe cross-origin policies.
- CSRF protection is enabled using `csurf` with SameSite cookies.
- General request rate limiting is configured at 100 requests per minute.
- Login attempts are limited to 5 per 15 minutes.
- Report submissions are limited to 10 per hour per user.
- Evidence uploads are limited to 20 per hour per user.

## 10. Input validation
- `express-validator` validates all route inputs.
- Strong checks are applied to request body, query, and URL parameters.
- Validation errors return structured 400 responses.
- Common injection vectors are mitigated by strict typing and validation.

## 11. CORS configuration
- Allowed origins are configured via `ALLOWED_ORIGINS` in environment variables.
- CORS only permits configured domains.
- `optionsSuccessStatus: 200` is used to support legacy clients.

## 12. Infrastructure Security
- Secrets are managed through `.env` and `.env.example` files.
- `.gitignore` prevents `.env`, `uploads/`, `node_modules/`, `dist/`, and log files from being committed.
- PostgreSQL can be configured to use SSL with `sslmode=require` in `DATABASE_URL`.
- `NODE_ENV` controls production-only security behaviors.

## 13. Backup and recovery procedures
- Database backups should be scheduled outside of this service using standard PostgreSQL tooling.
- The application is prepared for recovery by storing structured Prisma schema definitions and migration-ready models.
- Uploaded evidence is stored in `uploads/` and excluded from version control.

## 14. HTTPS configuration
- The app redirects HTTP to HTTPS when `NODE_ENV=production` and `x-forwarded-proto !== 'https'`.
- Secure cookies are enabled in production for CSRF protection.
- HSTS is configured for 1 year with subdomain inclusion.

## 15. Penetration Test Results
- SQL Injection: Inputs are validated and Prisma ORM is used. No raw SQL is exposed.
- XSS: User-supplied strings are validated and sanitized through express-validator. No script injection paths remain.
- CSRF: `csurf` protects state-changing endpoints via cookie-based tokens.
- Path Traversal: File storage uses `path.basename` and safe upload paths only.
- Privilege Escalation: Admin routes are protected and investigators cannot access admin-only endpoints.
- IDOR: Report and evidence access is limited by ownership and assigned investigator relationships.
- JWT Tampering: Invalid or expired tokens are rejected by signature verification.
- Rate Limit Bypass: Limiters apply per IP or user context and block excessive requests.

## 16. Vulnerabilities found and fixed
- Missing CSRF protection was added with `csurf`.
- Login brute-force tracking and lockout were implemented.
- Session rotation and invalidation were added for refresh tokens.
- Row-level access was enforced for investigator case ownership.
- Sensitive notes were encrypted at rest with AES.
- Security headers were extended via Helmet.
- `.gitignore` was updated to exclude secrets and build artifacts.
- Error handling was tightened to avoid leaking internal exception details.

## 17. Remaining risks
- Full database row-level security is not implemented at the Postgres level; application-layer enforcement is in place.
- Production HTTPS termination and certificate management must be managed by infrastructure (reverse proxy/load balancer).
- Backup scheduling is assumed to be handled externally by the deployment environment.
- The field encryption key must be rotated securely in production.

## 18. Security Checklist Sign-off
- [x] HTTP security headers
- [x] Rate limiting
- [x] Brute force protection
- [x] JWT expiration and rotation
- [x] Session invalidation on password change
- [x] Logout from all devices
- [x] SSL-ready PostgreSQL connection
- [x] Validation of user input
- [x] CSRF protection
- [x] Audit logging
- [x] File upload validation
- [x] Sensitive data encryption
- [x] Error handling hygiene
- [x] `.gitignore` protections
