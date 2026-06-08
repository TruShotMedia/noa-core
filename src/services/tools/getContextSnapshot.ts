import type { NoaTool } from '../../types/noa';
import { buildContextSummary, getContextProfile, getMemoryStats } from '../memory/memoryStore';

export const getContextSnapshotTool: NoaTool<{ profile: ReturnType<typeof getContextProfile>; stats: ReturnType<typeof getMemoryStats>; summary: string }> = {
  name: 'getContextSnapshot',
  label: 'Context Snapshot',
  description: 'Summarises what NoA currently knows about John, the mission and active systems.',
  keywords: ['context', 'who am i', 'what do you know', 'what do you know about me', 'profile', 'memory status'],
  async execute() {
    const profile = getContextProfile();
    const stats = getMemoryStats();
    const summary = buildContextSummary();

    return {
      tool: 'getContextSnapshot',
      label: 'Context Snapshot',
      summary: `NoA currently has ${stats.total} local memory entries, including ${stats.pinned} pinned context entries.`,
      data: { profile, stats, summary }
    };
  }
};
