import type { RouterResponse } from '../types/noa';
import { addMemoryEntry } from './memory/memoryStore';
import { generateNoaResponse, hasOpenAIKey } from './ai/openai';
import { findToolForInput, listAvailableToolsText } from './tools/registry';

export async function routeCommand(input: string): Promise<RouterResponse> {
  const requestedAt = new Date().toISOString();
  addMemoryEntry({ type: 'command', content: input });

  const lowered = input.toLowerCase();

  if (lowered.includes('tool') || lowered.includes('what can you do') || lowered.includes('abilities')) {
    const response = `I currently have these local tools available:\n\n${listAvailableToolsText()}\n\nAlpha 0.4 adds the OpenAI brain layer, so Noah can now explain and format tool results more naturally when OpenAI is enabled.`;
    return { intent: 'list_tools', confidence: 0.92, response };
  }

  const tool = findToolForInput(input);

  if (tool) {
    const result = await tool.execute({ input, requestedAt });
    addMemoryEntry({ type: 'tool_result', content: `${result.label}: ${result.summary}` });

    if (hasOpenAIKey()) {
      const ai = await generateNoaResponse([
        {
          role: 'system',
          content: `You are Noah, the spoken identity of NoA, John's Noetic Advisor. You are concise, useful, calm and operational. You are connected to a local tool engine. Use the tool result provided by the app. Do not pretend live integrations are active unless the tool result says they are. Use Australian English.`
        },
        {
          role: 'user',
          content: `John asked: ${input}\n\nLocal tool used: ${result.label}\nTool summary: ${result.summary}\nTool data JSON: ${JSON.stringify(result.data, null, 2)}\n\nRespond as Noah. Explain what this means and what the next useful action should be.`
        }
      ]);

      if (ai.ok && ai.text) {
        return {
          intent: tool.name,
          toolUsed: tool.name,
          confidence: 0.9,
          response: ai.text
        };
      }

      return {
        intent: tool.name,
        toolUsed: tool.name,
        confidence: 0.82,
        response: `${formatToolResponse(result.summary, result.data)}\n\nOpenAI formatting failed: ${ai.message}`
      };
    }

    return {
      intent: tool.name,
      toolUsed: tool.name,
      confidence: 0.86,
      response: formatToolResponse(result.summary, result.data)
    };
  }

  if (hasOpenAIKey()) {
    const ai = await generateNoaResponse([
      {
        role: 'system',
        content: `You are Noah, the spoken identity of NoA, John's Noetic Advisor. You are running inside Alpha 0.4. You have a local tool engine, but this specific message did not match a tool. Be helpful and direct. If live business data would be required, say that the relevant integration is not connected yet.`
      },
      { role: 'user', content: input }
    ]);

    if (ai.ok && ai.text) {
      addMemoryEntry({ type: 'note', content: `OpenAI response generated for: ${input}` });
      return {
        intent: 'openai_general_response',
        confidence: 0.74,
        response: ai.text
      };
    }

    return {
      intent: 'openai_error',
      confidence: 0.5,
      response: `I tried to use the OpenAI brain layer, but it failed: ${ai.message}`
    };
  }

  return {
    intent: 'general_local_response',
    confidence: 0.45,
    response: 'I heard you. I am currently running through the local Tool Engine. OpenAI is not enabled yet. Go to Settings, enable OpenAI, paste your API key, save, then test the connection.'
  };
}

function formatToolResponse(summary: string, data: unknown) {
  if (!data || typeof data !== 'object') return summary;

  const lines = Object.entries(data as Record<string, unknown>).map(([key, value]) => {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
    const rendered = Array.isArray(value) ? value.join(', ') : String(value);
    return `${label}: ${rendered}`;
  });

  return `${summary}\n\n${lines.join('\n')}`;
}
