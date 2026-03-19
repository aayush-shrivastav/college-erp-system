require("dotenv").config();

const express = require("express");
const cors = require("cors");
const authRoutes = require("./modules/auth/auth.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const studentRoutes = require("./modules/student/student.routes");
const teacherRoutes = require("./modules/teacher/teacher.routes");
const marksRoutes = require("./modules/marks/marks.routes");
const accountsRoutes = require("./modules/accounts/accounts.routes");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Global Middleware ──────────────────────────
app.use(cors());
app.use(express.json());

// ── Health Check ───────────────────────────────
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "College ERP API is running." });
});

// ── Routes ─────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/marks", marksRoutes);
app.use("/api/accounts", accountsRoutes);

// ── Start Server ───────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
