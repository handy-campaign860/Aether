/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileExplorer } from './components/FileExplorer';
import { Editor } from './components/Editor';
import { TerminalPanel } from './components/Terminal';
import { EditorTabs } from './components/EditorTabs';
import { LivePreview } from './components/LivePreview';
import { FileNode, TerminalOutput, TerminalInstance } from './types';
import PyodideWorker from './pyodide.worker.ts?worker';

const DEFAULT_CODE = `# Welcome to Aether IDE
# A dark, graceful environment for Python

def fibonacci(n):
    """Generate Fibonacci sequence up to n."""
    a, b = 0, 1
    result = []
    while a < n:
        result.append(a)
        a, b = b, a + b
    return result

print("Initializing Aether Environment...")
sequence = fibonacci(100)
print(f"Fibonacci sequence up to 100: {sequence}")
`;

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aether Live Web Preview</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="card">
    <div class="icon">🌌</div>
    <h1>Aether Web Engine</h1>
    <p>Live, high-fidelity browser sandbox loaded within your project workspace.</p>
    
    <div class="editor-info">
      <span>Status: <strong id="status">Active</strong></span>
      <span>Engine: <strong>IFrame Sandbox</strong></span>
    </div>

    <button id="action-btn">Trigger Interactive Log</button>
  </div>

  <script src="app.js"></script>
