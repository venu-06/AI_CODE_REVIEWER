const { normalizeReview } = require("../services/aiReviewService");

describe("AI Review Service - normalizeReview & extractJson", () => {
  test("should correctly normalize raw AI JSON response with all fields", () => {
    const rawAiOutput = {
      issues: [
        {
          id: "issue-1",
          severity: "CRITICAL",
          category: "security",
          title: "SQL Injection Flaw",
          line: 12,
          description: "Unsanitized user input passed directly into SQL query string.",
          whyItMatters: "Allows attackers to execute arbitrary SQL commands.",
          suggestedFix: "Use parameterized queries.",
        },
        {
          id: "issue-2",
          severity: "warning",
          category: "performance",
          title: "Inefficient Loop",
          line: "25",
          description: "Nested O(n^2) array lookup.",
          suggestedFix: "Use a Map or Set.",
        },
      ],
      overallExplanation: "Code has a critical security flaw and performance bottleneck.",
      refactoredCode: "const db = require('db');\ndb.query('SELECT * FROM users WHERE id = ?', [id]);",
    };

    const originalCode = "const query = 'SELECT * FROM users WHERE id=' + id;";
    const normalized = normalizeReview(rawAiOutput, originalCode);

    expect(normalized.issues.length).toBe(2);
    expect(normalized.issues[0].severity).toBe("critical");
    expect(normalized.issues[0].category).toBe("security");
    expect(normalized.issues[0].line).toBe(12);

    expect(normalized.issues[1].line).toBe(25);

    // Summary checks
    expect(normalized.summary.total).toBe(2);
    expect(normalized.summary.critical).toBe(1);
    expect(normalized.summary.warning).toBe(1);
    expect(normalized.summary.suggestion).toBe(0);

    // Health score: 100 - (1*25 + 1*10) = 65
    expect(normalized.codeHealthScore).toBe(65);
    expect(normalized.summary.codeHealthScore).toBe(65);
  });

  test("should handle empty or missing issues array gracefully", () => {
    const rawAiOutput = {
      issues: [],
      overallExplanation: "Code looks good!",
      refactoredCode: "console.log('Clean code');",
    };

    const normalized = normalizeReview(rawAiOutput, "console.log('Clean code');");
    expect(normalized.issues.length).toBe(0);
    expect(normalized.summary.total).toBe(0);
    expect(normalized.codeHealthScore).toBe(100);
  });

  test("should normalize invalid severity and categories to fallback values", () => {
    const rawAiOutput = {
      issues: [
        {
          severity: "UNKNOWN_HIGH_ERR",
          category: "VULNERABILITY",
          title: "Vulnerability found",
          line: -5,
        },
      ],
    };

    const normalized = normalizeReview(rawAiOutput, "sample code");
    expect(normalized.issues[0].severity).toBe("critical");
    expect(normalized.issues[0].category).toBe("security");
    expect(normalized.issues[0].line).toBeNull();
  });
});
