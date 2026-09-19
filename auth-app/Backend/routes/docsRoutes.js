const express = require("express");
const router = express.Router();

const apiDoc = {
  openapi: "3.0.0",
  info: {
    title: "AI-Powered Code Review & Refactor Assistant API",
    version: "1.0.0",
    description: "REST API for AI-assisted automated code auditing, refactoring, compiler execution, and historical code review management.",
    contact: {
      name: "G. Dimbu Sai Mahesh",
      email: "student@example.com"
    }
  },
  paths: {
    "/api/review/analyze": {
      post: {
        summary: "Analyze code for bugs, security vulnerabilities, and code smells",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  code: { type: "string", example: "function add(a, b) { return a + b; }" },
                  language: { type: "string", example: "javascript" },
                  juniorMode: { type: "boolean", example: false }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Structured review response with code health score, issues list, and refactored code." }
        }
      }
    },
    "/api/compile/run": {
      post: {
        summary: "Compile and execute code via OneCompiler API with optional dry-run syntax check",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  language: { type: "string" },
                  stdin: { type: "string" },
                  dryRun: { type: "boolean" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Execution results containing stdout, stderr, and execution time." }
        }
      }
    },
    "/api/reviews/history": {
      get: {
        summary: "Get user review history list",
        responses: { "200": { description: "List of saved reviews." } }
      }
    }
  }
};

router.get("/json", (req, res) => {
  res.json(apiDoc);
});

router.get("/", (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>API Documentation - AI Code Reviewer</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0d1117; color: #c9d1d9; margin: 0; padding: 2rem; }
    h1 { color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 0.5rem; }
    .endpoint { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1.25rem; margin-bottom: 1rem; }
    .method { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: bold; font-size: 0.85rem; margin-right: 0.5rem; }
    .post { background: #238636; color: #fff; }
    .get { background: #1f6feb; color: #fff; }
    .path { font-family: monospace; font-size: 1.1rem; color: #f0f6fc; }
    pre { background: #0d1117; padding: 1rem; border-radius: 6px; overflow-x: auto; color: #7ee787; border: 1px solid #30363d; }
  </style>
</head>
<body>
  <h1>AI Code Reviewer & Assistant API Documentation</h1>
  <p>Version 1.0.0 — Automated Code Audit & Execution Engine API</p>
  
  <div class="endpoint">
    <span class="method post">POST</span> <span class="path">/api/review/analyze</span>
    <p>Submit source code for AI-powered security, bug, and performance audit.</p>
    <h4>JSON Request Payload:</h4>
    <pre>{\n  "code": "const query = 'SELECT * FROM users WHERE id=' + input;",\n  "language": "javascript",\n  "juniorMode": true\n}</pre>
  </div>

  <div class="endpoint">
    <span class="method post">POST</span> <span class="path">/api/compile/run</span>
    <p>Compile and run source code with optional pre-flight dry-run syntax check.</p>
    <h4>JSON Request Payload:</h4>
    <pre>{\n  "code": "console.log('Hello World');",\n  "language": "javascript",\n  "dryRun": false\n}</pre>
  </div>

  <div class="endpoint">
    <span class="method get">GET</span> <span class="path">/api/reviews/history</span>
    <p>Fetch user saved review history grouped by date.</p>
  </div>
</body>
</html>`;
  res.send(html);
});

module.exports = router;
