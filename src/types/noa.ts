export type ToolName =
  | 'getTodaysBriefing'
  | 'getSystemStatus'
  | 'listAvailableTools'
  | 'rememberNote'
  | 'searchMemory'
  | 'getContextSnapshot';

export type ToolExecutionContext = {
  input: string;
  requestedAt: string;
};

export type ToolResult<TData = unknown> = {
  tool: ToolName;
  label: string;
  summary: string;
  data: TData;
};

export type NoaTool<TData = unknown> = {
  name: ToolName;
  label: string;
  description: string;
  keywords: string[];
  execute: (context: ToolExecutionContext) => Promise<ToolResult<TData>>;
};

export type RouterResponse = {
  intent: string;
  toolUsed?: ToolName;
  response: string;
  confidence: number;
};

export type MemoryType = 'command' | 'tool_result' | 'preference' | 'note' | 'business_context' | 'project' | 'client' | 'system';

export type MemoryEntry = {
  id: string;
  type: MemoryType;
  title?: string;
  content: string;
  tags?: string[];
  pinned?: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type ContextProfile = {
  name: string;
  visualIdentity: string;
  voiceIdentity: string;
  mission: string;
  primaryBusinesses: string[];
  activeSystems: string[];
  preferredTone: string;
  updatedAt: string;
};
