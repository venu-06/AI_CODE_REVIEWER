const OpenAI = require("openai");

/**
 * AI Code Review Service
 * Interacts with Groq via the OpenAI-compatible Node SDK.
 * Model, Base URL, and API Key are loaded dynamically from environment variables.
 */

const VALID_SEVERITIES = ["critical", "warning", "suggestion"];
const VALID_CATEGORIES = ["bug", "security", "performance", "code_smell", "maintainability"];

/**
 * Creates a Groq OpenAI-compatible client using server-side environment variables
 */
function getGroqClient() {
  const apiKey = (process.env.AI_API_KEY || process.env.GROQ_API_KEY || "").trim();
  if (!apiKey || apiKey.includes("MY_KEY_HERE")) {
    throw new Error(
      "AI API key is not configured on the server. Please set AI_API_KEY in Backend/.env to enable reviews."
    );
  }

  const baseURL = process.env.AI_BASE_URL || "https://api.groq.com/openai/v1";

  return new OpenAI({
    apiKey,
    baseURL,
  });
}

const logger = require("../utils/logger");

/**
 * Sanitizes and extracts raw JSON from an AI response string
 * @param {string} text
 * @returns {object} parsed JSON
 */
function extractJson(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Empty response received from AI provider.");
  }

  // Remove markdown code fences if present (```json ... ``` or ``` ... ```)
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
  }

  // Find first { and last } to handle any leading/trailing explanatory text
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    logger.error("Failed to parse AI JSON response", { rawText: text, error: err.message });
    throw new Error("AI provider returned invalid JSON format.");
  }
}

/**
 * Normalizes and validates the AI review payload
 * @param {object} raw
 * @param {string} originalCode
 * @returns {object} normalized review
 */
function normalizeReview(raw, originalCode) {
  const issues = Array.isArray(raw?.issues) ? raw.issues : [];

  const normalizedIssues = issues.map((issue, idx) => {
    // Validate / normalize severity
    let severity = String(issue.severity || "").toLowerCase().trim();
    if (!VALID_SEVERITIES.includes(severity)) {
      if (severity.includes("crit") || severity.includes("high") || severity.includes("error")) {
        severity = "critical";
      } else if (severity.includes("warn") || severity.includes("medium")) {
        severity = "warning";
      } else {
        severity = "suggestion";
      }
    }

    // Validate / normalize category
    let category = String(issue.category || "").toLowerCase().trim().replace(/[\s-]/g, "_");
    if (!VALID_CATEGORIES.includes(category)) {
      if (category.includes("sec") || category.includes("vuln")) {
        category = "security";
      } else if (category.includes("perf") || category.includes("opt") || category.includes("speed")) {
        category = "performance";
      } else if (category.includes("smell") || category.includes("style")) {
        category = "code_smell";
      } else if (category.includes("maint") || category.includes("clean")) {
        category = "maintainability";
      } else {
        category = "bug";
      }
    }

    // Line number: ensure integer or null
    let line = null;
    if (typeof issue.line === "number" && Number.isInteger(issue.line) && issue.line > 0) {
      line = issue.line;
    } else if (typeof issue.line === "string" && /^\d+$/.test(issue.line.trim())) {
      const parsed = parseInt(issue.line.trim(), 10);
      if (parsed > 0) line = parsed;
    }

    return {
      id: issue.id || `issue-${idx + 1}`,
      severity,
      category,
      title: issue.title || "Code Quality Finding",
      line,
      description: issue.description || "No description provided.",
      whyItMatters: issue.whyItMatters || issue.why_it_matters || "Affects code reliability and maintainability.",
      suggestedFix: issue.suggestedFix || issue.suggested_fix || "Refactor the affected code snippet.",
      timeComplexity: issue.timeComplexity || issue.time_complexity || null,
      spaceComplexity: issue.spaceComplexity || issue.space_complexity || null,
    };
  });

  const criticalCount = normalizedIssues.filter((i) => i.severity === "critical").length;
  const warningCount = normalizedIssues.filter((i) => i.severity === "warning").length;
  const suggestionCount = normalizedIssues.filter((i) => i.severity === "suggestion").length;

  // Calculate overall Code Health Score (0 - 100)
  const rawScore = 100 - (criticalCount * 25 + warningCount * 10 + suggestionCount * 3);
  const codeHealthScore = Math.max(0, Math.min(100, rawScore));

  const summary = {
    total: normalizedIssues.length,
    critical: criticalCount,
    warning: warningCount,
    suggestion: suggestionCount,
    codeHealthScore,
  };

  const overallExplanation =
    typeof raw?.overallExplanation === "string" && raw.overallExplanation.trim()
      ? raw.overallExplanation.trim()
      : "Automated analysis completed. Review the highlighted findings and recommended refactored code.";

  const refactoredCode =
    typeof raw?.refactoredCode === "string" && raw.refactoredCode.trim()
      ? raw.refactoredCode.trim()
      : originalCode;

  return {
    summary,
    codeHealthScore,
    issues: normalizedIssues,
    overallExplanation,
    refactoredCode,
  };
}

