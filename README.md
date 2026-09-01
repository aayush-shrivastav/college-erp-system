# 🎓 College ERP System

Full-stack College ERP — Node.js + React + PostgreSQL

## Quick Setup (5 Steps)

### Step 1 — Prerequisites
```bash
# Install if not already installed:
Node.js 18+   → https://nodejs.org
PostgreSQL 14+ → https://postgresql.org
Redis         → https://redis.io  (or Upstash free tier)
```

### Step 2 — Create Database
```sql
-- Run in PostgreSQL:
CREATE DATABASE college_erp;
```

### Step 3 — Backend setup
```bash
cd college-erp-backend
npm install
cp .env.example .env
# Put your DATABASE_URL in the .env file
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev
# Backend: http://localhost:3000
```

### Step 4 — Frontend setup
```bash
cd college-erp-frontend
npm install
npm run dev
# Frontend: http://localhost:5173
```

### Step 5 — Login
| Role     | Email                   | Password      |
|----------|-------------------------|---------------|
| Admin    | admin@college.edu       | Admin@123     |
| Teacher  | teacher@college.edu     | Teacher@123   |
| Student  | student@college.edu     | Student@123   |
| Accounts | accounts@college.edu    | Accounts@123  |

---

## Project Structure
```
college-erp-backend/
├── prisma/
│   ├── schema.prisma     ← Database schema (25+ tables)
│   └── seed.js           ← Default data
└── src/
    ├── app.js
    ├── server.js
    ├── config/           ← DB, Redis
    ├── middlewares/      ← Auth, Permissions, Error handler
    └── modules/
        ├── auth/
        ├── admin/        ← Students, Teachers, Syllabus, Structure, Timetable, Attendance, Exams
        ├── teacher/
        ├── student/
        └── accounts/

college-erp-frontend/
└── src/
    ├── api/              ← All API calls
    ├── components/       ← Shared UI components
    ├── pages/
    │   ├── admin/        ← 8 pages
    │   ├── teacher/      ← 6 pages
    │   ├── student/      ← 8 pages
    │   └── accounts/     ← 4 pages
    └── store/            ← Auth state
```

## Tech Stack
- **Backend:** Node.js, Express, Prisma, PostgreSQL, Redis, JWT
- **Frontend:** React 18, Vite, Tailwind CSS, React Query, Axios

## .env Setup (Backend)
```env
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/college_erp
JWT_SECRET=your-very-long-secret-key-here
JWT_REFRESH_SECRET=another-very-long-secret-key
REDIS_URL=redis://localhost:6379
PORT=3000
```
