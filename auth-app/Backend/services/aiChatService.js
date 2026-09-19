const OpenAI = require("openai");

/**
 * AI Code Copilot Chat Service
 * Uses Groq via the OpenAI-compatible Node SDK.
 * Handles follow-up developer queries with full context of the submitted code,
 * identified review issues, and refactored code.
 */

function getGroqClient() {
  const apiKey = (process.env.AI_API_KEY || process.env.GROQ_API_KEY || "").trim();
  if (!apiKey || apiKey.includes("MY_KEY_HERE")) {
    throw new Error(
      "AI API key is not configured on the server. Please set AI_API_KEY in Backend/.env to enable copilot chat."
    );
  }

  const baseURL = process.env.AI_BASE_URL || "https://api.groq.com/openai/v1";

  return new OpenAI({
    apiKey,
    baseURL,
  });
}

/**
 * Answers contextual questions about the code and review findings using Groq.
 * Makes exactly ONE AI request.
 */
async function askQuestion({ code, language = "auto", review = {}, refactoredCode = "", question }) {
  const client = getGroqClient();
  const modelName = process.env.AI_MODEL || "openai/gpt-oss-120b";

  // Build review summary context
  const issuesSummary = Array.isArray(review.issues)
    ? review.issues
        .map(
          (i, idx) =>
            `${idx + 1}. [${(i.severity || "INFO").toUpperCase()}] ${i.title} (Line ${i.line ?? "N/A"}): ${i.description}`
        )
        .join("\n")
    : "No issues documented.";

  const systemMessage = `You are a specialized AI Code Copilot assisting a software engineer with their specific code review.
Answer the user's question directly, accurately, and concisely based strictly on the context of their submitted code, review findings, and refactored implementation.

CONTEXT:
Programming Language: ${language}

ORIGINAL CODE:
\`\`\`${language}
${code}
\`\`\`

REVIEW FINDINGS & AUDIT ISSUES:
${issuesSummary}

SUGGESTED REFACTORED CODE:
\`\`\`${language}
${refactoredCode || "Same as original code"}
\`\`\`

INSTRUCTIONS:
- Answer specifically about this code snippet and review.
- If asked for optimizations, unit tests, explanations, or fix rationale, provide clean, idiomatic code examples with concise reasoning.
- Keep the tone professional, direct, and constructive like a senior developer pair programmer.
- Do NOT hallucinate dependencies or libraries not relevant to the user's language.
`;

  try {
    const maxTokens = parseInt(process.env.AI_CHAT_MAX_TOKENS, 10) || 1500;

    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: question },
      ],
      temperature: 0.3,
      max_tokens: maxTokens,
    });

    const answer = completion.choices?.[0]?.message?.content || "";
    return answer.trim();
  } catch (err) {
    console.error("Groq Chat Error:", err.status || err.code || "ERR");

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
  askQuestion,
};
