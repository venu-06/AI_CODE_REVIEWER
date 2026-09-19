# AI Code Reviewer & Refactor Assistant

A state-of-the-art, developer-first web application for **AI-powered code auditing**, **vulnerability detection**, **refactoring**, and **live multi-language compilation**. Designed as an on-demand mentor for students and early-career software engineering teams.

Powered by **Groq AI (120B inference engine)** and built with **React 19**, **Vite**, **Monaco Editor**, **Node.js**, **Express**, **Winston Logging**, **Jest Testing**, and **MongoDB**.

---

## 🌟 Key Features

### 🔍 AI Code Audit & Security Inspection
- **OWASP Vulnerability Scanning**: Automatically detects critical security flaws (SQL Injection, Hardcoded Secrets, Buffer Overflows, XSS, Path Traversal, Unsafe Dynamic Execution `eval`).
- **Code Quality & Complexity Analysis**: Computes Time & Space Big-O complexity ($O(N)$, $O(1)$, $O(N^2)$) and categorizes findings into severity tiers (*Critical*, *Warning*, *Suggestion*).
- **Code Health Score (0–100%)**: Computes a dynamic quantitative code quality score with color-coded visual progress cards (Green $\ge 80\%$, Yellow $50–79\%$, Red $<50\%$).
- **Junior Developer Mode**: Toggle switch that translates complex architectural findings into intuitive explanations tailored for junior developers ("What is wrong?", "Why is it a problem?", "How can I fix it?").

### ⚡ Side-by-Side Diff & Refactoring
- **Production-Ready Refactored Code**: Generates clean, secure replacement code fixing identified vulnerabilities while preserving original functionality.
- **Monaco DiffViewer**: Integrated side-by-side original vs. refactored code comparison.
- **✨ Apply Fix to Editor**: One-click action button that substitutes AI refactored code directly into the active Monaco code editor.
- **📄 Downloadable Audit Report**: Export complete audit findings, health score, issue breakdowns, and refactored code into downloadable **Markdown (`.md`)** reports or print-ready PDF formats.

### 🤖 Context-Aware Floating Copilot Chatbot
- **Floating Bottom-Right Widget**: Always-accessible AI assistant overlaying the workspace without obscuring code.
- **Full Context Memory**: Automatically stays synced with the active review document (original code, findings, refactored solution, and language).
- **User-Resizable Window**: Drag top, left, or top-left corner handles to resize width (300px to 700px) and height (300px to 800px) with `localStorage` persistence.

### 🖥️ Interactive Resizable History Workspace
- **ChatGPT-Style Review List**: Search and filter reviews grouped by relative date (*TODAY*, *YESTERDAY*, *PREVIOUS 7 DAYS*, *OLDER*).
- **Dual-Pane Resizable Split**: Interactive horizontal drag divider allowing the **AI Review panel** to expand up to **85–90%** of workspace height.
- **Preset Buggy Code Samples**: Built-in vulnerable code snippets for **Java** (SQL injection & hardcoded secrets), **Python** (SQL injection & off-by-one loop), and **JavaScript** (unsafe eval & memory leak) for instant live demonstrations.

### 🚀 Live Compiler & Dry-Run Syntax Validation
- **Multi-Language Execution**: Compile and execute **C++**, **Java**, **Python**, **JavaScript**, **C**, **C#**, **Go**, **Rust**, **PHP**, **Ruby**.
- **Syntax Dry-Run Mode**: Pre-flight validation mode that verifies bracket balance, unclosed braces, and syntax structure before sending code to the compiler engine.
- **Performance Metrics**: Live tracking of **Execution Time (ms)** and **Memory Usage (KB)**.

---

## 🛠️ Technology Stack & Engineering Architecture

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19, Vite 8, React Router DOM v7 | Modern single-page app architecture |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) | VS Code editing engine & diff view |
| **Backend Runtime** | Node.js (v18+), Express.js (v5) | High-performance API server |
| **Logging & Observability** | Winston Logger (`winston`) | Production structured JSON & HTTP logging |
| **Automated Testing** | Jest (`jest`), Supertest | Unit testing suite for AI parsing & compiler logic |
| **Database** | MongoDB & Mongoose ORM | User authentication & isolated review storage |
| **AI Inference Engine** | Groq Cloud LLM (OpenAI SDK) | Fast structured JSON code audit & refactoring |
| **API Documentation** | OpenAPI 3.0 / Swagger HTML | Interactive API docs at `/api/docs` |

---

## 📁 Detailed Directory & File Breakdown

### 🖥️ Frontend Architecture (`auth-app/Frontend/src`)

