# YCKF Admin Backend

## Overview
A Node.js + Express backend for the YCKF admin dashboard with secure authentication, role-based access control, and PostgreSQL database schema via Prisma.

## Project Brief Checklist
The current workspace already covers the core backend requirements for the YCKF 2026 internship brief. For a full project-status summary, see [../IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md).

## Setup
1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `ALLOWED_ORIGINS`.
3. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
4. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
5. Create database tables (using Prisma migrate or direct SQL):
   ```bash
   npx prisma db push
   ```
6. Start development server:
   ```bash
   npm run dev
   ```

## API Endpoints
- `POST /api/auth/register` - register new user
- `POST /api/auth/login` - login and receive JWT + refresh token
- `POST /api/auth/logout` - invalidate refresh token
- `POST /api/auth/logout-all` - invalidate all refresh tokens for the current user
- `POST /api/auth/change-password` - change the current user's password and invalidate all sessions
- `GET /api/csrf-token` - obtain CSRF token for state-changing requests
- `GET /api/auth/me` - current authenticated user
- `POST /api/auth/refresh` - refresh access token
- `GET /api/admin/users` - admin-only user list
- `POST /api/reports` - submit a new report
- `GET /api/reports` - list reports with filters
- `GET /api/reports/:id` - get report details
- `PUT /api/reports/:id` - update report (admin only)
- `DELETE /api/reports/:id` - delete report (admin only)
- `POST /api/cases` - create case from report (admin only)
- `GET /api/cases` - list cases
- `GET /api/cases/:id` - get case details
- `PUT /api/cases/:id/assign` - assign investigator (admin only)
- `PUT /api/cases/:id/status` - update case status
- `POST /api/cases/:id/notes` - add case investigation note
- `POST /api/evidence/upload` - upload evidence file
- `GET /api/evidence/case/:caseId` - list evidence for a case
- `GET /api/evidence/:id/download` - download evidence file
- `DELETE /api/evidence/:id` - delete evidence (admin only)
- `GET /api/evidence/:id/verify` - verify evidence file integrity
- `GET /api/dashboard/stats` - get dashboard statistics

## Security
- Password hashing with `bcryptjs` (salt rounds = 10)
- JWT access tokens expire after 1 hour, refresh tokens rotate on every refresh
- CSRF protection enabled with `csurf` and secure SameSite cookies
- Rate limiting configured for general API, login, report submission, and evidence uploads
- Role-based access control for `ADMIN`, `INVESTIGATOR`, and `USER`
- Row-level access enforcement so investigators only access assigned cases
- Sensitive investigation notes encrypted at rest with AES
- Error responses are generic in production to avoid leaking internal details
- Environment variables manage secrets and SSL connection parameters
- Audit logging for authenticated API requests and security events

## Database Schema Files
- `prisma/schema.prisma`
- `schema.sql`

## Notes
This backend is intentionally designed to be a secure core service for the YCKF mobile app admin dashboard. Push the repo to GitHub and do not commit `.env`.
