import React from 'react';
import { FileNode } from '../types';
import { X, FileCode } from 'lucide-react';
import { cn } from './Terminal';

interface EditorTabsProps {
  files: FileNode[];
  openFileIds: string[];
  activeFileId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

export const EditorTabs: React.FC<EditorTabsProps> = ({
  files,
  openFileIds,
  activeFileId,
  onSelectTab,
  onCloseTab
}) => {
  const openFiles = openFileIds
    .map(id => files.find(f => f.id === id))
    .filter((f): f is FileNode => f !== undefined);

  if (openFiles.length === 0) return null;

  return (
    <div className="flex items-center overflow-x-auto bg-[#0b0c10] border-b border-dark-border">
      {openFiles.map(file => (
        <div
          key={file.id}
          onClick={() => onSelectTab(file.id)}
          className={cn(
            "group flex items-center gap-2 px-4 py-2 border-r border-dark-border cursor-pointer min-w-32 max-w-48 transition-colors",
            activeFileId === file.id
              ? "bg-[#14151a] text-gold border-t-2 border-t-gold"
              : "bg-[#0b0c10] text-text-muted hover:bg-[#14151a] hover:text-text-main border-t-2 border-t-transparent"
          )}
        >
          <FileCode className="w-4 h-4 flex-shrink-0" />
          <span className="truncate text-sm flex-1">{file.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCloseTab(file.id);
            }}
            className="opacity-0 group-hover:opacity-100 hover:text-[#f87171] transition-opacity p-0.5 rounded-md hover:bg-dark-border"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};
