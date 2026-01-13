# SRPH-MIS Inventory Management System

## Overview

SRPH-MIS is an enterprise-grade inventory management system designed for healthcare IT infrastructure. It provides comprehensive tracking and management of IT assets, virtual machines, cloud resources, user accounts, and security credentials. The system supports multi-cloud environments (AWS, Azure, GCP), integrates with Zabbix for monitoring, and includes features like BitLocker key management, MFA authentication, and role-based access control.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite with HMR support

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy, session-based auth
- **Session Storage**: Memory store (with PostgreSQL option via connect-pg-simple)
- **API Design**: RESTful endpoints under `/api/*` prefix
- **File Structure**: Server code in `server/`, shared types in `shared/`

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **Migrations**: Drizzle Kit for schema migrations (`drizzle.config.ts`)
- **Connection**: Node-postgres (pg) pool with SSL support for remote connections

### Security Features
- **Encryption**: AES-256-GCM for PII data at rest (optional, disabled by default)
- **MFA**: TOTP-based two-factor authentication with Microsoft Authenticator support
- **RBAC**: Granular role-based permissions per resource (view/edit/add/delete)
- **Password Security**: Scrypt hashing with salt, password complexity requirements

### Key Design Patterns
- **Storage Abstraction**: `IStorage` interface in `server/storage.ts` allows swapping between database and in-memory storage
- **Route Registration**: Modular route files (`server/routes.ts`, `server/page-builder-routes.ts`, etc.)
- **Field Encryption**: `encryptFields`/`decryptFields` utilities for selective PII encryption
- **Page Builder**: Dynamic custom pages with configurable columns stored in database

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Neon Serverless**: Optional serverless PostgreSQL support (`@neondatabase/serverless`)

### Third-Party Integrations
- **Zabbix**: Server monitoring integration via REST API (`server/zabbix-api.ts`)
- **JIRA**: Ticket creation via webhook/REST API (`server/jira-integration.ts`)
- **Nodemailer**: Email notifications with configurable SMTP (`server/email-service.ts`)

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required for database mode)
- `ENCRYPTION_KEY`: Optional AES encryption key for PII protection
- `SESSION_SECRET`: Secret for session cookie signing
- `NODE_ENV`: development/production mode

### Authentication Libraries
- `passport` / `passport-local`: Authentication strategy
- `speakeasy`: TOTP generation for MFA
- `qrcode`: QR code generation for MFA setup

### Cloud Platform Support
- AWS, Azure, GCP inventory tracking (schema tables, not SDK integrations)
- Virtual machine inventory with approval workflows