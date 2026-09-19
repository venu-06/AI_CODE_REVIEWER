const winston = require("winston");
const path = require("path");

/**
 * Winston Logger instance for production observability & structured logging.
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "ai-code-reviewer-backend" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, stack, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
          const stackStr = stack ? `\n${stack}` : "";
          return `[${timestamp}] [${level}]: ${message}${metaStr}${stackStr}`;
        })
      ),
    }),
  ],
});

module.exports = logger;