```
Frontend/src/
├── components/
│   ├── AppLayout.jsx          # Top navigation bar, user dropdown & main container layout
│   ├── AuthLayout.jsx         # Card wrapper layout for login, registration & password screens
│   ├── CodeEditor.jsx         # Monaco Editor component wrapper with syntax highlighting & auto-resize
│   ├── Copilot.jsx            # Context-aware chat UI component with streaming responses & prompt chips
│   ├── DiffViewer.jsx         # Monaco Diff Editor showing side-by-side original vs refactored code
│   ├── FileUploader.jsx       # File dropzone & file picker supporting Python, JS, Java, C++, SQL, etc.
│   ├── IssueCard.jsx          # Expandable severity-tagged issue card (Critical / Warning / Suggestion)
│   ├── Loading.jsx            # Skeleton loader and animated spinner overlay
│   ├── ProtectedRoute.jsx     # Auth guard component checking active JWT token session
│   ├── ReviewFilters.jsx      # Filter buttons bar for Severity (Critical/Warn/Suggest) & Category
│   └── ReviewSummary.jsx      # Overview cards grid rendering Code Health Score (0-100%) & summary
├── pages/
│   ├── CompilerWorkspace.jsx  # Full-screen code compiler page with resizable console & Dry-Run mode
│   ├── Dashboard.jsx          # User dashboard container with sidebar navigation
│   ├── DashboardHome.jsx      # Analytics dashboard displaying code health trends & audit metrics
│   ├── HistoryWorkspace.jsx   # Resizable code review workspace with floating Copilot & report export
│   ├── Login.jsx              # User login authentication page
│   ├── Register.jsx           # User registration page
│   ├── SetPassword.jsx        # Password reset page
│   └── VerifyOtp.jsx          # 6-digit email OTP verification page
├── services/
│   ├── authApi.js             # API client for registration, login, OTP verification & session profile
│   ├── compilerApi.js         # API client for live code execution & Dry-Run pre-flight check
│   └── reviewPersistenceApi.js# API client for review document CRUD & Groq AI audit endpoints
├── App.jsx                    # Root application routes router definition
├── App.css                    # Keyframe animations & modal overlay styles
└── index.css                  # Master CSS design system with CSS tokens, dark mode & layout rules
```

### ⚙️ Backend Architecture (`auth-app/Backend`)

```
Backend/
├── config/
│   ├── db.js                  # Mongoose MongoDB connection initializer
│   └── passport.js            # Passport authentication configuration
├── controllers/
│   ├── authController.js      # Register, OTP verify, login, logout, and profile handlers
│   ├── compilerController.js  # OneCompiler execution API handler & validateSyntaxDryRun validator
│   ├── reviewController.js    # One-shot code audit & copilot chat handlers
│   └── reviewHistoryController.js # MongoDB isolated user review history CRUD & analytics handlers
├── middleware/
│   └── authMiddleware.js      # JWT cookie authentication middleware
├── models/
│   ├── Otp.js                 # Temporary 6-digit OTP verification schema
│   ├── Review.js              # Comprehensive Code Review document schema (issues, health score, diff)
│   └── User.js                # User account schema with password hashing
├── routes/
│   ├── authRoutes.js          # Express endpoints under /api/auth
│   ├── compilerRoutes.js      # Express endpoints under /api/compile
│   ├── docsRoutes.js          # OpenAPI HTML documentation endpoint under /api/docs
│   └── reviewRoutes.js        # Express endpoints under /api/reviews
├── services/
│   ├── aiChatService.js       # Groq AI conversational copilot handler
│   └── aiReviewService.js     # Groq AI code auditor, JSON extractor, & health score calculator
├── tests/
│   ├── aiReviewService.test.js# Jest unit tests for AI JSON parsing, fallback logic & score calculation
│   └── compilerController.test.js # Jest unit tests for syntax dry-run validator & language config
├── utils/
│   └── logger.js              # Winston logger utility providing structured logging
├── server.js                  # Main Express app entry point with Winston HTTP middleware
└── package.json
```

---

## 🧪 Automated Testing & Observability

### Running Backend Tests (Jest)
Automated unit test suites verify AI response normalization, JSON extraction from markdown fences, severity/category validation, code health score calculation, and compiler dry-run syntax checks:

```bash
cd auth-app/Backend
npm test
```

**Test Output Verification:**
```
PASS tests/aiReviewService.test.js
PASS tests/compilerController.test.js

Test Suites: 2 passed, 2 total
Tests:       7 passed, 7 total
Snapshots:   0 total
Time:        16.173 s
```

### Structured Production Logging (Winston)
The backend utilizes **Winston Logger** (`Backend/utils/logger.js`) for structured observability:
- **HTTP Middleware**: Logs every incoming HTTP request method, URL, status code, response duration, and IP address.
- **Error Tracking**: Logs structured JSON stack traces and context metadata for AI parsing errors and database exceptions.

---

## 📡 Interactive API Documentation

Interactive API documentation is served directly by the backend at:
- **HTML API Documentation**: `http://localhost:5000/api/docs`
- **OpenAPI JSON Spec**: `http://localhost:5000/api/docs/json`

### Core Endpoints Summary

| Route | Method | Description |
| :--- | :--- | :--- |
| `/api/docs` | `GET` | Interactive Swagger API documentation |
| `/api/auth/register` | `POST` | Register new user account & send OTP code |
| `/api/auth/login` | `POST` | Authenticate user & set JWT cookie |
| `/api/reviews` | `GET` | List all saved reviews for authenticated user |
| `/api/reviews` | `POST` | Create a new code review workspace |
| `/api/reviews/:id/analyze` | `POST` | Run Groq AI audit, security check & refactor |
| `/api/compile` | `POST` | Execute code or run syntax dry-check (`dryRun: true`) |

---

## 🚦 Quick Start Guide

### 1. Backend Setup
```bash
cd auth-app/Backend
npm install
npm run dev
```
*Backend runs on `http://localhost:5000`.*

### 2. Frontend Setup
```bash
cd auth-app/Frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 📄 License
Released under the **ISC License**.
