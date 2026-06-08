const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

const isDev = !app.isPackaged;

let mainWindow;
let diagnostics = {
  provider: 'Local fallback',
  brainOnline: false,
  apiKeySaved: false,
  model: 'gpt-4.1-mini',
  lastIntent: 'none',
  lastConfidence: 0,
  lastApiRequestAt: null,
  lastApiStatus: 'Not tested',
  lastApiLatencyMs: null,
  lastApiError: null,
  lastResponseSource: 'none',
  toolsRegistered: 8,
  memoryEntries: 0,
  lastToolName: 'none',
  lastToolStatus: 'idle',
  lastToolLatencyMs: null,
  lastToolError: null
};

function getStorePath() {
  return path.join(app.getPath('userData'), 'noa-settings.json');
}

function readStore() {
  try {
    const file = getStorePath();
    if (!fs.existsSync(file)) {
      return { openaiApiKey: '', openaiModel: 'gpt-4.1-mini', memories: [], webSearchProvider: 'duckduckgo-lite' };
    }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_error) {
    return { openaiApiKey: '', openaiModel: 'gpt-4.1-mini', memories: [], webSearchProvider: 'duckduckgo-lite' };
  }
}

function writeStore(next) {
  const current = readStore();
  const merged = { ...current, ...next };
  fs.mkdirSync(path.dirname(getStorePath()), { recursive: true });
  fs.writeFileSync(getStorePath(), JSON.stringify(merged, null, 2), 'utf8');
  updateDiagnosticsFromStore(merged);
  return safeSettings(merged);
}

function safeSettings(settings = readStore()) {
  return {
    openaiModel: settings.openaiModel || 'gpt-4.1-mini',
    hasOpenAIKey: Boolean(settings.openaiApiKey),
    memoryCount: Array.isArray(settings.memories) ? settings.memories.length : 0,
    webSearchProvider: settings.webSearchProvider || 'duckduckgo-lite'
  };
}

