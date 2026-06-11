import React, { useRef, useState, useEffect } from 'react';
import MonacoEditor, { OnMount, useMonaco } from '@monaco-editor/react';
import { Play, AlignLeft, Palette } from 'lucide-react';

interface EditorProps {
  content: string;
  onChange: (value: string | undefined) => void;
  onRun: () => void;
  onFormat?: () => void;
  isRunning: boolean;
  isFormatting?: boolean;
  fileName: string;
}

export const Editor: React.FC<EditorProps> = ({ content, onChange, onRun, onFormat, isRunning, isFormatting, fileName }) => {
  const editorRef = useRef<any>(null);
  const [theme, setTheme] = useState('aether-dark');
  const monacoInstance = useMonaco();

  useEffect(() => {
    if (monacoInstance) {
      monacoInstance.editor.setTheme(theme);
    }
  }, [theme, monacoInstance]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Define custom dark theme
    monaco.editor.defineTheme('aether-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', fontStyle: 'italic', foreground: 'c5a880' },
        { token: 'comment', fontStyle: 'italic', foreground: '626477' },
        { token: 'string', foreground: 'a3be8c' },
        { token: 'function', foreground: '88c0d0' },
      ],
      colors: {
        'editor.background': '#0b0c10',
        'editor.foreground': '#e2e4e9',
        'editor.lineHighlightBackground': '#14151a',
        'editorLineNumber.foreground': '#4c4d5a',
        'editorLineNumber.activeForeground': '#c5a880',
        'editorIndentGuide.background': '#1f2026',
        'editorIndentGuide.activeBackground': '#3a3b45',
      }
    });

    monaco.editor.defineTheme('oceanic', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'c594c5' },
        { token: 'comment', fontStyle: 'italic', foreground: '65737e' },
        { token: 'string', foreground: '99c794' },
        { token: 'function', foreground: '6699cc' },
      ],
      colors: {
        'editor.background': '#1b2b34',
        'editor.foreground': '#d8dee9',
      }
    });

    monaco.editor.defineTheme('hacker', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '00ff00', fontStyle: 'bold' },
        { token: 'comment', fontStyle: 'italic', foreground: '008800' },
        { token: 'string', foreground: '00ffaa' },
        { token: 'function', foreground: '00ff00' },
      ],
      colors: {
        'editor.background': '#000000',
        'editor.foreground': '#00dd00',
        'editorLineNumber.foreground': '#005500',
        'editorLineNumber.activeForeground': '#00ff00',
      }
    });
    
    monaco.editor.setTheme(theme);
  };

  return (
    <div className="flex flex-col h-full bg-dark-bg">
      <div className="flex items-center justify-between px-4 py-2 border-b border-dark-border bg-[#0e0f14]">
        <div className="text-sm text-text-muted font-mono">{fileName}</div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-dark-border rounded-md px-2 py-1 mr-2 text-sm text-text-muted">
            <Palette className="w-4 h-4 mr-2 text-gold opacity-80" />
            <select 
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-text-muted cursor-pointer"
            >
              <option value="aether-dark">Aether Dark</option>
              <option value="vs-dark">VS Dark</option>
              <option value="light">VS Light</option>
              <option value="hc-black">High Contrast</option>
              <option value="oceanic">Oceanic</option>
              <option value="hacker">Hacker Green</option>
            </select>
          </div>
          {onFormat && (
            <button
              onClick={onFormat}
              disabled={isRunning || isFormatting}
              className="flex items-center gap-2 px-3 py-1.5 bg-dark-border hover:bg-dark-border/80 text-text-muted hover:text-text-main rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-serif italic tracking-wide text-sm"
              title="Format Code with autopep8"
            >
              <AlignLeft className="w-4 h-4" />
              {isFormatting ? 'Formatting...' : 'Format'}
            </button>
          )}
          <button
            onClick={onRun}
            disabled={isRunning || isFormatting}
            className="flex items-center gap-2 px-3 py-1.5 bg-dark-border hover:bg-dark-border/80 text-gold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-serif italic tracking-wide text-sm"
          >
            <Play className="w-4 h-4" />
            {isRunning ? 'Executing...' : 'Run Script'}
          </button>
        </div>
      </div>
      <div className="flex-1 w-full relative">
        <MonacoEditor
          height="100%"
          language="python"
          theme={theme}
          value={content}
          onChange={onChange}
          onMount={handleEditorMount}
          options={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            padding: { top: 16, bottom: 16 },
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
};
