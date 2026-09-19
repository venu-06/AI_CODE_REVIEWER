require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const logger = require("./utils/logger");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const compilerRoutes = require("./routes/compilerRoutes");
const docsRoutes = require("./routes/docsRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json());
app.use(cookieParser());

// HTTP Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip,
    });
  });
  next();
});

// Serve frontend static assets if client exists
app.use(express.static(path.join(__dirname, "../client")));

// ==========================================
// API ROUTES & DOCS
// ==========================================

app.use("/api/docs", docsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/compile", compilerRoutes);
app.use("/api/compiler", compilerRoutes);

// Dashboard redirect convenience
app.get("/api/dashboard", (req, res, next) => {
  req.url = "/dashboard";
  reviewRoutes(req, res, next);
});

// ==========================================
// HOME & FALLBACK
// ==========================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/login.html"));
});

// Export app for integration testing
module.exports = app;

// ==========================================
// START SERVER (only when executed directly)
// ==========================================

if (require.main === module) {
  const startServer = async () => {
    try {
      await connectDB();
      app.listen(PORT, () => {
        logger.info(`Server running on http://localhost:${PORT}`);
      });
    } catch (error) {
      logger.error("Failed to start server:", { error: error.message });
      process.exit(1);
    }
  };

  startServer();
}