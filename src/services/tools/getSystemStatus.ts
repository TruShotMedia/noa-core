import type { NoaTool } from '../../types/noa';

export const getSystemStatus: NoaTool<{
  core: string;
  ai: string;
  tools: string;
  memory: string;
  integrations: string;
}> = {
  name: 'getSystemStatus',
  label: 'System status',
  description: 'Reports the current local NoA engine status.',
  keywords: ['status', 'system', 'health', 'online', 'engine', 'core', 'diagnostic', 'diagnostics'],
  async execute() {
    const data = {
      core: 'Online',
      ai: 'Not connected yet',
      tools: 'Local tool registry active',
      memory: 'Browser localStorage scaffold active',
      integrations: 'Placeholders only'
    };

    return {
      tool: 'getSystemStatus',
      label: 'System status',
      data,
      summary: 'NoA Core is online. The local tool registry is active. OpenAI and live integrations are still pending.'
    };
  }
};
