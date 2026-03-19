const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../config/db");

// ──────────────────────────────────────────────
//  POST /api/auth/register
// ──────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // --- validation ---
    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password and role are required." });
    }

    // --- email format check ---
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    const allowedRoles = ["ADMIN", "TEACHER", "STUDENT", "ACCOUNTS"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Allowed: ${allowedRoles.join(", ")}` });
    }

    // --- check duplicate ---
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "A user with this email already exists." });
    }

    // --- hash password ---
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // --- create user ---
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: "User registered successfully.",
      user,
    });
  } catch (error) {
    console.error("Register error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ──────────────────────────────────────────────
//  POST /api/auth/login
// ──────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // --- validation ---
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // --- find user ---
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // --- verify password ---
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // --- generate token ---
    const payload = { id: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = { register, login };
