import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FileNode } from '../types';
import { FileCode, Plus, FolderTree, X, Download, Upload, Edit2, Search, FileText, FileJson, Image, File, FolderPlus, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from './Terminal';

interface FileExplorerProps {
  files: FileNode[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onAddFile: (name: string, content?: string, isFolder?: boolean, parentId?: string | null) => void;
  onDeleteFile: (id: string) => void;
  onRenameFile: (id: string, newName: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onAddFile,
  onDeleteFile,
  onRenameFile
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [addingParentId, setAddingParentId] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editFileName, setEditFileName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleNewFile = () => {
      setIsAddingFolder(false);
      setIsAdding(true);
      setAddingParentId(null);
      setNewFileName('');
    };
    window.addEventListener('new-file-shortcut', handleNewFile as EventListener);
    return () => window.removeEventListener('new-file-shortcut', handleNewFile as EventListener);
  }, []);

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    return files.filter(file => 
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [files, searchQuery]);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py':
        return <FileCode className="w-4 h-4 flex-shrink-0 text-[#60a5fa]" />;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return <FileCode className="w-4 h-4 flex-shrink-0 text-[#fcd34d]" />;
      case 'json':
        return <FileJson className="w-4 h-4 flex-shrink-0 text-[#4ade80]" />;
      case 'txt':
      case 'md':
      case 'csv':
        return <FileText className="w-4 h-4 flex-shrink-0 text-[#9ca3af]" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
      case 'gif':
        return <Image className="w-4 h-4 flex-shrink-0 text-[#c084fc]" />;
      default:
        return <File className="w-4 h-4 flex-shrink-0 text-[#9ca3af]" />;
    }
  };

  useEffect(() => {
    if (editingFileId && editInputRef.current) {
      editInputRef.current.focus();
      const node = files.find(f => f.id === editingFileId);
      if (node && !node.isFolder) {
        const extensionIndex = editFileName.lastIndexOf('.');
        if (extensionIndex > 0) {
          editInputRef.current.setSelectionRange(0, extensionIndex);
        } else {
          editInputRef.current.select();
        }
      } else {
        editInputRef.current.select();
      }
    }
  }, [editingFileId]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFileName.trim()) {
      let finalName = newFileName.trim();
      if (!isAddingFolder && !finalName.endsWith('.py') && !finalName.includes('.')) {
        finalName += '.py';
      }
      onAddFile(finalName, isAddingFolder ? '' : '# New script\\n', isAddingFolder, addingParentId);
      setNewFileName('');
      setIsAdding(false);
      if (addingParentId) {
        setExpandedFolders(prev => new Set(prev).add(addingParentId));
      }
    }
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editFileName.trim() && editingFileId) {
      let finalName = editFileName.trim();
      const node = files.find(f => f.id === editingFileId);
      if (node && !node.isFolder && !finalName.endsWith('.py') && !finalName.includes('.')) {
        finalName += '.py';
      }
      onRenameFile(editingFileId, finalName);
      setEditingFileId(null);
    } else {
      setEditingFileId(null);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onAddFile(file.name, content);
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = (e: React.MouseEvent, file: FileNode) => {
    e.stopPropagation();
    if (file.isFolder) return;
    const blob = new Blob([file.content || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startRenaming = (e: React.MouseEvent, file: FileNode) => {
    e.stopPropagation();
    setEditingFileId(file.id);
    setEditFileName(file.name);
  };

  const toggleFolder = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const children = filteredFiles.filter(f => f.parentId === node.id);
    const isEditing = editingFileId === node.id;

    return (
      <div key={node.id}>
        <div
          className={cn(
            "group flex items-center justify-between py-1.5 rounded-md cursor-pointer transition-colors text-sm pr-2",
            node.isFolder ? "hover:bg-dark-border/30" : (activeFileId === node.id ? "bg-dark-border text-gold" : "text-text-muted hover:bg-dark-border/50 hover:text-text-main")
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => {
            if (node.isFolder) {
              toggleFolder(node.id);
            } else {
              onSelectFile(node.id);
            }
          }}
          onDoubleClick={(e) => startRenaming(e, node)}
        >
          <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
            {node.isFolder ? (
              <>
                <button onClick={(e) => toggleFolder(node.id, e)} className="p-0.5 hover:text-text-main text-text-muted">
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                {isExpanded ? <FolderOpen className="w-4 h-4 text-gold" /> : <Folder className="w-4 h-4 text-gold" />}
              </>
            ) : (
              <div className="pl-5">
                {getFileIcon(node.name)}
              </div>
            )}
            
            {isEditing ? (
              <form onSubmit={handleRenameSubmit} className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                <input
                  ref={editInputRef}
                  type="text"
                  value={editFileName}
                  onChange={(e) => setEditFileName(e.target.value)}
                  onBlur={handleRenameSubmit}
                  className="w-full bg-dark-bg border border-gold rounded px-1 text-sm text-text-main focus:outline-none focus:border-gold-hover"
                />
              </form>
            ) : (
              <span className={cn("truncate", node.isFolder && "text-text-main font-medium")}>{node.name}</span>
            )}
          </div>
          
          {!isEditing && (
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
              {node.isFolder && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddingFolder(false);
                      setIsAdding(true);
                      setAddingParentId(node.id);
                      setNewFileName('');
                      setExpandedFolders(prev => new Set(prev).add(node.id));
                    }}
                    className="text-text-muted hover:text-gold transition-colors p-1"
                    title="New File in Folder"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button
                onClick={(e) => startRenaming(e, node)}
                className="text-text-muted hover:text-gold transition-colors p-1"
                title="Rename"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              {!node.isFolder && (
                <button
                  onClick={(e) => handleDownload(e, node)}
                  className="text-text-muted hover:text-gold transition-colors p-1"
                  title="Download File"
                >
                  <Download className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFile(node.id);
                }}
                className="text-text-muted hover:text-[#f87171] transition-colors p-1"
                title="Delete"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        
        {node.isFolder && isExpanded && (
          <div>
            {isAdding && addingParentId === node.id && (
              <form onSubmit={handleAddSubmit} className="mb-1 py-1 flex items-center gap-2" style={{ paddingLeft: `${(depth + 1) * 12 + 28}px` }}>
                {isAddingFolder ? <Folder className="w-4 h-4 text-gold" /> : getFileIcon(newFileName || 'script.py')}
                <input
                  autoFocus
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onBlur={() => setIsAdding(false)}
                  className="flex-1 bg-transparent border-b border-gold text-sm text-text-main focus:outline-none focus:border-gold-hover mr-2"
                  placeholder={isAddingFolder ? "folder_name" : "script.py"}
                />
              </form>
            )}
            {children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootNodes = filteredFiles.filter(f => !f.parentId);

  return (
    <div className="flex flex-col h-full w-full bg-dark-bg bg-opacity-95 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
        <div className="flex items-center gap-2 text-text-main overflow-hidden">
           <FolderTree className="w-4 h-4 flex-shrink-0" />
           <h2 className="text-sm font-serif italic tracking-wide truncate">Project Workspace</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleUploadClick}
            className="text-text-muted hover:text-gold transition-colors p-1"
            title="Upload File"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsAddingFolder(true);
              setIsAdding(true);
              setAddingParentId(null);
            }}
            className="text-text-muted hover:text-gold transition-colors p-1"
            title="New Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsAddingFolder(false);
              setIsAdding(true);
              setAddingParentId(null);
            }}
            className="text-text-muted hover:text-gold transition-colors p-1"
            title="New File (Ctrl+N)"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden" 
        accept=".py,.txt,.json,.md"
      />

      <div className="px-3 py-2 border-b border-dark-border bg-dark-bg">
        <div className="flex items-center gap-2 bg-[#0e0f14] border border-dark-border rounded-md px-2 py-1 focus-within:border-gold transition-colors">
          <Search className="w-3.5 h-3.5 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="flex-1 bg-transparent border-none text-xs text-text-main focus:outline-none placeholder-text-muted"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-text-muted hover:text-text-main">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 pr-1">
        {isAdding && addingParentId === null && (
          <form onSubmit={handleAddSubmit} className="mb-1 px-8 py-1 flex items-center gap-2">
            {isAddingFolder ? <Folder className="w-4 h-4 text-gold" /> : getFileIcon(newFileName || 'script.py')}
            <input
              autoFocus
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onBlur={() => setIsAdding(false)}
              className="flex-1 bg-transparent border-b border-gold text-sm text-text-main focus:outline-none focus:border-gold-hover"
              placeholder={isAddingFolder ? "folder_name" : "script.py"}
            />
          </form>
        )}

        <div className="flex flex-col gap-0.5">
          {rootNodes.map(node => renderNode(node, 0))}
        </div>
      </div>
    </div>
  );
};
