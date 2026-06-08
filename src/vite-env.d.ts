/// <reference types="vite/client" />

type NoASettings = {
  openaiModel?: string;
  openaiApiKey?: string;
  hasOpenAIKey?: boolean;
  memoryCount?: number;
  webSearchProvider?: string;
};

type NoADiagnostics = {
  provider: string;
  brainOnline: boolean;
  apiKeySaved: boolean;
  model: string;
  lastIntent: string;
  lastConfidence: number;
  lastApiRequestAt: string | null;
  lastApiStatus: string;
  lastApiLatencyMs: number | null;
  lastApiError: string | null;
  lastResponseSource: string;
  toolsRegistered: number;
  memoryEntries: number;
  lastToolName?: string;
  lastToolStatus?: string;
  lastToolLatencyMs?: number | null;
  lastToolError?: string | null;
};

declare global {
  interface Window {
    noa?: {
      getSettings: () => Promise<NoASettings>;
      saveSettings: (settings: NoASettings) => Promise<NoASettings>;
      testOpenAI: () => Promise<any>;
      sendChat: (payload: { message: string; history: Array<{ role: string; text: string }> }) => Promise<any>;
      getDiagnostics: () => Promise<NoADiagnostics>;
      checkForUpdates: () => Promise<any>;
    };
  }
}

export {};
