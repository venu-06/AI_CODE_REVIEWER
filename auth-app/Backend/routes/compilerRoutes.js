const express = require("express");
const rateLimit = require("express-rate-limit");
const authMiddleware = require("../middleware/authMiddleware");
const { compileCode, languageConfig } = require("../controllers/compilerController");

const router = express.Router();

/**
 * Rate Limiter for Compiler Code Execution
 * 60 run requests per hour per IP
 */
const compileLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    stdout: "",
    stderr: "Too many compilation requests. You may execute code up to 60 times per hour. Please try again later.",
  },
});

// GET /api/compile or /api/compiler (Health check & status)
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Online Compiler Service is operational",
    supportedLanguages: Object.keys(languageConfig),
  });
});

router.get("/compile", (req, res) => {
  res.json({
    success: true,
    message: "Online Compiler Service is operational",
    supportedLanguages: Object.keys(languageConfig),
  });
});

// All compilation execution requests require authentication
router.use(authMiddleware);

// POST /api/compile or /api/compiler/compile
router.post("/", compileLimiter, compileCode);
router.post("/compile", compileLimiter, compileCode);

module.exports = router;
