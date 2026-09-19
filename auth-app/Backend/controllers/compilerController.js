const logger = require("../utils/logger");

const languageConfig = {
  cpp: { language: "cpp", filename: "main.cpp" },
  "c++": { language: "cpp", filename: "main.cpp" },
  c: { language: "c", filename: "main.c" },
  java: { language: "java", filename: "Main.java" },
  python: { language: "python", filename: "main.py" },
  python3: { language: "python", filename: "main.py" },
  javascript: { language: "javascript", filename: "index.js" },
  typescript: { language: "typescript", filename: "index.ts" },
  csharp: { language: "csharp", filename: "Program.cs" },
  "c#": { language: "csharp", filename: "Program.cs" },
  go: { language: "go", filename: "main.go" },
  rust: { language: "rust", filename: "main.rs" },
  php: { language: "php", filename: "index.php" },
  ruby: { language: "ruby", filename: "main.rb" },
};

/**
 * Perform pre-flight dry-run syntax check on source code.
 */
function validateSyntaxDryRun(code, language) {
  const errors = [];
  
  // Bracket matching validation
  const stack = [];
  const matchingBrackets = { "}": "{", ")": "(", "]": "[" };
  const lines = code.split("\n");

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (["{", "(", "["].includes(char)) {
        stack.push({ char, line: lineIdx + 1, col: charIdx + 1 });
      } else if (["}", ")", "]"].includes(char)) {
        if (stack.length === 0) {
          errors.push(`Unmatched closing '${char}' at line ${lineIdx + 1}, column ${charIdx + 1}`);
        } else {
          const top = stack.pop();
          if (top.char !== matchingBrackets[char]) {
            errors.push(`Mismatched closing '${char}' at line ${lineIdx + 1}, expected closing for '${top.char}' from line ${top.line}`);
          }
        }
      }
    }
  }

  while (stack.length > 0) {
    const unclosed = stack.pop();
    errors.push(`Unclosed '${unclosed.char}' opened at line ${unclosed.line}, column ${unclosed.col}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Executes code via OneCompiler API with support for pre-flight Dry-Run validation
 * POST /api/compile or /api/compiler/compile
 */
const compileCode = async (req, res) => {
  try {
    const { code, language, stdin, dryRun } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        stdout: "",
        stderr: "Code is required.",
      });
    }

    const langKey = String(language || "").toLowerCase().trim();
    const config = languageConfig[langKey];

    if (!config) {
      return res.status(400).json({
        success: false,
        stdout: "",
        stderr: `Unsupported language "${language}". Supported languages are: C++, Java, Python, JavaScript, TypeScript, C, C#, Go, Rust, PHP, Ruby.`,
      });
    }

    // Run Dry-Run pre-flight validation if dryRun flag is set or requested
    const dryRunResult = validateSyntaxDryRun(code, langKey);
    if (dryRun) {
      return res.json({
        success: dryRunResult.valid,
        dryRun: true,
        valid: dryRunResult.valid,
        stdout: dryRunResult.valid ? "Dry run syntax check passed! Code has valid balanced structure." : "",
        stderr: dryRunResult.valid ? "" : `Dry run syntax errors found:\n${dryRunResult.errors.join("\n")}`,
      });
    }

    const apiKey = process.env.ONECOMPILER_API_KEY;
    if (!apiKey) {
      logger.error("ONECOMPILER_API_KEY environment variable is not configured.");
      return res.status(500).json({
        success: false,
        stdout: "",
        stderr: "Compiler service is not configured properly on the server.",
      });
    }

    const response = await fetch("https://api.onecompiler.com/v1/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        language: config.language,
        stdin: stdin || "",
        files: [
          {
            name: config.filename,
            content: code,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error("OneCompiler API error response:", data);
      return res.status(response.status).json({
        success: false,
        stdout: data.stdout || "",
        stderr: data.stderr || data.message || "Compilation failed.",
      });
    }

    return res.json({
      success: true,
      stdout: data.stdout || "",
      stderr: data.stderr || "",
      executionTime: data.executionTime ?? null,
      memory: data.memory ?? null,
      syntaxCheck: dryRunResult,
    });
  } catch (error) {
    logger.error("Compiler server error:", { error: error.message });
    return res.status(500).json({
      success: false,
      stdout: "",
      stderr: "Unable to execute code. Internal server error.",
    });
  }
};

module.exports = {
  compileCode,
  validateSyntaxDryRun,
  languageConfig,
};
