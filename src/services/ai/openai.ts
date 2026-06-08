export type OpenAISettings = {
  apiKey?: string;
  model: string;
  enabled: boolean;
};

export type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const OPENAI_SETTINGS_KEY = 'noa.openaiSettings.v2';

export function saveOpenAISettings(settings: OpenAISettings) {
  window.localStorage.setItem(OPENAI_SETTINGS_KEY, JSON.stringify(settings));
}

export function getOpenAISettings(): OpenAISettings {
  try {
    const raw = window.localStorage.getItem(OPENAI_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { model: 'gpt-5.5', enabled: false };
  } catch {
    return { model: 'gpt-5.5', enabled: false };
  }
}

export function hasOpenAIKey() {
  const settings = getOpenAISettings();
  return Boolean(settings.enabled && settings.apiKey?.trim());
}

export async function generateNoaResponse(messages: OpenAIMessage[]) {
  const settings = getOpenAISettings();

  if (!settings.enabled || !settings.apiKey?.trim()) {
    return { ok: false, text: '', message: 'OpenAI is not enabled or the API key is missing.' };
  }

  const bridge = (window as any).noa;

  if (!bridge?.openAIRequest) {
    return { ok: false, text: '', message: 'OpenAI bridge is unavailable. Restart NoA after updating electron/preload.cjs.' };
  }

  const input = messages.map((message) => ({ role: message.role, content: message.content }));
  const result = await bridge.openAIRequest({ apiKey: settings.apiKey, model: settings.model, input });

  if (!result?.ok) {
    return { ok: false, text: '', message: result?.message || 'OpenAI request failed.' };
  }

  return { ok: true, text: result.text || 'No response text returned.', message: 'OK' };
}

export async function testOpenAIConnection() {
  return generateNoaResponse([
    {
      role: 'system',
      content: 'You are Noah, the spoken identity of NoA. Reply with one concise sentence confirming that the OpenAI brain layer is online.'
    },
    { role: 'user', content: 'Connection test.' }
  ]);
}
