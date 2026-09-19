const express = require("express");

const {
  register,
  verifyRegistrationOtp,
  completeRegistration,
  login,
  getMe,
  logout,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Register - Send OTP
router.post("/register", register);

// Register - Verify OTP
router.post("/register/verify", verifyRegistrationOtp);

// Register - Complete registration
router.post("/register/complete", completeRegistration);

// Login
router.post("/login", login);

// Get logged-in user
router.get("/me", authMiddleware, getMe);

// Logout
router.post("/logout", logout);

module.exports = router;