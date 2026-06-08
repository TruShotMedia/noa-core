import type { NoaTool } from '../../types/noa';
import { getTodaysBriefing } from './getTodaysBriefing';
import { getSystemStatus } from './getSystemStatus';
import { rememberNoteTool } from './rememberNote';
import { searchMemoryTool } from './searchMemory';
import { getContextSnapshotTool } from './getContextSnapshot';

export const toolRegistry: NoaTool[] = [
  getTodaysBriefing,
  getSystemStatus,
  rememberNoteTool,
  searchMemoryTool,
  getContextSnapshotTool
];

export function findToolForInput(input: string) {
  const lowered = input.toLowerCase();

  if (/remember|save note|make a note|note that|keep in mind/.test(lowered)) return rememberNoteTool;
  if (/search memory|what do you remember|do you remember|memory about|find memory/.test(lowered)) return searchMemoryTool;
  if (/context|who am i|what do you know|profile|memory status/.test(lowered)) return getContextSnapshotTool;

  return toolRegistry.find((tool) => tool.keywords.some((keyword) => lowered.includes(keyword.toLowerCase())));
}

export function listAvailableToolsText() {
  return toolRegistry.map((tool) => `- ${tool.label}: ${tool.description}`).join('\n');
}
