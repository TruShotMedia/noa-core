/// <reference types="vite/client" />

interface Window {
  noa?: {
    getVersion: () => Promise<string>;
    checkForUpdates: () => Promise<{ status: string; message?: string; updateInfo?: unknown }>;
    openAIRequest: (payload: {
      apiKey: string;
      model: string;
      input: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    }) => Promise<{ ok: boolean; text?: string; message?: string; status?: number; data?: unknown }>;
  };
}
