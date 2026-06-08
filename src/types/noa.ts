export type ToolName = 'getTodaysBriefing' | 'getSystemStatus' | 'listAvailableTools';

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

export type MemoryEntry = {
  id: string;
  type: 'command' | 'tool_result' | 'preference' | 'note';
  content: string;
  createdAt: string;
};
