import React, { useEffect, useRef, useState } from 'react';
import { TerminalOutput, TerminalInstance } from '../types';
import { TerminalSquare, Trash2, Plus, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TerminalProps {
  terminals: TerminalInstance[];
  activeTerminalId: string;
  onClear: () => void;
  onAddTerminal: () => void;
  onSelectTerminal: (id: string) => void;
  onRemoveTerminal: (id: string) => void;
  onCommand: (command: string) => void;
  isRunning: boolean;
}

export const TerminalPanel: React.FC<TerminalProps> = ({ 
  terminals, 
  activeTerminalId, 
  onClear, 
  onAddTerminal, 
  onSelectTerminal, 
  onRemoveTerminal, 
  onCommand,
  isRunning 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputVal, setInputVal] = useState('');
  
  const activeTerminal = terminals.find(t => t.id === activeTerminalId) || terminals[0];
  const output = activeTerminal?.output || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputVal.trim()) {
      onCommand(inputVal.trim());
      setInputVal('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-panel border-t border-dark-border overflow-hidden">
      <div className="flex items-center justify-between px-2 pt-2 border-b border-dark-border bg-[#0e0f14]">
        <div className="flex items-center gap-1 overflow-x-auto flex-1 no-scrollbar">
          {terminals.map(term => (
            <div
              key={term.id}
              onClick={() => onSelectTerminal(term.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-t-lg cursor-pointer border-t border-x transition-colors group",
                activeTerminalId === term.id
                  ? "bg-dark-panel text-gold border-dark-border"
                  : "bg-transparent text-text-muted hover:text-text-main border-transparent"
              )}
            >
              <TerminalSquare className={cn("w-3.5 h-3.5", activeTerminalId === term.id ? "text-gold" : "")} />
              <span>{term.name}</span>
              {terminals.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveTerminal(term.id);
                  }}
                  className="ml-1 text-text-muted opacity-0 group-hover:opacity-100 hover:text-[#f87171] transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={onAddTerminal}
            className="p-1.5 ml-1 text-text-muted hover:text-gold transition-colors rounded-md hover:bg-dark-border"
            title="New Terminal"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2 pl-2">
          {isRunning && (
            <span className="text-[10px] uppercase tracking-widest text-[#4ade80] animate-pulse">Running</span>
          )}
          <button
            onClick={onClear}
            className="text-text-muted hover:text-text-main transition-colors p-1.5 rounded-md hover:bg-dark-border"
            title="Clear Terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed bg-dark-panel flex flex-col"
      >
        <div className="flex-1 flex flex-col">
          {output.length === 0 ? (
            <div className="text-text-muted opacity-50 italic font-serif">Awaiting execution...</div>
          ) : (
            output.map((log) => (
              <div
                key={log.id}
                className={cn(
                  "mb-1 break-words whitespace-pre-wrap",
                  log.type === 'error' && "text-[#f87171]",
                  log.type === 'system' && "text-[#60a5fa] opacity-80",
                  log.type === 'log' && "text-[#c5c6c7]",
                  log.type === 'command' && "text-gold font-bold"
                )}
              >
                {log.type !== 'command' && (
                  <span className="opacity-40 mr-2 select-none text-xs">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                  </span>
                )}
                {log.type === 'command' && <span className="mr-2 opacity-70">&gt;</span>}
                <span>{log.text}</span>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dark-border/30 sticky bottom-0 bg-dark-panel">
          <ChevronRight className="w-4 h-4 text-gold flex-shrink-0" />
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-text-main font-mono text-sm placeholder-text-muted/50"
            placeholder="Type a command (e.g. pip install numpy) or Python code..."
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
};
