const aiReviewService = require("../services/aiReviewService");
const aiChatService = require("../services/aiChatService");

/**
 * Controller for AI Code Review and Conversational Copilot
 */

const MAX_CODE_LENGTH = 100000;
const MAX_QUESTION_LENGTH = 2000;

const handleReview = async (req, res) => {
  try {
    const { code, language, juniorMode } = req.body;

    // 1. Validation: code exists and is a string
    if (typeof code !== "string" || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: "Source code is required and cannot be empty.",
      });
    }

    // 2. Validation: maximum length 100,000 characters
    if (code.length > MAX_CODE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Source code exceeds the maximum allowed limit of ${MAX_CODE_LENGTH.toLocaleString()} characters.`,
      });
    }

    // 3. Validation: language
    const sanitizedLanguage = typeof language === "string" && language.trim() ? language.trim().toLowerCase() : "auto";

    // 4. Validation: juniorMode boolean
    const isJuniorMode = Boolean(juniorMode);

    // 5. Call AI Review Service
    const review = await aiReviewService.reviewCode({
      code,
      language: sanitizedLanguage,
      juniorMode: isJuniorMode,
    });

    return res.json({
      success: true,
      review,
    });
  } catch (error) {
    console.error("handleReview error:", error.message);

    const isApiKeyError = error.message.includes("AI API key is not configured");
    const statusCode = isApiKeyError ? 503 : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to analyze code.",
    });
  }
};

const handleChat = async (req, res) => {
  try {
    const { code, language, review, refactoredCode, question } = req.body;

    // 1. Validation: question exists and is string
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

    // 2. Validation: code exists
    if (typeof code !== "string" || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: "Source code context is required for copilot questions.",
      });
    }

    const sanitizedLanguage = typeof language === "string" && language.trim() ? language.trim().toLowerCase() : "auto";

    // 3. Call AI Chat Service
    const answer = await aiChatService.askQuestion({
      code,
      language: sanitizedLanguage,
      review: typeof review === "object" && review !== null ? review : {},
      refactoredCode: typeof refactoredCode === "string" ? refactoredCode : "",
      question: question.trim(),
    });

    return res.json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error("handleChat error:", error.message);

    const isApiKeyError = error.message.includes("AI API key is not configured");
    const statusCode = isApiKeyError ? 503 : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to process copilot question.",
    });
  }
};

module.exports = {
  handleReview,
  handleChat,
};
