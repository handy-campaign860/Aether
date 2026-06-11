import React, { useEffect, useRef, useState } from 'react';
import { FileNode } from '../types';
import { RotateCw, Globe, ExternalLink, ShieldCheck, HelpCircle } from 'lucide-react';

interface LivePreviewProps {
  activeFile: FileNode;
  files: FileNode[];
  onAddLog?: (type: 'log' | 'error' | 'system' | 'command', text: string) => void;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ activeFile, files, onAddLog }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0); // To force reload
  const [debouncedHtml, setDebouncedHtml] = useState('');

  // Helper to compile self-contained preview HTML
  const compilePreview = (): string => {
    if (!activeFile) return '';

    let htmlContent = '';
    
    // Choose starting template depending on file selection
    if (activeFile.name.endsWith('.html') || activeFile.name.endsWith('.htm')) {
      htmlContent = activeFile.content;
    } else if (activeFile.name.endsWith('.js') || activeFile.name.endsWith('.ts') || activeFile.name.endsWith('.jsx') || activeFile.name.endsWith('.tsx')) {
      htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>JS Output Console</title>
  <style>
    body {
      background-color: #0b0c10;
      color: #e2e4e9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 24px;
      margin: 0;
    }
    h3 { 
      color: #c5a880; 
      margin-top: 0; 
      font-weight: 500;
      font-size: 1.1rem;
      border-bottom: 2px solid #1f2026;
      padding-bottom: 12px;
      letter-spacing: -0.01em;
    }
    #console { 
      font-family: "JetBrains Mono", monospace; 
      font-size: 0.85rem;
      white-space: pre-wrap; 
      background: #07070a; 
      padding: 16px; 
      border-radius: 8px; 
      border: 1px solid rgba(197, 168, 128, 0.15); 
      box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);
      line-height: 1.6;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <h3>Output console for ${activeFile.name}</h3>
  <div id="console">Initializing...</div>
  <script>
    (function() {
      const consoleDiv = document.getElementById('console');
      consoleDiv.textContent = ''; // clear initial load
      
      const appendLog = (args, isError = false) => {
        const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ');
        const row = document.createElement('div');
        row.style.color = isError ? '#f87171' : '#e2e4e9';
        row.style.borderBottom = '1px solid #14151a';
        row.style.padding = '4px 0';
        row.textContent = msg;
        consoleDiv.appendChild(row);
      };

      console.log = function(...args) {
        appendLog(args);
      };
      console.error = function(...args) {
        appendLog(args, true);
      };
      console.warn = function(...args) {
        appendLog(args);
      };
      
      window.addEventListener('error', function(e) {
        appendLog([e.message + ' (at line ' + e.lineno + ')'], true);
      });
    })();
  </script>
  <script type="module">
    ${activeFile.content}
  </script>
</body>
</html>`;
    } else if (activeFile.name.endsWith('.css')) {
      htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CSS Demo Sandbox</title>
  <style>
    ${activeFile.content}
  </style>
</head>
<body class="aether-preview-body">
  <div class="aether-card">
    <div style="font-size: 2.5rem; margin-bottom: 12px;">🎨</div>
    <h1>CSS Styling Sandbox</h1>
    <p>This demo interface highlights style updates directly in your current .css sheet.</p>
    <button class="aether-btn">Interactive Core Button</button>
  </div>
  <style>
    /* Default styled elements if no background specified */
    body:not(.aether-preview-body) { padding: 40px; }
    .aether-preview-body {
      background-color: #0b0c10;
      color: #e2e4e9;
      font-family: system-ui, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
    }
    .aether-card {
      background: #0e0f14;
      border: 1px solid rgba(197, 168, 128, 0.15);
      border-radius: 12px;
      padding: 32px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    }
    h1 { color: #c5a880; font-size: 22px; margin-bottom: 12px; font-weight: 500; }
    p { color: #9ca3af; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
    .aether-btn {
      background: #c5a880;
      color: #0b0c10;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .aether-btn:hover { background: #dcd1be; }
  </style>
</body>
</html>`;
    } else {
      // JSON, markdown or unknown formats
      htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { background: #0b0c10; color: #9ca3af; font-family: monospace; padding: 24px; }
    pre { background: #07070a; padding: 16px; border-radius: 6px; border: 1px solid #1f2026; overflow-x: auto; color: #e2e4e9; }
  </style>
</head>
<body>
  <h3>Static File Preview: ${activeFile.name}</h3>
  <pre>${activeFile.content}</pre>
</body>
</html>`;
    }

    // Process linked HTML file dependencies (Stylesheets & scripts) from the tree
    if (activeFile.name.endsWith('.html') || activeFile.name.endsWith('.htm')) {
      // 1. Inlining CSS <link href="style.css"> / <link rel="stylesheet">
      htmlContent = htmlContent.replace(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi, (match, href) => {
        // Find matching CSS file in current files
        const linkedFile = files.find(f => f.name === href && !f.isFolder);
        if (linkedFile) {
          return `<style data-inlined-from="${href}">\n${linkedFile.content}\n</style>`;
        }
        return match;
      });

      htmlContent = htmlContent.replace(/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi, (match, href) => {
        const linkedFile = files.find(f => f.name === href && !f.isFolder);
        if (linkedFile) {
          return `<style data-inlined-from="${href}">\n${linkedFile.content}\n</style>`;
        }
        return match;
      });

      // 2. Inlining JS <script src="app.js"></script>
      htmlContent = htmlContent.replace(/<script\s+[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (match, src) => {
        const linkedFile = files.find(f => f.name === src && !f.isFolder);
        if (linkedFile) {
          return `<script type="module" data-inlined-from="${src}">\n${linkedFile.content}\n</script>`;
        }
        return match;
      });
    }

    // Inject console redirect hooks straight into the iframe head/body to proxy console back to our UI terminal
    const traceHooks = `
      <script>
        (function() {
          const originalLog = console.log;
          const originalError = console.error;
          const originalWarn = console.warn;

          window.addEventListener('error', function(e) {
            window.parent.postMessage({ type: 'iframe-error', text: e.message + ' (line ' + e.lineno + ')' }, '*');
          });

          console.log = function(...args) {
            originalLog.apply(console, args);
            try {
              const text = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
              window.parent.postMessage({ type: 'iframe-log', text }, '*');
            } catch(e) {}
          };

          console.error = function(...args) {
            originalError.apply(console, args);
            try {
              const text = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
              window.parent.postMessage({ type: 'iframe-error', text }, '*');
            } catch(e) {}
          };

          console.warn = function(...args) {
            originalWarn.apply(console, args);
            try {
              const text = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
              window.parent.postMessage({ type: 'iframe-warn', text }, '*');
            } catch(e) {}
          };
        })();
      </script>
    `;

    // Inject hooks before closing head, or at the start of body
    if (htmlContent.includes('<head>')) {
      htmlContent = htmlContent.replace('<head>', '<head>\n' + traceHooks);
    } else if (htmlContent.includes('<body>')) {
      htmlContent = htmlContent.replace('<body>', '<body>\n' + traceHooks);
    } else {
      htmlContent = traceHooks + htmlContent;
    }

    return htmlContent;
  };

  // Debounced compilation on active file or project files alteration
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedHtml(compilePreview());
    }, 280);

    return () => clearTimeout(handler);
  }, [activeFile?.content, activeFile?.id, files]);

  const handleReload = () => {
    setKey(prev => prev + 1);
  };

  const handleOpenNewTab = () => {
    try {
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(debouncedHtml);
        newTab.document.close();
      }
    } catch (e) {
      console.error("Popup blocker prevented opening preview:", e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0c10] border-l border-dark-border">
      {/* Mock Browser URL Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-dark-border bg-[#0e0f14]">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Globe className="w-4 h-4 text-gold flex-shrink-0" />
          <div className="flex-1 bg-dark-bg border border-dark-border rounded px-2.5 py-1 text-xs text-text-muted font-mono truncate select-all flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#4ade80] flex-shrink-0" />
            <span className="opacity-40">sandbox://aether.local/</span>
            <span>{activeFile?.name || 'app.html'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 pl-3">
          <button
            onClick={handleReload}
            className="p-1 px-2 text-text-muted hover:text-gold hover:bg-dark-border/40 rounded transition-colors text-xs flex items-center gap-1"
            title="Reload Sandbox"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono">Reload</span>
          </button>
          
          <button
            onClick={handleOpenNewTab}
            className="p-1 px-2 text-text-muted hover:text-gold hover:bg-dark-border/40 rounded transition-colors text-xs flex items-center gap-1"
            title="Open Sandbox in Browser Context"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono font-medium">Float Tab</span>
          </button>
        </div>
      </div>
      
      {/* Actual Iframe Preview Renderer */}
      <div className="flex-1 w-full h-full bg-white relative">
        <iframe
          key={`${activeFile?.id}-${key}`}
          ref={iframeRef}
          srcDoc={debouncedHtml}
          className="w-full h-full border-none bg-white"
          sandbox="allow-scripts allow-downloads allow-modals allow-popups allow-pointer-lock"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};