/**
 * Reviews submitted source code using Groq (OpenAI-compatible SDK)
 * Makes exactly ONE AI request.
 * @param {{ code: string, language?: string, juniorMode?: boolean }} params
 */
async function reviewCode({ code, language = "auto", juniorMode = false }) {
  const client = getGroqClient();
  const modelName = process.env.AI_MODEL || "openai/gpt-oss-120b";

  const juniorPrompt = juniorMode
    ? `
JUNIOR DEVELOPER MODE IS ENABLED:
- Provide explanations in simple, educational, and intuitive terms suitable for a junior developer.
- For every issue, explicitly answer:
  1. What is wrong?
  2. Why is it a problem?
  3. How can I fix it?
- Keep explanations clear, actionable, and free from unnecessary jargon while maintaining strict technical accuracy.
`
    : `
STANDARD DEVELOPER MODE:
- Provide precise, professional technical feedback with clear rationales and best practices.
`;

  const systemMessage = `You are a Senior Software Engineer, Security Auditor, Performance Analyst, and Refactoring Specialist.
Perform an in-depth automated code audit on the provided source code.

LANGUAGE: ${language}
${juniorPrompt}

AUDIT REQUIREMENTS:
1. Bugs: Detect syntax errors, logic flaws, null/undefined dereferences, off-by-one errors, and unhandled edge cases.
2. Security: Check for OWASP Top 10 vulnerabilities, injection flaws (SQL, command), XSS, path traversal, hardcoded secrets, unsafe deserialization, insecure auth, weak cryptography, and unsafe dynamic execution (eval).
3. Performance & Big-O: Evaluate algorithmic efficiency, nested loops, memory leaks, and expensive operations. Include "timeComplexity" and "spaceComplexity" (e.g., "O(n)", "O(n^2)") only where applicable and meaningful; otherwise set them to null.
4. Code Smells & Maintainability: Detect duplicate code, dead code, excessive complexity, naming violations, and violation of clean code principles.
5. Suggested Refactor: Generate a complete, drop-in replacement refactored version of the code that fixes all identified issues, enhances readability, preserves intended functionality, and follows language idioms without arbitrary changes.

CRITICAL INSTRUCTIONS:
- Do NOT invent issues. Only report findings strongly supported by the submitted code.
- Prefer fewer high-confidence findings over many speculative ones.
- Line numbers must be accurate (1-indexed). If a line number cannot be determined with confidence, return null for line.
- Severities MUST be one of: "critical", "warning", "suggestion".
- Categories MUST be one of: "bug", "security", "performance", "code_smell", "maintainability".
- You MUST respond with ONLY a valid raw JSON object matching the schema below. Do not include markdown text or code fences around the JSON.

RESPONSE JSON SCHEMA:
{
  "summary": {
    "total": 0,
    "critical": 0,
    "warning": 0,
    "suggestion": 0
  },
  "issues": [
    {
      "id": "issue-1",
      "severity": "critical",
      "category": "security",
      "title": "Short descriptive title",
      "line": 18,
      "description": "Clear explanation of the finding",
      "whyItMatters": "Impact and consequence of this issue",
      "suggestedFix": "Precise recommendation on how to resolve it",
      "timeComplexity": null,
      "spaceComplexity": null
    }
  ],
  "overallExplanation": "Concise summary covering code quality, critical risks, performance observations, and refactoring rationale.",
  "refactoredCode": "// Complete refactored code here"
}`;

  const userMessage = `SOURCE CODE TO REVIEW:
\`\`\`${language}
${code}
\`\`\``;

  try {
    const maxTokens = parseInt(process.env.AI_MAX_TOKENS, 10) || 4000;

    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: maxTokens,
    });

    const text = completion.choices?.[0]?.message?.content || "";
    const rawJson = extractJson(text);
    return normalizeReview(rawJson, code);
  } catch (err) {
    console.error("Groq Review Error:", err.status || err.code || "ERR");

    if (err.message && err.message.includes("AI API key is not configured")) {
      throw err;
    }

    if (err.status === 401 || err.code === "invalid_api_key" || err.message?.includes("401")) {
      throw new Error("AI authentication failed. Please check the Groq API key.");
    }

    if (err.status === 429 || err.code === "rate_limit_exceeded" || err.message?.includes("429") || err.message?.includes("rate limit")) {
      throw new Error("AI rate limit reached. Please wait a moment and try again.");
    }

    throw new Error("AI service temporarily unavailable.");
  }
}

module.exports = {
  reviewCode,
  normalizeReview,
};
