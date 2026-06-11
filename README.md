# 🌌 Aether Python IDE

A dark, graceful, and highly performant web-based IDE for Python development, designed with a focus on Zen aesthetics, modular space, and in-browser compilation.

---

## ✨ Features

- **🎮 Pyodide-Powered In-Browser Runtime**
  - Executes Python scripts natively in the browser using WebAssembly.
  - Leverages a background **Web Worker** pool for non-blocking execution, ensuring UI animations and Monaco inputs remain fluid at 60 FPS.
  - Smart fallback loader for both module-type-supported environments and legacy browsers.
  
- **📝 Monaco-Powered Multi-Tab Workspace**
  - Full-featured code editor with syntax highlighting, auto-completions, bracket matching, and configurable themes.
  - Dynamic tab management with file persistence in standard local state.
  - Handy custom shortcuts: Run script (`Ctrl+Enter` / `Cmd+Enter`), Format (`Shift+Alt+F`), and Creating new files (`Ctrl+N` / `Cmd+N`).

- **📁 Interactive Nested Project Workspace**
  - Create, nesting, and organizing files and folders intuitively.
  - Built-in capabilities to upload local files directly, download scripts individually, search through files, and perform full rename/delete management.

- **📟 Interactive Built-in Terminal**
  - Modern console interface to view stdout, stderr, and run diagnostics immediately.
  - Visual color highlights for script initialization, execution logs, and runtime failures.

- **🎨 Minimalistic & Immersive Aesthetics**
  - Sleek custom dark theme accented with golden status highlights.
  - Elegant modal views like the Zen-focused "Credits & Info" panel.

---

## 🛠️ Technology Stack

- **Framework**: [React 19](https://react.dev) & [TypeScript](https://www.typescript.org) for strict, secure layouts.
- **Bundler**: [Vite 6](https://vite.dev) for high-speed module compilation.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) utilizing precise tracking, luxury line-height intervals, and sophisticated off-black backgrounds.
- **Editor Core**: [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react) for top-tier editor usability.
- **Icons**: [Lucide React](https://lucide.dev) for lightweight minimalist iconography.
- **Runtime Compilation**: [Pyodide v0.25.0](https://pyodide.org/) for Python running directly on target web workers.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18+ recommended)
- npm (pre-installed with Node.js)

### Installation

1. Clone or download the workspace.
2. Install the necessary dependencies:
   ```bash
   npm install
   ```

### Running the Application

Start the local development server:
```bash
npm run dev
```

The application will launch on your local environment at `http://localhost:3000`.

---

## ⚙️ Architecture under the Hood

### Responsive Workers & Pyodide Core
The heart of Aether's runtime resides in `/src/pyodide.worker.ts`. It acts as a dedicated worker thread communicating with React through cross-origin message-passing events. It intercepts Pyodide's standard streams, redirecting standard stdout and error channels directly back to the active log viewer. It handles modern module dynamic standard import methods synchronously fallback-protected alongside classic `importScripts` for absolute cross-platform container reliability.

---

## 📜 Credits

- Built with precision by **Zen** (GitHub: [zenformality](https://github.com/zenformality)).
