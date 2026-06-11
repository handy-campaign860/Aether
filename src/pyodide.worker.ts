/// <reference lib="webworker" />

// Ensure fetch is configurable so Pyodide doesn't crash when trying to patch it
if (typeof window === 'undefined' && typeof self !== 'undefined') {
  const originalFetch = self.fetch;
  try {
    Object.defineProperty(self, 'fetch', {
      value: originalFetch,
      writable: true,
      configurable: true
    });
  } catch (e) {
    console.warn("Could not redefine fetch:", e);
  }
}

let loadPyodide: any;

// Compatibly load Pyodide in both classic and module workers
if (typeof importScripts === 'function') {
  try {
    // Classic web worker compatibility inside built/production environments
    importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");
    loadPyodide = (self as any).loadPyodide;
  } catch (e) {
    console.warn("importScripts failed in worker pool, falling back to dynamic import:", e);
  }
}

let pyodideReadyPromise;

async function loadPyodideAndPackages() {
  if (!loadPyodide) {
    // Module worker compatibility (e.g. Vite dev or modern module workers)
    // @ts-ignore
    const pyodideModule = await import("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.mjs");
    loadPyodide = pyodideModule.loadPyodide;
  }

  // @ts-ignore
  self.pyodide = await loadPyodide({
    stdout: (text) => {
      self.postMessage({ type: 'stdout', text, action: 'run' });
    },
    stderr: (text) => {
      self.postMessage({ type: 'stderr', text, action: 'run' });
    }
  });

  // Load and install autopep8 for formatting
  // @ts-ignore
  await self.pyodide.loadPackage("micropip");
  // @ts-ignore
  const micropip = self.pyodide.pyimport("micropip");
  await micropip.install("autopep8");

  self.postMessage({ type: 'ready' });
}

pyodideReadyPromise = loadPyodideAndPackages();

self.onmessage = async (event) => {
  const { id, python, action, fileId } = event.data;
  await pyodideReadyPromise;
  
  if (action === 'format') {
    try {
      // Use autopep8 to format the code
      // @ts-ignore
      const autopep8 = self.pyodide.pyimport("autopep8");
      
      // format_code is standard autopep8 API? Actually fix_code
      // Wait, autopep8.fix_code(python) returns formatted code
      const formattedCode = autopep8.fix_code(python);
      
      self.postMessage({ type: 'done', action: 'format', id, fileId, formattedCode });
    } catch (error) {
      self.postMessage({ type: 'error', action: 'format', id, fileId, error: error.message });
    }
    return;
  }

  // Handle run python
  try {
    // @ts-ignore
    await self.pyodide.runPythonAsync(python);
    self.postMessage({ type: 'done', action: 'run', id });
  } catch (error) {
    self.postMessage({ type: 'error', action: 'run', id, error: error.message });
  }
};

