/// <reference types="vite/client" />

interface Window {
  noa?: {
    getVersion: () => Promise<string>;
    checkForUpdates: () => Promise<{ status: string; message?: string; updateInfo?: unknown }>;
  };
}