function updateDiagnosticsFromStore(settings = readStore()) {
  diagnostics.apiKeySaved = Boolean(settings.openaiApiKey);
  diagnostics.model = settings.openaiModel || 'gpt-4.1-mini';
  diagnostics.memoryEntries = Array.isArray(settings.memories) ? settings.memories.length : 0;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#070910',
    title: 'NoA',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  updateDiagnosticsFromStore();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('noa:get-settings', async () => safeSettings());

ipcMain.handle('noa:save-settings', async (_event, settings) => {
  const current = readStore();
  const next = {
    ...current,
    openaiModel: settings.openaiModel || current.openaiModel || 'gpt-4.1-mini',
    webSearchProvider: settings.webSearchProvider || current.webSearchProvider || 'duckduckgo-lite'
  };

  if (typeof settings.openaiApiKey === 'string' && settings.openaiApiKey.trim()) {
    next.openaiApiKey = settings.openaiApiKey.trim();
  }

  return writeStore(next);
});

ipcMain.handle('noa:get-diagnostics', async () => {
  updateDiagnosticsFromStore();
  return diagnostics;
});

ipcMain.handle('noa:test-openai', async () => {
  const settings = readStore();
  const started = Date.now();
  diagnostics.lastApiRequestAt = new Date().toISOString();
  diagnostics.lastApiStatus = 'Testing';
  diagnostics.lastApiError = null;

  if (!settings.openaiApiKey) {
    diagnostics.provider = 'Local fallback';
    diagnostics.brainOnline = false;
    diagnostics.lastApiStatus = 'Missing API key';
    diagnostics.lastApiLatencyMs = Date.now() - started;
    diagnostics.lastApiError = 'No OpenAI API key saved in NoA settings.';
    return { ok: false, ...diagnostics };
  }

  try {
    const text = await callOpenAI({
      apiKey: settings.openaiApiKey,
      model: settings.openaiModel || 'gpt-4.1-mini',
      input: 'Reply with exactly: NoA OpenAI diagnostics online.'
    });

    diagnostics.provider = 'OpenAI';
    diagnostics.brainOnline = true;
    diagnostics.lastApiStatus = 'Success';
    diagnostics.lastApiLatencyMs = Date.now() - started;
    diagnostics.lastApiError = null;
    diagnostics.lastResponseSource = 'openai_test';

    return { ok: true, text, ...diagnostics };
  } catch (error) {
    diagnostics.provider = 'Local fallback';
    diagnostics.brainOnline = false;
    diagnostics.lastApiStatus = 'Failed';
    diagnostics.lastApiLatencyMs = Date.now() - started;
    diagnostics.lastApiError = error.message || String(error);
    return { ok: false, ...diagnostics };
  }
});

ipcMain.handle('noa:chat', async (_event, payload) => {
  const message = String(payload?.message || '').trim();
  const history = Array.isArray(payload?.history) ? payload.history.slice(-8) : [];
  const settings = readStore();
  const route = routeIntent(message);
  diagnostics.lastIntent = route.intent;
  diagnostics.lastConfidence = route.confidence;

  if (route.intent === 'remember') {
    const memory = message.replace(/^noah,?\s*remember\s*(that)?/i, '').trim();
    const memories = Array.isArray(settings.memories) ? settings.memories : [];
    memories.push({ text: memory || message, createdAt: new Date().toISOString() });
    writeStore({ memories });
    return {
      ok: true,
      source: 'local_tool',
      intent: route.intent,
      confidence: route.confidence,
      text: `Got it - I’ll remember that. ${memory ? `I’ve saved: “${memory}”.` : 'I’ve saved that note into my local memory.'}`
    };
  }

  const toolResult = await executeToolForIntent(route.intent, message, settings);
  const toolContext = buildToolContext(route.intent, settings, diagnostics, toolResult);

  if (!settings.openaiApiKey) {
    diagnostics.provider = 'Local fallback';
    diagnostics.brainOnline = false;
    diagnostics.lastResponseSource = toolResult ? 'local_tool' : 'local_fallback';
    return {
      ok: true,
      source: toolResult ? 'local_tool' : 'local_fallback',
      intent: route.intent,
      confidence: route.confidence,
      text: localFallbackResponse(route.intent, toolContext)
    };
  }

  const started = Date.now();
  diagnostics.lastApiRequestAt = new Date().toISOString();
  diagnostics.lastApiStatus = 'Sending';
  diagnostics.lastApiError = null;

  try {
    const prompt = buildNoahPrompt({ message, history, toolContext });
    const text = await callOpenAI({
      apiKey: settings.openaiApiKey,
      model: settings.openaiModel || 'gpt-4.1-mini',
      input: prompt
    });

    diagnostics.provider = 'OpenAI';
    diagnostics.brainOnline = true;
    diagnostics.lastApiStatus = 'Success';
    diagnostics.lastApiLatencyMs = Date.now() - started;
    diagnostics.lastApiError = null;
    diagnostics.lastResponseSource = toolResult ? `openai_with_${toolResult.tool}` : 'openai';

    return {
      ok: true,
      source: diagnostics.lastResponseSource,
      intent: route.intent,
      confidence: route.confidence,
      text
    };
  } catch (error) {
    diagnostics.provider = 'Local fallback';
    diagnostics.brainOnline = false;
    diagnostics.lastApiStatus = 'Failed';
    diagnostics.lastApiLatencyMs = Date.now() - started;
    diagnostics.lastApiError = error.message || String(error);
    diagnostics.lastResponseSource = toolResult ? 'local_tool_after_openai_error' : 'local_fallback_after_error';

    return {
      ok: false,
      source: diagnostics.lastResponseSource,
      intent: route.intent,
      confidence: route.confidence,
      text: `${localFallbackResponse(route.intent, toolContext)}\n\nI also tried to reach OpenAI, but that request failed. Check Diagnostics for the exact error.`
    };
  }
});

ipcMain.handle('noa:check-for-updates', async () => {
  if (isDev) return { status: 'Dev mode', message: 'Auto updates only run in packaged builds.' };
  try {
    const result = await autoUpdater.checkForUpdatesAndNotify();
    return { status: 'Checking', message: result ? 'Update check started.' : 'No update response returned.' };
  } catch (error) {
    return { status: 'Failed', message: error.message || String(error) };
  }
});

function routeIntent(message) {
  const m = message.toLowerCase();
  if (m.includes('remember')) return { intent: 'remember', confidence: 92 };
  if (m.includes('weather') || m.includes('forecast') || m.includes('temperature') || m.includes('rain')) return { intent: 'weather_lookup', confidence: 91 };
  if (m.includes('search') || m.includes('look up') || m.includes('latest') || m.includes('google') || m.includes('web')) return { intent: 'web_search', confidence: 82 };
  if (m.includes('what do you remember') || m.includes('memory')) return { intent: 'memory_lookup', confidence: 86 };
  if (m.includes('status') || m.includes('diagnostic') || m.includes('online')) return { intent: 'system_status', confidence: 84 };
  if (m.includes('tool') || m.includes('what can you use')) return { intent: 'tool_list', confidence: 88 };
  if (m.includes('today') || m.includes('attention') || m.includes('priority') || m.includes('briefing')) return { intent: 'todays_briefing', confidence: 82 };
  return { intent: 'openai_general_response', confidence: 68 };
}

async function executeToolForIntent(intent, message, settings) {
  if (!['weather_lookup', 'web_search'].includes(intent)) return null;
  const started = Date.now();
  diagnostics.lastToolName = intent === 'weather_lookup' ? 'getWeather' : 'webSearchLite';
  diagnostics.lastToolStatus = 'running';
  diagnostics.lastToolLatencyMs = null;
  diagnostics.lastToolError = null;

  try {
    const result = intent === 'weather_lookup'
      ? await getWeather(message)
      : await webSearchLite(message, settings);
    diagnostics.lastToolStatus = result.ok ? 'success' : 'limited';
    diagnostics.lastToolLatencyMs = Date.now() - started;
    diagnostics.lastToolError = result.ok ? null : result.error || result.note || 'Tool returned limited data.';
    return result;
  } catch (error) {
    diagnostics.lastToolStatus = 'failed';
    diagnostics.lastToolLatencyMs = Date.now() - started;
    diagnostics.lastToolError = error.message || String(error);
    return { ok: false, tool: diagnostics.lastToolName, error: diagnostics.lastToolError };
  }
}

function extractLocation(message) {
  const m = message.toLowerCase();
  const known = {
    brisbane: { name: 'Brisbane', latitude: -27.4679, longitude: 153.0281, timezone: 'Australia/Brisbane' },
    loganholme: { name: 'Loganholme', latitude: -27.6847, longitude: 153.1912, timezone: 'Australia/Brisbane' },
    'gold coast': { name: 'Gold Coast', latitude: -28.0167, longitude: 153.4, timezone: 'Australia/Brisbane' },
    'sunshine coast': { name: 'Sunshine Coast', latitude: -26.65, longitude: 153.0667, timezone: 'Australia/Brisbane' },
    sydney: { name: 'Sydney', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
    melbourne: { name: 'Melbourne', latitude: -37.8136, longitude: 144.9631, timezone: 'Australia/Melbourne' }
  };

  for (const [key, value] of Object.entries(known)) {
    if (m.includes(key)) return value;
  }
  return known.brisbane;
}

async function getWeather(message) {
  const location = extractLocation(message);
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
    timezone: location.timezone,
    forecast_days: '1'
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.reason || response.statusText || 'Weather request failed.');

  const current = data.current || {};
  const daily = data.daily || {};
  return {
    ok: true,
    tool: 'getWeather',
    location: location.name,
    provider: 'Open-Meteo',
    summary: {
      temperature: current.temperature_2m,
      apparentTemperature: current.apparent_temperature,
      windSpeed: current.wind_speed_10m,
      precipitation: current.precipitation,
      weatherCode: current.weather_code,
      high: daily.temperature_2m_max?.[0],
      low: daily.temperature_2m_min?.[0],
      rainChance: daily.precipitation_probability_max?.[0],
      time: current.time
    }
  };
}

async function webSearchLite(message) {
  const query = message
    .replace(/^(noah,?\s*)?/i, '')
    .replace(/\b(search|look up|web|google|latest)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || message;
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.statusText || 'Web search request failed.');

  const related = Array.isArray(data.RelatedTopics)
    ? data.RelatedTopics.flatMap((item) => item.Topics || [item]).filter((item) => item.Text).slice(0, 5)
    : [];

  if (!data.AbstractText && !related.length) {
    return {
      ok: false,
      tool: 'webSearchLite',
      query,
      note: 'DuckDuckGo Instant Answer returned no usable summary. A stronger search provider such as Tavily, SerpAPI, Brave Search or Bing Search can be added next.'
    };
  }

  return {
    ok: true,
    tool: 'webSearchLite',
    provider: 'DuckDuckGo Instant Answer',
    query,
    abstract: data.AbstractText || '',
    heading: data.Heading || '',
    results: related.map((item) => ({ text: item.Text, url: item.FirstURL || '' }))
  };
}

function buildToolContext(intent, settings, diag, toolResult) {
  const memories = Array.isArray(settings.memories) ? settings.memories.slice(-12) : [];
  const context = {
    intent,
    diagnostics: {
      provider: diag.provider,
      apiKeySaved: Boolean(settings.openaiApiKey),
      model: settings.openaiModel || 'gpt-4.1-mini',
      toolsRegistered: diag.toolsRegistered,
      memoryEntries: memories.length,
      lastToolName: diag.lastToolName,
      lastToolStatus: diag.lastToolStatus
    },
    availableTools: [
      'getTodaysBriefing',
      'getSystemStatus',
      'listTools',
      'rememberContext',
      'getWeather',
      'webSearchLite',
      'memoryLookup',
      'diagnosticsStatus'
    ],
    todaysBriefing: {
      activeJobs: 3,
      outstandingTasks: 7,
      meetings: 1,
      priorityFocus: 'Connect real Notion and Optra data so Noah can brief from live systems.'
    },
    memories,
    toolResult
  };

  if (intent === 'memory_lookup') context.memoryLookup = memories;
  return context;
}

function buildNoahPrompt({ message, history, toolContext }) {
  return [
    {
      role: 'system',
      content: [
        'You are Noah, the spoken AI assistant inside NoA, John Herholdt’s Noetic Advisor desktop app.',
        'NoA is the visual system name. Noah is the natural voice/conversation identity.',
        'Speak warmly, naturally and directly. Do not sound like a diagnostic terminal.',
        'Avoid ending replies with intent/confidence unless the user asks for technical detail.',
        'Be honest about what is real and what is still mocked/prototype data.',
        'Use toolResult data when provided. If weather data is provided, answer with the actual weather values and mention the provider briefly.',
        'If a webSearchLite result is limited, say that the current web tool is limited and recommend connecting a stronger search provider.',
        'Keep replies practical, conversational and useful.'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `Current user message: ${message}`,
        '',
        `Recent conversation: ${JSON.stringify(history)}`,
        '',
        `NoA tool/context state: ${JSON.stringify(toolContext, null, 2)}`
      ].join('\n')
    }
  ];
}

async function callOpenAI({ apiKey, model, input }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input,
      temperature: 0.7
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data?.error?.message || response.statusText || `HTTP ${response.status}`;
    throw new Error(detail);
  }

  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const outputText = data?.output
    ?.flatMap((item) => item?.content || [])
    ?.map((content) => content?.text || '')
    ?.join('\n')
    ?.trim();

  return outputText || 'OpenAI returned a response, but NoA could not extract readable text.';
}