</body>
</html>
`;

const DEFAULT_CSS = `/* Slate & Gold Design System */
body {
  margin: 0;
  padding: 0;
  background: radial-gradient(circle at center, #14151c 0%, #0b0c10 100%);
  color: #e2e4e9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.card {
  background: rgba(14, 15, 20, 0.85);
  border: 1px solid rgba(197, 168, 128, 0.15);
  border-radius: 12px;
  padding: 32px;
  width: 90%;
  max-width: 440px;
  text-align: center;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  transition: border-color 0.3s ease;
}

.card:hover {
  border-color: rgba(197, 168, 128, 0.35);
}

.icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

h1 {
  font-size: 1.8rem;
  color: #c5a880;
  margin: 0 0 12px 0;
  font-weight: 500;
  letter-spacing: -0.025em;
}

p {
  color: #9cb2c0;
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 24px 0;
}

.editor-info {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 10px 14px;
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  font-family: monospace;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

#status {
  color: #4ade80;
}

button {
  background: #c5a880;
  color: #0b0c10;
  border: none;
  border-radius: 6px;
  padding: 12px 24px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}

button:hover {
  background: #d9bd96;
}
`;

const DEFAULT_JS = `// Interactive Scripts for Aether Live Preview
console.log("🌌 Aether Workspace Script Initialized!");

const statusEl = document.getElementById("status");
const actionBtn = document.getElementById("action-btn");

let tapCount = 0;

if (actionBtn) {
  actionBtn.addEventListener("click", () => {
    tapCount++;
    if (statusEl) {
      statusEl.textContent = "Interacted (" + tapCount + ")";
      statusEl.style.color = "#c5a880";
    }
    
    // Send standard log right back to UI console automatically
    console.log("[Web Action] Console logger triggered " + tapCount + " times!");
  });
}
`;

const INITIAL_FILES: FileNode[] = [
  { id: '1', name: 'main.py', content: DEFAULT_CODE },
  { id: '2', name: 'index.html', content: DEFAULT_HTML },
  { id: '3', name: 'style.css', content: DEFAULT_CSS },
  { id: '4', name: 'app.js', content: DEFAULT_JS }
];

export default function App() {
  const [files, setFiles] = useState<FileNode[]>(() => {
    const saved = localStorage.getItem('aether_files');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure standard project files always exist or are loaded appropriately
        if (parsed && parsed.length > 0) {
          return parsed;
        }
        return INITIAL_FILES;
      } catch (e) {
        return INITIAL_FILES;
      }
    }
    return INITIAL_FILES;
  });
  
  const [activeFileId, setActiveFileId] = useState<string>(() => {
    // If we have saved files, find the first or stick with default '1'
    const saved = localStorage.getItem('aether_files');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed[0].id;
      } catch (e) {}
    }
    return '1';
  });

  const [openFileIds, setOpenFileIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('aether_files');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return [parsed[0].id];
      } catch (e) {}
    }
    return ['1'];
  });
  
  const [terminals, setTerminals] = useState<TerminalInstance[]>([{ id: '1', name: 'Terminal 1', output: [] }]);
  const [activeTerminalId, setActiveTerminalId] = useState<string>('1');
  const activeTerminalIdRef = useRef('1');

  useEffect(() => {
    activeTerminalIdRef.current = activeTerminalId;
  }, [activeTerminalId]);

  const [isPyodideReady, setIsPyodideReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    localStorage.setItem('aether_files', JSON.stringify(files));
  }, [files]);

  const addLog = useCallback((type: 'log' | 'error' | 'system' | 'command', text: string) => {
    setTerminals(prev => prev.map(t => 
      t.id === activeTerminalIdRef.current 
        ? { ...t, output: [...t.output, { id: crypto.randomUUID(), type, text, timestamp: Date.now() }] }
        : t
    ));
  }, []);

  useEffect(() => {
    addLog('system', 'Loading Pyodide environment in background worker...');
    const worker = new PyodideWorker();
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, text, error, action, formattedCode, fileId } = e.data;
      if (type === 'ready') {
        setIsPyodideReady(true);
        addLog('system', 'Aether environment ready.');
      } else if (type === 'stdout') {
        if (action !== 'format') {
          addLog('log', text);
        }
      } else if (type === 'stderr') {
        if (action !== 'format') {
          addLog('error', text);
        }
      } else if (type === 'done') {
        if (action === 'format') {
          setIsFormatting(false);
          setFiles(prev => prev.map(f => 
            f.id === fileId && formattedCode !== undefined ? { ...f, content: formattedCode } : f
          ));
          addLog('system', '> Formatted code successfully.');
        } else {
          addLog('system', '> Execution completed successfully.');
          setIsRunning(false);
        }
      } else if (type === 'error') {
        if (action === 'format') {
          setIsFormatting(false);
          addLog('error', `Formatting error: ${error}`);
        } else {
          addLog('error', error);
          setIsRunning(false);
        }
      }
    };

    return () => {
      worker.terminate();
    };
  }, []);



  const handleAddTerminal = () => {
    const newId = crypto.randomUUID();
    const name = `Terminal ${terminals.length + 1}`;
    setTerminals(prev => [...prev, { id: newId, name, output: [] }]);
    setActiveTerminalId(newId);
  };

  const handleSelectTerminal = (id: string) => {
    setActiveTerminalId(id);
  };

  const handleRemoveTerminal = (id: string) => {
    setTerminals(prev => {
      const next = prev.filter(t => t.id !== id);
      if (activeTerminalId === id) {
        setActiveTerminalId(next.length > 0 ? next[next.length - 1].id : '');
      }
      return next;
    });
  };

  const handleClearTerminal = () => {
    setTerminals(prev => prev.map(t => 
      t.id === activeTerminalId ? { ...t, output: [] } : t
    ));
  };

  const handleCommand = (command: string) => {
    if (!command.trim()) return;
    
    addLog('command', command);

    if (command.trim() === 'clear') {
      handleClearTerminal();
      return;
    }
    
    if (!isPyodideReady || !workerRef.current) {
      addLog('error', 'Environment is not ready yet. Please wait.');
      return;
    }

    setIsRunning(true);
    
    let pythonCode = command;
    if (command.startsWith('pip install ')) {
      const pkg = command.replace('pip install ', '').trim();
      addLog('system', `Installing package ${pkg}...`);
      pythonCode = `
import micropip
import sys

try:
    await micropip.install("${pkg}")
    print("Successfully installed ${pkg}")
except Exception as e:
    print(f"Error installing ${pkg}: {e}", file=sys.stderr)
`;
    }

    workerRef.current.postMessage({ action: 'run', id: Date.now(), python: pythonCode });
  };

  const handleRun = useCallback(() => {
    const activeFile = files.find(f => f.id === activeFileId);
    if (!activeFile) return;

    const ext = activeFile.name.split('.').pop()?.toLowerCase() || '';
    const isWebFile = ['html', 'htm', 'js', 'jsx', 'ts', 'tsx', 'css'].includes(ext);

    if (isWebFile) {
      addLog('system', `> Refreshing sandbox live preview for ${activeFile.name}...`);
      if (!isPreviewOpen) {
        setIsPreviewOpen(true);
      }
      addLog('log', `[Web Engine] Frame refreshed successfully.`);
      return;
    }

    if (!isPyodideReady || !workerRef.current) {
      addLog('error', 'Pyodide environment is not ready yet. Please wait.');
      return;
    }

    setIsRunning(true);
    addLog('system', `> Executing ${activeFile.name}...`);
    
    workerRef.current.postMessage({ action: 'run', id: Date.now(), python: activeFile.content });
  }, [files, activeFileId, isPyodideReady, isPreviewOpen, addLog]);

  const handleFormat = () => {
    if (!isPyodideReady || !workerRef.current) {
      addLog('error', 'Environment is not ready yet. Please wait.');
      return;
    }

    const activeFile = files.find(f => f.id === activeFileId);
    if (!activeFile) return;

    setIsFormatting(true);
    
    workerRef.current.postMessage({ 
      action: 'format', 
      id: Date.now(), 
      python: activeFile.content,
      fileId: activeFile.id
    });
  };

  const handleSelectFile = (id: string) => {
    setActiveFileId(id);
    setOpenFileIds(prev => {
      if (!prev.includes(id)) {
        return [...prev, id];
      }
      return prev;
    });
  };

  const handleAddFile = (name: string, content: string = '# New script\n', isFolder: boolean = false, parentId: string | null = null) => {
    const newFile: FileNode = {
      id: crypto.randomUUID(),
      name,
      content,
      isFolder,
      parentId
    };
    setFiles(prev => [...prev, newFile]);
    if (!isFolder) {
      handleSelectFile(newFile.id);
    }
  };

  const handleCloseTab = (id: string) => {
    setOpenFileIds(prev => {
      const next = prev.filter(fId => fId !== id);
      if (activeFileId === id) {
        setActiveFileId(next.length > 0 ? next[next.length - 1] : '');
      }
      return next;
    });
  };

  const handleDeleteFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    handleCloseTab(id);
  };

  const handleRenameFile = (id: string, newName: string) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, name: newName } : f
    ));
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined) return;
    setFiles(prev => prev.map(f => 
      f.id === activeFileId ? { ...f, content: value } : f
    ));
  };

  const activeFile = files.find(f => f.id === activeFileId);
  const [showCredits, setShowCredits] = useState(false);

  // Sync web sandbox iframe outputs with active IDE console
  useEffect(() => {
    const handleIframeMessage = (e: MessageEvent) => {
      if (e.data) {
        if (e.data.type === 'iframe-log') {
          addLog('log', `[Web Logger] ${e.data.text}`);
        } else if (e.data.type === 'iframe-warn') {
          addLog('system', `[Web Warning] ${e.data.text}`);
        } else if (e.data.type === 'iframe-error') {
          addLog('error', `[Web Error] ${e.data.text}`);
        }
      }
    };
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [addLog]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
      if (e.shiftKey && e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        handleFormat();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('new-file-shortcut'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRun, handleFormat]);

  return (
    <div className="h-screen flex bg-dark-bg text-text-main overflow-hidden relative">
      {showCredits && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-dark-panel border border-dark-border rounded-lg shadow-2xl max-w-sm w-full p-6 relative">
            <button 
              onClick={() => setShowCredits(false)} 
              className="absolute top-4 right-4 text-text-muted hover:text-text-main transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h2 className="text-xl font-serif text-gold mb-4">Credits</h2>
            <p className="text-text-main mb-4">Aether IDE</p>
            <div className="bg-[#0e0f14] p-4 rounded-md border border-dark-border">
              <p className="text-text-muted text-sm">Special thanks and credits to:</p>
             <p className="text-gold font-medium mt-1">
  Zen (GitHub:{" "}
  <a
    href="https://github.com/zenformality"
    target="_blank"
    rel="noopener noreferrer"
    className="underline"
  >
    zenformality
  </a>
  )
</p>
            </div>
          </div>
        </div>
      )}
      <div className="w-64 min-w-[250px] max-w-xs h-full bg-dark-bg border-r border-dark-border z-10 flex flex-col flex-shrink-0 relative">
        <button 
          onClick={() => setShowCredits(true)}
          className="absolute bottom-4 right-4 z-20 w-8 h-8 flex items-center justify-center bg-dark-panel border border-dark-border rounded-full text-gold hover:bg-gold hover:text-dark-bg transition-colors shadow-lg"
          title="Credits & Info"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </button>
        <FileExplorer
          files={files}
          activeFileId={activeFileId}
          onSelectFile={handleSelectFile}
          onAddFile={handleAddFile}
          onDeleteFile={handleDeleteFile}
          onRenameFile={handleRenameFile}
        />
      </div>
      
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <div className="flex-1 flex flex-col min-h-0 bg-[#0b0c10]">
          <EditorTabs
            files={files}
            openFileIds={openFileIds}
            activeFileId={activeFileId}
            onSelectTab={handleSelectFile}
            onCloseTab={handleCloseTab}
          />
          <div className="flex-1 min-h-0 relative flex flex-row">
            {activeFile ? (
              <>
                <div className="flex-1 min-w-0 h-full">
                  <Editor
                    content={activeFile.content}
                    onChange={handleEditorChange}
                    onRun={handleRun}
                    onFormat={activeFile.name.endsWith('.py') ? handleFormat : undefined}
                    isRunning={activeFile.name.endsWith('.py') ? (isRunning || !isPyodideReady) : false}
                    isFormatting={isFormatting}
                    fileName={activeFile.name}
                    isPreviewOpen={isPreviewOpen}
                    onTogglePreview={() => setIsPreviewOpen(prev => !prev)}
                  />
                </div>
                {isPreviewOpen && ['html', 'htm', 'js', 'jsx', 'ts', 'tsx', 'css'].includes(activeFile.name.split('.').pop()?.toLowerCase() || '') && (
                  <div className="w-1/2 min-w-[320px] h-full flex-shrink-0 border-l border-dark-border">
                    <LivePreview
                      activeFile={activeFile}
                      files={files}
                      onAddLog={addLog}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-text-muted italic font-serif opacity-60">
                Select or create a file to start coding.
              </div>
            )}
          </div>
        </div>
        
        <div className="h-64 min-h-[200px] border-t border-dark-border flex flex-col">
          <TerminalPanel
            terminals={terminals}
            activeTerminalId={activeTerminalId}
            onSelectTerminal={handleSelectTerminal}
            onAddTerminal={handleAddTerminal}
            onRemoveTerminal={handleRemoveTerminal}
            onClear={handleClearTerminal}
            onCommand={handleCommand}
            isRunning={isRunning}
          />
        </div>
      </div>
    </div>
  );
}
