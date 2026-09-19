const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    severity: {
      type: String,
      enum: ["critical", "warning", "suggestion"],
      default: "warning",
    },
    category: {
      type: String,
      enum: ["bug", "security", "performance", "code_smell", "maintainability"],
      default: "bug",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    line: {
      type: Number,
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    whyItMatters: {
      type: String,
      default: "",
    },
    suggestedFix: {
      type: String,
      default: "",
    },
    timeComplexity: {
      type: String,
      default: null,
    },
    spaceComplexity: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const summarySchema = new mongoose.Schema(
  {
    total: { type: Number, default: 0 },
    critical: { type: Number, default: 0 },
    warning: { type: Number, default: 0 },
    suggestion: { type: Number, default: 0 },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "Untitled Review",
      trim: true,
    },
    fileName: {
      type: String,
      default: "untitled.js",
      trim: true,
    },
    language: {
      type: String,
      default: "javascript",
      trim: true,
    },
    sourceCode: {
      type: String,
      default: "",
    },
    originalCode: {
      type: String,
      default: "",
    },
    refactoredCode: {
      type: String,
      default: "",
    },
    issues: [issueSchema],
    summary: {
      type: summarySchema,
      default: () => ({ total: 0, critical: 0, warning: 0, suggestion: 0 }),
    },
    overallExplanation: {
      type: String,
      default: "",
    },
    juniorMode: {
      type: Boolean,
      default: false,
    },
    reviewStatus: {
      type: String,
      enum: ["idle", "analyzing", "reviewed", "failed"],
      default: "idle",
    },
    lastReviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for high performance querying
reviewSchema.index({ userId: 1, updatedAt: -1 });
reviewSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