function formatWeather(toolResult) {
  const w = toolResult?.summary || {};
  const parts = [];
  if (w.temperature !== undefined) parts.push(`${w.temperature}°C now`);
  if (w.apparentTemperature !== undefined) parts.push(`feels like ${w.apparentTemperature}°C`);
  if (w.high !== undefined && w.low !== undefined) parts.push(`high ${w.high}°C / low ${w.low}°C`);
  if (w.rainChance !== undefined) parts.push(`${w.rainChance}% chance of rain`);
  if (w.windSpeed !== undefined) parts.push(`wind ${w.windSpeed} km/h`);
  return `For ${toolResult.location}, I’m seeing ${parts.join(', ')}. Source: ${toolResult.provider}.`;
}

function localFallbackResponse(intent, context) {
  if (intent === 'weather_lookup') {
    if (context.toolResult?.ok) return formatWeather(context.toolResult);
    return `I tried to use the weather tool, but it failed: ${context.toolResult?.error || context.toolResult?.note || 'Unknown issue'}.`;
  }

  if (intent === 'web_search') {
    if (context.toolResult?.ok) {
      const resultLines = [context.toolResult.abstract, ...(context.toolResult.results || []).map((r) => `- ${r.text}`)].filter(Boolean);
      return `I found this using the lightweight web search tool:\n${resultLines.join('\n')}`;
    }
    return context.toolResult?.note || 'The lightweight web search tool did not return a useful result. Next step is adding a stronger web search provider.';
  }

  if (intent === 'system_status') {
    return 'NoA is running. Diagnostics, memory, OpenAI bridge, local tools, weather lookup and lightweight web search are active in Alpha 0.7.';
  }

  if (intent === 'tool_list') {
    return `Right now I can use: ${context.availableTools.join(', ')}. Weather is live through Open-Meteo, and web search is currently a lightweight DuckDuckGo Instant Answer tool.`;
  }

  if (intent === 'memory_lookup') {
    if (!context.memories?.length) return 'I do not have any saved local memories yet. You can say “Noah, remember that...” and I’ll store it locally.';
    return `Here’s what I remember locally:\n${context.memories.map((m) => `- ${m.text}`).join('\n')}`;
  }

  if (intent === 'todays_briefing') {
    const brief = context.todaysBriefing;
    return `Here’s your local prototype briefing: ${brief.activeJobs} active jobs, ${brief.outstandingTasks} outstanding tasks and ${brief.meetings} meeting. Priority focus: ${brief.priorityFocus}`;
  }

  return 'I’m here. OpenAI may be offline or unavailable right now, so I’m answering from NoA’s local fallback layer.';
}
