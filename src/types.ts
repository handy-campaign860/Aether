export interface FileNode {
  id: string;
  name: string;
  content: string;
  isFolder?: boolean;
  parentId?: string | null;
}

export interface TerminalOutput {
  id: string;
  type: 'log' | 'error' | 'system' | 'command';
  text: string;
  timestamp: number;
}

export interface TerminalInstance {
  id: string;
  name: string;
  output: TerminalOutput[];
}
