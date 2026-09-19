const mongoose = require("mongoose");
const Review = require("../models/Review");
const aiReviewService = require("../services/aiReviewService");
const aiChatService = require("../services/aiChatService");

/**
 * Controller for User-Specific Persistent Reviews & Dashboard Analytics
 * All operations are strictly isolated to req.user.userId
 */

const MAX_CODE_LENGTH = 100000;
const MAX_QUESTION_LENGTH = 2000;

/**
 * Create a new review document for the authenticated user
 * POST /api/reviews
 */
const createReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      title = "Untitled Review",
      fileName = "untitled.js",
      language = "javascript",
      sourceCode = "",
      juniorMode = false,
    } = req.body;

    if (sourceCode && sourceCode.length > MAX_CODE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Source code exceeds the maximum allowed limit of ${MAX_CODE_LENGTH.toLocaleString()} characters.`,
      });
    }

    const review = await Review.create({
      userId,
      title: title.trim() || "Untitled Review",
      fileName: fileName.trim() || "untitled.js",
      language: (language || "javascript").trim().toLowerCase(),
      sourceCode: sourceCode || "",
      originalCode: sourceCode || "",
      juniorMode: Boolean(juniorMode),
      reviewStatus: "idle",
    });

    return res.status(201).json({
      success: true,
      review,
    });
  } catch (error) {
    console.error("createReview error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create new review document.",
    });
  }
};

/**
 * Get all reviews belonging to the authenticated user
 * GET /api/reviews?search=...
 */
const getReviews = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { search = "" } = req.query;

    const query = { userId };

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { title: searchRegex },
        { fileName: searchRegex },
        { language: searchRegex },
      ];
    }

    const reviews = await Review.find(query)
      .select("title fileName language summary juniorMode reviewStatus lastReviewedAt createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error("getReviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch review history.",
    });
  }
};

/**
 * Get a specific review by ID (strictly isolated to owner)
 * GET /api/reviews/:id
 */
const getReviewById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    const review = await Review.findOne({ _id: id, userId });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found or you do not have permission to view it.",
      });
    }

    return res.json({
      success: true,
      review,
    });
  } catch (error) {
    console.error("getReviewById error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load review details.",
    });
  }
};

/**
 * Update code / metadata for a review (autosave or manual save)
 * PATCH /api/reviews/:id
 */
const updateReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    const { title, fileName, language, sourceCode, juniorMode } = req.body;

    if (typeof sourceCode === "string" && sourceCode.length > MAX_CODE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Source code exceeds the maximum allowed limit of ${MAX_CODE_LENGTH.toLocaleString()} characters.`,
      });
    }

    const updateFields = {};
    if (typeof title === "string") updateFields.title = title.trim();
    if (typeof fileName === "string") updateFields.fileName = fileName.trim();
    if (typeof language === "string") updateFields.language = language.trim().toLowerCase();
    if (typeof sourceCode === "string") updateFields.sourceCode = sourceCode;
    if (typeof juniorMode === "boolean") updateFields.juniorMode = juniorMode;

    const review = await Review.findOneAndUpdate(
      { _id: id, userId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found or you do not have permission to update it.",
      });
    }

    return res.json({
      success: true,
      review,
    });
  } catch (error) {
    console.error("updateReview error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save review changes.",
    });
  }
};

/**
 * Delete a review (strictly owner only)
 * DELETE /api/reviews/:id
 */
const deleteReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    const review = await Review.findOneAndDelete({ _id: id, userId });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found or you do not have permission to delete it.",
      });
    }

    return res.json({
      success: true,
      message: "Review deleted successfully.",
      deletedId: id,
    });
  } catch (error) {
    console.error("deleteReview error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete review.",
    });
  }
};

/**
 * Run AI audit for an existing review doc and save results to the SAME document
 * POST /api/reviews/:id/analyze
 */
const analyzeReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    const review = await Review.findOne({ _id: id, userId });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found or you do not have permission to analyze it.",
      });
    }

    // Optional updated sourceCode or language from request body
    const { sourceCode, language, juniorMode } = req.body;
    const codeToReview = typeof sourceCode === "string" ? sourceCode : review.sourceCode;
    const selectedLanguage = typeof language === "string" && language.trim() ? language.trim().toLowerCase() : review.language;
    const isJuniorMode = typeof juniorMode === "boolean" ? juniorMode : review.juniorMode;

    if (!codeToReview || !codeToReview.trim()) {
      return res.status(400).json({
        success: false,
        message: "Source code cannot be empty. Please enter code to review.",
      });
    }

    if (codeToReview.length > MAX_CODE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Source code exceeds the maximum allowed limit of ${MAX_CODE_LENGTH.toLocaleString()} characters.`,
      });
    }

    // Call Groq AI service (exactly 1 AI request)
    const aiResult = await aiReviewService.reviewCode({
      code: codeToReview,
      language: selectedLanguage,
      juniorMode: isJuniorMode,
    });

    // Update the SAME review document in MongoDB
    review.sourceCode = codeToReview;
    if (!review.originalCode) {
      review.originalCode = codeToReview;
    }
    review.language = selectedLanguage;
    review.juniorMode = isJuniorMode;
    review.issues = aiResult.issues || [];
    review.summary = aiResult.summary || { total: 0, critical: 0, warning: 0, suggestion: 0 };
    review.overallExplanation = aiResult.overallExplanation || "";
    review.refactoredCode = aiResult.refactoredCode || codeToReview;
    review.reviewStatus = "reviewed";
    review.lastReviewedAt = new Date();

    await review.save();

    return res.json({
      success: true,
      review,
    });
  } catch (error) {
    console.error("analyzeReview error:", error.message);

    const isApiKeyError = error.message && error.message.includes("AI API key is not configured");
    const statusCode = isApiKeyError ? 503 : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to analyze code.",
    });
  }
};

/**
 * Ask Copilot question with the context of this specific review
 * POST /api/reviews/:id/chat
 */
const chatWithReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { question } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    if (typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question is required and cannot be empty.",
      });
    }

    if (question.length > MAX_QUESTION_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Question exceeds the maximum length of ${MAX_QUESTION_LENGTH} characters.`,
      });
    }

    const review = await Review.findOne({ _id: id, userId });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    const answer = await aiChatService.askQuestion({
      code: review.sourceCode || "",
      language: review.language || "javascript",
      review: {
        summary: review.summary,
        issues: review.issues,
        overallExplanation: review.overallExplanation,
      },
      refactoredCode: review.refactoredCode || "",
      question: question.trim(),
    });

    return res.json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error("chatWithReview error:", error.message);

    const isApiKeyError = error.message && error.message.includes("AI API key is not configured");
    const statusCode = isApiKeyError ? 503 : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to process copilot question.",
    });
  }
};

