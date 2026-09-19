const express = require("express");
const rateLimit = require("express-rate-limit");
const authMiddleware = require("../middleware/authMiddleware");
const { handleReview, handleChat } = require("../controllers/reviewController");
const {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  analyzeReview,
  chatWithReview,
  getDashboardStats,
} = require("../controllers/reviewHistoryController");

const router = express.Router();

/**
 * Rate Limiter for AI Code Reviews
 * 30 review requests per hour per IP
 */
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many code review requests. You may submit up to 30 reviews per hour. Please try again later.",
  },
});

/**
 * Rate Limiter for AI Code Copilot Chat
 * 60 chat questions per hour per IP
 */
const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many copilot questions. You may ask up to 60 questions per hour. Please try again later.",
  },
});

// All review history and dashboard routes require authentication
router.use(authMiddleware);

// ==========================================
// DASHBOARD ANALYTICS ROUTE
// ==========================================
router.get("/dashboard", getDashboardStats);

// ==========================================
// PERSISTENT REVIEWS CRUD ROUTES
// ==========================================
router.get("/", getReviews);
router.post("/", createReview);
router.get("/:id", getReviewById);
router.patch("/:id", updateReview);
router.delete("/:id", deleteReview);

// ==========================================
// PERSISTENT AI ACTIONS (SCOPED TO DOC ID)
// ==========================================
router.post("/:id/analyze", reviewLimiter, analyzeReview);
router.post("/:id/chat", chatLimiter, chatWithReview);

// ==========================================
// LEGACY STANDALONE APIS (COMPATIBILITY)
// ==========================================
router.post("/standalone/analyze", reviewLimiter, handleReview);
router.post("/standalone/chat", chatLimiter, handleChat);

module.exports = router;
