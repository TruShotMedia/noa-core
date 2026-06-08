import type { NoaTool } from '../../types/noa';
import { addMemoryEntry } from '../memory/memoryStore';

function cleanMemoryInput(input: string) {
  return input
    .replace(/^noah[,\s]*/i, '')
    .replace(/^(remember that|remember|save note|make a note that|make a note|note that)\s*/i, '')
    .trim();
}

export const rememberNoteTool: NoaTool<{ id: string; content: string; type: string }> = {
  name: 'rememberNote',
  label: 'Remember Note',
  description: 'Stores a local memory note for NoA to reference later.',
  keywords: ['remember', 'save note', 'make a note', 'note that', 'keep in mind'],
  async execute({ input }) {
    const content = cleanMemoryInput(input) || input;
    const entry = addMemoryEntry({
      type: 'note',
      title: content.length > 54 ? `${content.slice(0, 54)}...` : content,
      content,
      tags: ['user-note']
    });

    return {
      tool: 'rememberNote',
      label: 'Remember Note',
      summary: `I saved that to local memory: ${content}`,
      data: { id: entry.id, content: entry.content, type: entry.type }
    };
  }
};
