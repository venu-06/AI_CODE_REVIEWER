const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const languageConfig = {
  cpp: {
    language: "cpp",
    filename: "main.cpp",
  },

  java: {
    language: "java",
    filename: "Main.java",
  },

  python: {
    language: "python",
    filename: "main.py",
  },
};

app.use(cors());
app.use(express.json());

app.post("/api/compile", async (req, res) => {
  try {
    const { code, language, stdin } = req.body;

    if (!code) {
      return res.status(400).json({
        stdout: "",
        stderr: "Code is required.",
      });
    }

    const config = languageConfig[language];

    if (!config) {
      return res.status(400).json({
        stdout: "",
        stderr: "Unsupported language.",
      });
    }

    const response = await fetch("https://api.onecompiler.com/v1/run", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.ONECOMPILER_API_KEY,
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
      console.error("OneCompiler error:", data);

      return res.status(response.status).json({
        stdout: "",
        stderr: data.message || "Compilation failed.",
      });
    }

    res.json({
      stdout: data.stdout || "",
      stderr: data.stderr || "",
      executionTime: data.executionTime,
      memory: data.memory,
    });

  } catch (error) {
    console.error("Server error:", error);

    res.status(500).json({
      stdout: "",
      stderr: "Unable to execute code.",
    });
  }
});

app.listen(5000, () => {
  console.log("Compiler server running on http://localhost:5000");
});