/**
 * Get aggregated statistics for the user's dashboard
 * GET /api/dashboard or GET /api/reviews/dashboard
 */
const getDashboardStats = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const days = parseInt(req.query.days, 10) || 30;

    // 1. Overall Aggregation
    const overallStats = await Review.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          totalIssues: { $sum: "$summary.total" },
          criticalIssues: { $sum: "$summary.critical" },
          warningIssues: { $sum: "$summary.warning" },
          suggestionIssues: { $sum: "$summary.suggestion" },
        },
      },
    ]);

    const totalReviews = overallStats[0]?.totalReviews || 0;
    const totalIssues = overallStats[0]?.totalIssues || 0;
    const criticalIssues = overallStats[0]?.criticalIssues || 0;
    const warningIssues = overallStats[0]?.warningIssues || 0;
    const suggestionIssues = overallStats[0]?.suggestionIssues || 0;

    // 2. Issue Distribution by Category
    const categoryStats = await Review.aggregate([
      { $match: { userId } },
      { $unwind: "$issues" },
      {
        $group: {
          _id: "$issues.category",
          count: { $sum: 1 },
        },
      },
    ]);

    const categoryMap = {
      security: 0,
      bug: 0,
      performance: 0,
      code_smell: 0,
      maintainability: 0,
    };

    categoryStats.forEach((c) => {
      if (c._id && Object.prototype.hasOwnProperty.call(categoryMap, c._id)) {
        categoryMap[c._id] = c.count;
      }
    });

    const securityIssues = categoryMap.security;

    // 3. Activity Timeline over specified days (7, 30, or 90)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const timelineData = await Review.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          reviewsCount: { $sum: 1 },
          issuesCount: { $sum: "$summary.total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Build continuous timeline with zero fills
    const formattedTimeline = [];
    const now = new Date();
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const match = timelineData.find((t) => t._id === dateStr);
      formattedTimeline.push({
        date: dateStr,
        reviews: match ? match.reviewsCount : 0,
        issues: match ? match.issuesCount : 0,
      });
    }

    // 4. Recent Reviews
    const recentReviews = await Review.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(6)
      .select("title fileName language summary reviewStatus lastReviewedAt updatedAt createdAt")
      .lean();

    // 5. Recent Activity Feed
    const recentActivity = [];
    const allRecent = await Review.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select("fileName title reviewStatus lastReviewedAt updatedAt createdAt summary")
      .lean();

    allRecent.forEach((rev) => {
      if (rev.lastReviewedAt) {
        recentActivity.push({
          id: `act-rev-${rev._id}`,
          reviewId: rev._id,
          fileName: rev.fileName,
          type: "reviewed",
          description: `Completed AI code audit for ${rev.fileName} (${rev.summary?.total || 0} findings)`,
          timestamp: rev.lastReviewedAt,
        });
      }
      if (rev.updatedAt && (!rev.lastReviewedAt || rev.updatedAt > rev.lastReviewedAt)) {
        recentActivity.push({
          id: `act-upd-${rev._id}`,
          reviewId: rev._id,
          fileName: rev.fileName,
          type: "updated",
          description: `Updated source code in ${rev.fileName}`,
          timestamp: rev.updatedAt,
        });
      } else if (rev.createdAt && !rev.lastReviewedAt) {
        recentActivity.push({
          id: `act-crt-${rev._id}`,
          reviewId: rev._id,
          fileName: rev.fileName,
          type: "created",
          description: `Created new review workspace for ${rev.fileName}`,
          timestamp: rev.createdAt,
        });
      }
    });

    recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.json({
      success: true,
      stats: {
        totalReviews,
        totalIssues,
        criticalIssues,
        warningIssues,
        suggestionIssues,
        securityIssues,
        issueDistribution: categoryMap,
        reviewsOverTime: formattedTimeline,
        recentReviews,
        recentActivity: recentActivity.slice(0, 8),
      },
    });
  } catch (error) {
    console.error("getDashboardStats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to aggregate dashboard analytics.",
    });
  }
};

module.exports = {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  analyzeReview,
  chatWithReview,
  getDashboardStats,
};
