import type { NoaTool, ToolName } from '../../types/noa';
import { getSystemStatus } from './getSystemStatus';
import { getTodaysBriefing } from './getTodaysBriefing';

export const toolRegistry: NoaTool[] = [getTodaysBriefing, getSystemStatus];

export function findToolForInput(input: string): NoaTool | null {
  const normalised = input.toLowerCase();

  const scored = toolRegistry
    .map((tool) => ({
      tool,
      score: tool.keywords.reduce((total, keyword) => total + (normalised.includes(keyword) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.score > 0 ? scored[0].tool : null;
}

export function getToolByName(name: ToolName): NoaTool | undefined {
  return toolRegistry.find((tool) => tool.name === name);
}

export function listAvailableToolsText() {
  return toolRegistry.map((tool) => `- ${tool.label}: ${tool.description}`).join('\n');
}
