import type { NoaTool } from '../../types/noa';
import { searchMemory } from '../memory/memoryStore';

function cleanSearchInput(input: string) {
  return input
    .replace(/^noah[,\s]*/i, '')
    .replace(/^(search memory for|search memory|what do you remember about|do you remember|remember anything about|find memory for)\s*/i, '')
    .trim();
}

export const searchMemoryTool: NoaTool<{ query: string; results: Array<{ title?: string; type: string; content: string; tags?: string[] }> }> = {
  name: 'searchMemory',
  label: 'Search Memory',
  description: 'Searches NoA local memory and context notes.',
  keywords: ['search memory', 'what do you remember', 'do you remember', 'memory about', 'find memory'],
  async execute({ input }) {
    const query = cleanSearchInput(input) || input;
    const results = searchMemory(query, 6);

    return {
      tool: 'searchMemory',
      label: 'Search Memory',
      summary: results.length ? `I found ${results.length} matching memory entries for: ${query}` : `I could not find a matching local memory for: ${query}`,
      data: {
        query,
        results: results.map((entry) => ({ title: entry.title, type: entry.type, content: entry.content, tags: entry.tags }))
      }
    };
  }
};
