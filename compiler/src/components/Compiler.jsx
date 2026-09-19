import { useState } from "react";
import { defaultCode, getFileName, languageOptions } from "../data/defaultCode";
import "./Compiler.css";
import Sidebar from "./Sidebar";
import EditorPanel from "./EditorPanel";
import ConsolePanel from "./ConsolePanel";

export default function Compiler() {
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(defaultCode.cpp);
  const [stdin, setStdin] = useState("10\n20");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    setCode(defaultCode[newLanguage]);
    setOutput("");
    setError("");
  };

  const runCode = async () => {
    setLoading(true);
    setOutput("");
    setError("");

    try {
      const response = await fetch("http://localhost:5000/api/compile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          code,
          stdin,
        }),
      });

      const data = await response.json();

      setOutput(data.stdout || "");
      setError(data.stderr || "");

      if (!response.ok && !data.stderr) {
        setError("Compilation failed.");
      }
    } catch (err) {
      console.error(err);
      setError(
        "Could not connect to the compiler server. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetCode = () => {
    setCode(defaultCode[language]);
    setOutput("");
    setError("");
    setStdin("");
  };

  const clearConsole = () => {
    setOutput("");
    setError("");
  };

  return (
    <div className="compiler-shell">
      <Sidebar
        language={language}
        onLanguageChange={handleLanguageChange}
        onResetCode={resetCode}
        onClearConsole={clearConsole}
        loading={loading}
        languageOptions={languageOptions}
      />

      <main className="workspace-panel">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Online IDE</p>
            <h2>{getFileName(language)}</h2>
          </div>

          <div className="workspace-actions">
            <button type="button" className="header-button">
              Copy link
            </button>
            <button
              type="button"
              className="run-button"
              onClick={runCode}
              disabled={loading}
            >
              {loading ? "Running..." : "Run code"}
            </button>
          </div>
        </header>

        <div className="content-grid">
          <EditorPanel
            language={language}
            code={code}
            onCodeChange={(value) => setCode(value)}
          />

          <ConsolePanel
            stdin={stdin}
            output={output}
            error={error}
            onStdinChange={setStdin}
          />
        </div>
      </main>
    </div>
  );
}
