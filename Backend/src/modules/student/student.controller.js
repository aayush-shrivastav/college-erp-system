const prisma = require("../../config/db");

// ══════════════════════════════════════════════
//  GET /api/student/profile
// ══════════════════════════════════════════════
const getProfile = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.user.id },
      include: {
        user: {
          select: { id: true, email: true, role: true, createdAt: true },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ message: "Student profile not found." });
    }

    return res.status(200).json({ data: student });
  } catch (error) {
    console.error("getProfile error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ══════════════════════════════════════════════
//  PUT /api/student/profile
// ══════════════════════════════════════════════
const updateProfile = async (req, res) => {
  try {
    // --- check if profile exists ---
    const existing = await prisma.student.findUnique({
      where: { id: req.user.id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Student profile not found." });
    }

    // --- check lock ---
    if (existing.profileLocked) {
      return res.status(403).json({
        message: "Profile is locked. Contact Admin or Teacher to unlock.",
      });
    }

    // --- extract fields ---
    const {
      phone,
      address,
      fatherName,
      fatherPhone,
      motherName,
      motherPhone,
      tenthBoard,
      tenthYear,
      tenthPercentage,
      twelfthBoard,
      twelfthYear,
      twelfthPercentage,
    } = req.body;

    // --- validate required profile fields ---
    if (
      !phone ||
      !address ||
      !fatherName ||
      !fatherPhone ||
      !motherName ||
      !motherPhone ||
      !tenthBoard ||
      !tenthYear ||
      !tenthPercentage ||
      !twelfthBoard ||
      !twelfthYear ||
      !twelfthPercentage
    ) {
      return res.status(400).json({
        message:
          "All fields are required: phone, address, fatherName, fatherPhone, motherName, motherPhone, tenthBoard, tenthYear, tenthPercentage, twelfthBoard, twelfthYear, twelfthPercentage.",
      });
    }

    // --- validate numeric fields ---
    if (
      isNaN(parseInt(tenthYear)) ||
      isNaN(parseFloat(tenthPercentage)) ||
      isNaN(parseInt(twelfthYear)) ||
      isNaN(parseFloat(twelfthPercentage))
    ) {
      return res.status(400).json({ message: "tenthYear, tenthPercentage, twelfthYear, twelfthPercentage must be valid numbers." });
    }

    // --- update + lock ---
    const updated = await prisma.student.update({
      where: { id: req.user.id },
      data: {
        phone,
        address,
        fatherName,
        fatherPhone,
        motherName,
        motherPhone,
        tenthBoard,
        tenthYear: parseInt(tenthYear),
        tenthPercentage: parseFloat(tenthPercentage),
        twelfthBoard,
        twelfthYear: parseInt(twelfthYear),
        twelfthPercentage: parseFloat(twelfthPercentage),
        profileLocked: true,
      },
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    return res.status(200).json({
      message: "Profile updated and locked successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("updateProfile error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = { getProfile, updateProfile };
