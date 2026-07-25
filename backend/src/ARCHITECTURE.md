# Backend Architecture - Modular Domain-Driven Structure

## Overview
The backend has been reorganized into a modular, domain-driven architecture. Each domain (auth, users, incidents, etc.) is self-contained with its own routes, services, and middleware where applicable.

## Directory Structure

```
src/
├── auth/                 # Authentication and authorization
│   ├── middleware.ts     # Auth middleware (verifyToken, isAdmin, isInvestigator)
│   ├── routes.ts         # Auth endpoints
│   ├── service.ts        # Auth service (login, register, tokens, etc.)
│   └── twoFactor.ts      # Two-factor authentication logic
│
├── users/                # User management
│   └── routes.ts         # User CRUD endpoints
│
├── incidents/            # Case/Incident management
│   └── routes.ts         # Incident endpoints
│
├── investigators/        # Investigator management
│   └── routes.ts         # Investigator specific endpoints (placeholder)
│
├── evidence/             # Evidence management
│   ├── retention.ts      # Evidence retention and archival logic
│   └── routes.ts         # Evidence upload, download, export endpoints
│
├── notifications/        # Notification system
│   ├── service.ts        # Notification creation and management
│   └── routes.ts         # Notification endpoints
│
├── analytics/            # Dashboard and analytics
│   └── routes.ts         # Stats, charts, exports endpoints
│
├── audit/                # Audit logging
│   ├── middleware.ts     # Audit logging middleware
│   ├── routes.ts         # Audit log endpoints
│   └── service.ts        # Audit logging service
│
├── shared/               # Shared utilities and services
│   ├── db.ts             # Prisma client
│   ├── cache.ts          # Redis cache
│   ├── encryption.ts     # Field encryption/decryption
│   ├── file.ts           # File upload utilities
│   ├── rateLimiter.ts    # Rate limiting middleware
│   └── socket.ts         # WebSocket/Socket.io
│
├── utils/                # Global utilities
│   └── validators.ts     # Express-validator helpers
│
├── middleware/           # (Deprecated - see auth/ and audit/)
├── routes/               # (Deprecated - files migrated to domains)
├── services/             # (Deprecated - see respective domains)
│
├── app.ts                # Express app configuration
└── index.ts              # Server entry point
```

## Migration Guide

### Import Updates
When importing from the old structure, update references as follows:

**Old:**
```typescript
import { verifyToken } from '../middleware/auth.js';
import { loginUser } from '../services/authService.js';
import { logAudit } from '../services/auditService.js';
import { prisma } from '../services/db.js';
```

**New:**
```typescript
import { verifyToken } from '../auth/middleware.js';
import { loginUser } from '../auth/service.js';
import { logAudit } from '../audit/service.js';
import { prisma } from '../shared/db.js';
```

### Route Registration
Routes are now registered by domain:
- `/api/auth` - Authentication
- `/api/users` - User management & audit logs
- `/api/incidents` - Cases/Incidents
- `/api/evidence` - Evidence management
- `/api/notifications` - Notifications
- `/api/analytics` - Analytics & reports
- `/api/audit` - Audit logs (admin only)

## Key Changes

1. **Shared Services** - Common services (db, cache, encryption, file operations, rate limiting) are in `shared/` for easy cross-domain access.

2. **Self-Contained Domains** - Each domain has its own routes and services where applicable, making it easier to understand and maintain.

3. **Middleware Organization** - Authentication middleware is in `auth/` and audit middleware is in `audit/` for better organization.

4. **Socket.io Integration** - WebSocket functionality is now in `shared/socket.ts` and initialized in `index.ts`.

5. **Evidence Retention** - Evidence lifecycle management (retention, archival) is in `evidence/retention.ts`.

6. **Backward Compatibility** - Old structure folders are still present but deprecated. Update imports to use new locations.

## Adding New Domains

To add a new domain:

1. Create a new folder: `src/[domain-name]/`
2. Add `routes.ts` for endpoints
3. Add `service.ts` if domain logic is complex
4. Add `middleware.ts` if domain-specific middleware is needed
5. Register routes in `app.ts`

Example:
```typescript
// src/[domain-name]/routes.ts
import { Router } from 'express';
import { verifyToken } from '../auth/middleware.js';

const router = Router();
// Add your routes...
export default router;
```

Then in `app.ts`:
```typescript
import domainRouter from './[domain-name]/routes.js';
app.use('/api/[domain-name]', domainRouter);
```

## Notes

- The old `routes/`, `services/`, and `middleware/` folders can be deleted once all imports are updated.
- Environment variables and secrets should be passed through `.env` file.
- All TypeScript files should end with `.ts` extension in imports (with `export` in `tsconfig.json`).
