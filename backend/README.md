# College ERP — Backend

## Quick Start (5 steps)

```bash
# 1. Dependencies install karo
npm install

# 2. .env file banao
cp .env.example .env
# .env mein apna DATABASE_URL aur JWT secrets daalo

# 3. Database migrations run karo
npx prisma migrate dev --name init

# 4. Default data seed karo
node prisma/seed.js

# 5. Server start karo
npm run dev
```

Server `http://localhost:3000` pe chalega.

## Default Login Credentials

| Role     | Email                   | Password      |
|----------|-------------------------|---------------|
| Admin    | admin@college.edu       | Admin@123     |
| Teacher  | teacher@college.edu     | Teacher@123   |
| Student  | student@college.edu     | Student@123   |
| Accounts | accounts@college.edu    | Accounts@123  |

## Test API (Postman)

### Login
```
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{ "email": "admin@college.edu", "password": "Admin@123" }
```

### Use Token
```
Authorization: Bearer <accessToken from login response>
```

## API Endpoints Summary

| Module   | Base Path            |
|----------|----------------------|
| Auth     | /api/v1/auth         |
| Admin    | /api/v1/admin        |
| Teacher  | /api/v1/teacher      |
| Student  | /api/v1/student      |
| Accounts | /api/v1/accounts     |

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis (optional — auth still works without it)

## Folder Structure

```
src/
├── config/          Database, Redis connections
├── middlewares/     Auth, permissions, error handling
├── modules/         Route + service files per panel
├── utils/           Helper functions
└── app.js           Express app setup
```
