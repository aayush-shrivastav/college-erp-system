<<<<<<< HEAD
# College ERP System 🚀

A comprehensive, full-stack Enterprise Resource Planning (ERP) solution for higher education institutions. Built with modern web technologies, this system streamlines administrative workflows, faculty management, and student engagement.

---

## 🌟 Key Features

### 🏛️ Admin Control Center
- **Student Management**: Modular enrollment system with multi-field validation.
- **Faculty Onboarding**: Seamless teacher registration and department mapping.
- **Academic Setup**: Tool to assign subjects and classes to faculty members.
- **Security Control**: Administrative override to unlock student profiles for restricted edits.
- **Data Registry**: Searchable and paginated tables for managing the entire campus dataset.

### 👨‍🏫 Teacher Portal
- **Attendance System**: Create sessions, mark attendance (Present, Absent, Late, Excused).
- **Subjec View**: Real-time view of assigned classes and academic schedule.
- **Performance Tracking**: Marks calculation system using best-of-2 exam logic.

### 🎓 Student Portal
- **Profile Management**: Secure profile viewing and restricted editing.
- **Fee Management**: Track dues, payments, and fines (Hostel/Bus integration).
- **Academic Record**: View subject-wise performance and attendance statistics.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS (v4), Lucide Icons, Framer Motion.
- **Backend**: Node.js, Express.
- **Database**: PostgreSQL with Prisma ORM.
- **Authentication**: JWT-based Role-Based Access Control (RBAC).

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL database
- `.env` files (see setup below)

### Backend Setup
1. Navigate to directory: `cd backend`
2. Install dependencies: `npm install`
3. Configure `.env`:
   ```env
   DATABASE_URL="postgresql://user:pass@localhost:5432/college_erp"
   JWT_SECRET="your_secret_key"
   PORT=5000
   ```
4. Push schema: `npx prisma db push`
5. Start server: `npm run dev`

### Frontend Setup
1. Navigate to directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`

---

## 🛡️ Security & Performance
- **Persisted Dark Mode**: Theme context with local storage persistence.
- **Skeleton Loading**: High-fidelity shimmering UI states for improved perceived performance.
- **Transaction Safety**: Prisma $transaction logic for complex mark and attendance updates.
- **Global Auth state**: Context-based authentication for secure role-based routing.

---

## 📸 Screenshots
*(Add your screenshots here)*
- Dashboard Overview
- Attendance Marking UI
- Admin Management Suite

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
=======
# college-erp-system
>>>>>>> 8111371c01276f6ad3123e4dad537bc0539fc3fe
