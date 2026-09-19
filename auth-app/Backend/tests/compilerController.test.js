const { validateSyntaxDryRun, languageConfig } = require("../controllers/compilerController");

describe("Compiler Dry-Run Syntax Validator", () => {
  test("should pass for well-formed code with balanced brackets", () => {
    const validCode = `function test() {
      const arr = [1, 2, 3];
      console.log((arr[0] + arr[1]));
    }`;

    const result = validateSyntaxDryRun(validCode, "javascript");
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test("should detect unclosed curly braces", () => {
    const invalidCode = `function test() {
      console.log("Missing brace");
    `;

    const result = validateSyntaxDryRun(invalidCode, "javascript");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Unclosed '{'");
  });

  test("should detect mismatched closing parentheses", () => {
    const invalidCode = `const val = (1 + 2];`;

    const result = validateSyntaxDryRun(invalidCode, "javascript");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Mismatched closing ']'");
  });

  test("should support configured languages", () => {
    expect(languageConfig["python"]).toBeDefined();
    expect(languageConfig["cpp"]).toBeDefined();
    expect(languageConfig["java"]).toBeDefined();
  });
});
