const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

const isDev = !app.isPackaged;
let mainWindow;

const defaultStore = {
  openaiApiKey: '',
  openaiModel: 'gpt-4.1-mini',
  notionApiKey: '',
  notionTasksDatabaseId: '',
  notionJobsDatabaseId: '',
  memories: [],
  webSearchProvider: 'duckduckgo-lite',
  voiceAutoSpeak: false,
  voiceWakeWord: 'Noah'
};

let diagnostics = {
  provider: 'Local fallback',
  brainOnline: false,
  apiKeySaved: false,
  model: 'gpt-4.1-mini',
  notionConnected: false,
  notionKeySaved: false,
  notionTasksDatabaseSaved: false,
  notionJobsDatabaseSaved: false,
  lastNotionStatus: 'Not tested',
  lastNotionError: null,
  lastNotionRequestAt: null,
  startupHealthStatus: 'Not run',
  startupHealthCheckedAt: null,
  weatherOnline: false,
  webSearchOnline: false,
  memoryOnline: false,
  lastIntent: 'none',
  lastConfidence: 0,
  lastApiRequestAt: null,
  lastApiStatus: 'Not tested',
  lastApiLatencyMs: null,
  lastApiError: null,
  lastResponseSource: 'none',
  toolsRegistered: 16,
  knowledgeGraphStatus: 'Not built',
  entityCount: 0,
  relationCount: 0,
  memoryEntries: 0,
  lastToolName: 'none',
  lastToolStatus: 'idle',
  lastToolLatencyMs: null,
  lastToolError: null
};

function getStorePath() { return path.join(app.getPath('userData'), 'noa-settings.json'); }
function readStore() {
  try {
    const file = getStorePath();
    if (!fs.existsSync(file)) return { ...defaultStore };
    return { ...defaultStore, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch (_error) { return { ...defaultStore }; }
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
    openaiModel: settings.openaiModel || defaultStore.openaiModel,
    hasOpenAIKey: Boolean(settings.openaiApiKey),
    hasNotionKey: Boolean(settings.notionApiKey),
    notionTasksDatabaseSaved: Boolean(settings.notionTasksDatabaseId),
    notionJobsDatabaseSaved: Boolean(settings.notionJobsDatabaseId),
    notionTasksDatabaseId: settings.notionTasksDatabaseId || '',
    notionJobsDatabaseId: settings.notionJobsDatabaseId || '',
    memoryCount: Array.isArray(settings.memories) ? settings.memories.length : 0,
    webSearchProvider: settings.webSearchProvider || 'duckduckgo-lite',
    voiceAutoSpeak: Boolean(settings.voiceAutoSpeak),
    voiceWakeWord: settings.voiceWakeWord || 'Noah'
  };
}
function updateDiagnosticsFromStore(settings = readStore()) {
  diagnostics.apiKeySaved = Boolean(settings.openaiApiKey);
  diagnostics.model = settings.openaiModel || defaultStore.openaiModel;
  diagnostics.notionKeySaved = Boolean(settings.notionApiKey);
  diagnostics.notionTasksDatabaseSaved = Boolean(settings.notionTasksDatabaseId);
  diagnostics.notionJobsDatabaseSaved = Boolean(settings.notionJobsDatabaseId);
  diagnostics.memoryEntries = Array.isArray(settings.memories) ? settings.memories.length : 0;
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360, height: 860, minWidth: 1080, minHeight: 720,
    backgroundColor: '#070910', title: 'NoA',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false }
  });
  if (isDev) mainWindow.loadURL('http://127.0.0.1:5173');
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}
app.whenReady().then(() => {
  updateDiagnosticsFromStore();
  diagnostics.startupHealthStatus = 'Checking';
  createWindow();
  runStartupHealthCheck().catch((error) => {
    diagnostics.startupHealthStatus = 'Failed';
    diagnostics.lastToolError = error.message || String(error);
  });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('noa:get-settings', async () => safeSettings());
ipcMain.handle('noa:save-settings', async (_event, settings) => {
  const current = readStore();
  const next = {
    ...current,
    openaiModel: settings.openaiModel || current.openaiModel || defaultStore.openaiModel,
    notionTasksDatabaseId: typeof settings.notionTasksDatabaseId === 'string' ? settings.notionTasksDatabaseId.trim() : current.notionTasksDatabaseId,
    notionJobsDatabaseId: typeof settings.notionJobsDatabaseId === 'string' ? settings.notionJobsDatabaseId.trim() : current.notionJobsDatabaseId,
    webSearchProvider: settings.webSearchProvider || current.webSearchProvider || 'duckduckgo-lite',
    voiceAutoSpeak: typeof settings.voiceAutoSpeak === 'boolean' ? settings.voiceAutoSpeak : Boolean(current.voiceAutoSpeak),
    voiceWakeWord: typeof settings.voiceWakeWord === 'string' && settings.voiceWakeWord.trim() ? settings.voiceWakeWord.trim() : (current.voiceWakeWord || 'Noah')
  };
  if (typeof settings.openaiApiKey === 'string' && settings.openaiApiKey.trim()) next.openaiApiKey = settings.openaiApiKey.trim();
  if (typeof settings.notionApiKey === 'string' && settings.notionApiKey.trim()) next.notionApiKey = settings.notionApiKey.trim();
  return writeStore(next);
});
ipcMain.handle('noa:get-diagnostics', async () => { updateDiagnosticsFromStore(); return diagnostics; });
ipcMain.handle('noa:startup-health-check', async () => runStartupHealthCheck());


async function runStartupHealthCheck() {
  const settings = readStore();
  updateDiagnosticsFromStore(settings);
  diagnostics.startupHealthStatus = 'Checking';
  diagnostics.startupHealthCheckedAt = new Date().toISOString();
  diagnostics.memoryOnline = true;

  const checks = [];

  checks.push((async () => {
    if (!settings.openaiApiKey) {
      diagnostics.provider = 'Local fallback';
      diagnostics.brainOnline = false;
      diagnostics.lastApiStatus = 'Missing API key';
      return { name: 'OpenAI', ok: false, skipped: true };
    }
    const started = Date.now();
    diagnostics.lastApiRequestAt = new Date().toISOString();
    diagnostics.lastApiStatus = 'Startup check';
    try {
      await callOpenAI({ apiKey: settings.openaiApiKey, model: settings.openaiModel || defaultStore.openaiModel, input: 'Reply with exactly: online' });
      diagnostics.provider = 'OpenAI';
      diagnostics.brainOnline = true;
      diagnostics.lastApiStatus = 'Success';
      diagnostics.lastApiLatencyMs = Date.now() - started;
      diagnostics.lastApiError = null;
      return { name: 'OpenAI', ok: true };
    } catch (error) {
      diagnostics.provider = 'Local fallback';
      diagnostics.brainOnline = false;
      diagnostics.lastApiStatus = 'Failed';
      diagnostics.lastApiLatencyMs = Date.now() - started;
      diagnostics.lastApiError = error.message || String(error);
      return { name: 'OpenAI', ok: false, error: diagnostics.lastApiError };
    }
  })());

  checks.push((async () => {
    if (!settings.notionApiKey || (!settings.notionTasksDatabaseId && !settings.notionJobsDatabaseId)) {
      diagnostics.notionConnected = false;
      diagnostics.lastNotionStatus = 'Not configured';
      return { name: 'Notion', ok: false, skipped: true };
    }
    diagnostics.lastNotionRequestAt = new Date().toISOString();
    diagnostics.lastNotionStatus = 'Startup check';
    try {
      const id = settings.notionTasksDatabaseId || settings.notionJobsDatabaseId;
      await queryNotionDatabase(settings, id, { page_size: 1 });
      diagnostics.notionConnected = true;
      diagnostics.lastNotionStatus = 'Success';
      diagnostics.lastNotionError = null;
      return { name: 'Notion', ok: true };
    } catch (error) {
      diagnostics.notionConnected = false;
      diagnostics.lastNotionStatus = 'Failed';
      diagnostics.lastNotionError = error.message || String(error);
      return { name: 'Notion', ok: false, error: diagnostics.lastNotionError };
    }
  })());

  checks.push((async () => {
    try {
      const weather = await getWeather('weather in Brisbane');
      diagnostics.weatherOnline = Boolean(weather.ok);
      return { name: 'Weather', ok: Boolean(weather.ok) };
    } catch (error) {
      diagnostics.weatherOnline = false;
      return { name: 'Weather', ok: false, error: error.message || String(error) };
    }
  })());

  checks.push((async () => {
    try {
      const search = await webSearchLite('OpenAI');
      diagnostics.webSearchOnline = Boolean(search.ok || search.note);
      return { name: 'Web Search', ok: diagnostics.webSearchOnline };
    } catch (error) {
      diagnostics.webSearchOnline = false;
      return { name: 'Web Search', ok: false, error: error.message || String(error) };
    }
  })());

  const results = await Promise.all(checks);
  const online = results.filter((r) => r.ok).length + 1; // memory is local and available if store loaded
  diagnostics.startupHealthStatus = `${online}/5 online`;
  diagnostics.lastToolName = 'startupHealthCheck';
  diagnostics.lastToolStatus = online >= 3 ? 'success' : 'limited';
  diagnostics.lastToolError = results.filter((r) => !r.ok && !r.skipped).map((r) => `${r.name}: ${r.error || 'unavailable'}`).join(' | ') || null;
  return { ok: online >= 3, results: [{ name: 'Memory', ok: true }, ...results], diagnostics };
}

ipcMain.handle('noa:test-openai', async () => {
  const settings = readStore();
  const started = Date.now();
  diagnostics.lastApiRequestAt = new Date().toISOString(); diagnostics.lastApiStatus = 'Testing'; diagnostics.lastApiError = null;
  if (!settings.openaiApiKey) {
    diagnostics.provider = 'Local fallback'; diagnostics.brainOnline = false; diagnostics.lastApiStatus = 'Missing API key'; diagnostics.lastApiLatencyMs = Date.now() - started; diagnostics.lastApiError = 'No OpenAI API key saved.';
    return { ok: false, ...diagnostics };
  }
  try {
    const text = await callOpenAI({ apiKey: settings.openaiApiKey, model: settings.openaiModel || defaultStore.openaiModel, input: 'Reply with exactly: NoA OpenAI diagnostics online.' });
    diagnostics.provider = 'OpenAI'; diagnostics.brainOnline = true; diagnostics.lastApiStatus = 'Success'; diagnostics.lastApiLatencyMs = Date.now() - started; diagnostics.lastApiError = null; diagnostics.lastResponseSource = 'openai_test';
    return { ok: true, text, ...diagnostics };
  } catch (error) {
    diagnostics.provider = 'Local fallback'; diagnostics.brainOnline = false; diagnostics.lastApiStatus = 'Failed'; diagnostics.lastApiLatencyMs = Date.now() - started; diagnostics.lastApiError = error.message || String(error);
    return { ok: false, ...diagnostics };
  }
});

ipcMain.handle('noa:test-notion', async () => {
  const settings = readStore();
  diagnostics.lastNotionRequestAt = new Date().toISOString(); diagnostics.lastNotionStatus = 'Testing'; diagnostics.lastNotionError = null;
  if (!settings.notionApiKey) { diagnostics.notionConnected = false; diagnostics.lastNotionStatus = 'Missing API key'; diagnostics.lastNotionError = 'No Notion integration token saved.'; return { ok: false, ...diagnostics }; }
  try {
    const targets = [];
    if (settings.notionTasksDatabaseId) targets.push({ kind: 'tasks', id: settings.notionTasksDatabaseId });
    if (settings.notionJobsDatabaseId) targets.push({ kind: 'jobs', id: settings.notionJobsDatabaseId });
    if (!targets.length) throw new Error('Add at least one Notion database ID for tasks or jobs.');
    const results = [];
    for (const target of targets) {
      const pages = await queryNotionDatabase(settings, target.id, { page_size: 3 });
      results.push(`${target.kind}: ${pages.length} pages reachable`);
    }
    diagnostics.notionConnected = true; diagnostics.lastNotionStatus = 'Success'; diagnostics.lastNotionError = null;
    return { ok: true, message: results.join(' | '), ...diagnostics };
  } catch (error) {
    diagnostics.notionConnected = false; diagnostics.lastNotionStatus = 'Failed'; diagnostics.lastNotionError = error.message || String(error);
    return { ok: false, ...diagnostics };
  }
});


ipcMain.handle('noa:get-knowledge-graph', async () => {
  const settings = readStore();
  try {
    const graph = await getKnowledgeGraph(settings);
    diagnostics.knowledgeGraphStatus = graph.ok ? 'Ready' : 'Limited';
    diagnostics.entityCount = graph.entities?.length || 0;
    diagnostics.relationCount = graph.relations?.length || 0;
    return graph;
  } catch (error) {
    diagnostics.knowledgeGraphStatus = 'Failed';
    return { ok: false, tool: 'getKnowledgeGraph', error: error.message || String(error), entities: [], relations: [], clusters: [] };
  }
});

ipcMain.handle('noa:chat', async (_event, payload) => {
  const message = String(payload?.message || '').trim();
  const history = Array.isArray(payload?.history) ? payload.history.slice(-8) : [];
  const settings = readStore();
  const route = routeIntent(message);
  diagnostics.lastIntent = route.intent; diagnostics.lastConfidence = route.confidence;

  if (route.intent === 'remember') {
    const memory = message.replace(/^noah,?\s*remember\s*(that)?/i, '').trim();
    const memories = Array.isArray(settings.memories) ? settings.memories : [];
    memories.push({ text: memory || message, createdAt: new Date().toISOString() }); writeStore({ memories });
    return { ok: true, source: 'local_tool', intent: route.intent, confidence: route.confidence, text: `Got it - I’ll remember that. ${memory ? `I’ve saved: “${memory}”.` : 'I’ve saved that note locally.'}` };
  }

  const toolResult = await executeToolForIntent(route.intent, message, settings);
  const toolContext = buildToolContext(route.intent, settings, diagnostics, toolResult);

  if (!settings.openaiApiKey) {
    diagnostics.provider = 'Local fallback'; diagnostics.brainOnline = false; diagnostics.lastResponseSource = toolResult ? 'local_tool' : 'local_fallback';
    return { ok: true, source: diagnostics.lastResponseSource, intent: route.intent, confidence: route.confidence, text: localFallbackResponse(route.intent, toolContext) };
  }

  const started = Date.now(); diagnostics.lastApiRequestAt = new Date().toISOString(); diagnostics.lastApiStatus = 'Sending'; diagnostics.lastApiError = null;
  try {
    const prompt = buildNoahPrompt({ message, history, toolContext });
    const text = await callOpenAI({ apiKey: settings.openaiApiKey, model: settings.openaiModel || defaultStore.openaiModel, input: prompt });
    diagnostics.provider = 'OpenAI'; diagnostics.brainOnline = true; diagnostics.lastApiStatus = 'Success'; diagnostics.lastApiLatencyMs = Date.now() - started; diagnostics.lastApiError = null; diagnostics.lastResponseSource = toolResult ? `openai_with_${toolResult.tool}` : 'openai';
    return { ok: true, source: diagnostics.lastResponseSource, intent: route.intent, confidence: route.confidence, text };
  } catch (error) {
    diagnostics.provider = 'Local fallback'; diagnostics.brainOnline = false; diagnostics.lastApiStatus = 'Failed'; diagnostics.lastApiLatencyMs = Date.now() - started; diagnostics.lastApiError = error.message || String(error); diagnostics.lastResponseSource = toolResult ? 'local_tool_after_openai_error' : 'local_fallback_after_error';
    return { ok: false, source: diagnostics.lastResponseSource, intent: route.intent, confidence: route.confidence, text: `${localFallbackResponse(route.intent, toolContext)}\n\nI also tried OpenAI, but that request failed. Check Diagnostics for the exact error.` };
  }
});

ipcMain.handle('noa:check-for-updates', async () => {
  if (isDev) return { status: 'Dev mode', message: 'Auto updates only run in packaged builds.' };
  try { const result = await autoUpdater.checkForUpdatesAndNotify(); return { status: 'Checking', message: result ? 'Update check started.' : 'No update response returned.' }; }
  catch (error) { return { status: 'Failed', message: error.message || String(error) }; }
});

function routeIntent(message) {
  const m = message.toLowerCase();
  if (m.includes('voice') || m.includes('speak') || m.includes('read aloud') || m.includes('wake word')) return { intent: 'voice_status', confidence: 88 };
  if (m.includes('remember')) return { intent: 'remember', confidence: 92 };
  if (m.includes('knowledge graph') || m.includes('relationship map') || m.includes('entities') || m.includes('map my workspace') || m.includes('client map')) return { intent: 'knowledge_graph', confidence: 91 };
  if (m.includes('weather') || m.includes('forecast') || m.includes('temperature') || m.includes('rain')) return { intent: 'weather_lookup', confidence: 91 };
  if (m.includes('notion') && (m.includes('test') || m.includes('connect'))) return { intent: 'notion_status', confidence: 88 };
  if (m.includes('briefing') || m.includes('what should i focus') || m.includes('focus on') || m.includes('attention') || m.includes('what is on today') || m.includes("what's on today") || m.includes('today')) return { intent: 'workspace_briefing', confidence: 92 };
  if (m.includes('client') || m.includes('omf') || m.includes('edgepro') || m.includes('css touring') || m.includes('ontop') || m.includes('on top') || m.includes('gc elite') || m.includes('loco')) return { intent: 'client_intelligence', confidence: 87 };
  if (m.includes('this week') || m.includes('due soon') || m.includes('upcoming')) return { intent: 'due_soon', confidence: 86 };
  if (m.includes('task') || m.includes('due today') || m.includes('to do') || m.includes('todo') || m.includes('overdue')) return { intent: 'notion_tasks', confidence: 90 };
  if (m.includes('job') || m.includes('shoot') || m.includes('booking') || m.includes('pipeline')) return { intent: 'notion_jobs', confidence: 88 };
  if (m.includes('search') || m.includes('look up') || m.includes('latest') || m.includes('google') || m.includes('web')) return { intent: 'web_search', confidence: 82 };
  if (m.includes('what do you remember') || m.includes('memory')) return { intent: 'memory_lookup', confidence: 86 };
  if (m.includes('status') || m.includes('diagnostic') || m.includes('online')) return { intent: 'system_status', confidence: 84 };
  if (m.includes('tool') || m.includes('what can you use')) return { intent: 'tool_list', confidence: 88 };
  return { intent: 'openai_general_response', confidence: 68 };
}

async function executeToolForIntent(intent, message, settings) {
  const toolMap = {
    weather_lookup: 'getWeather',
    web_search: 'webSearchLite',
    notion_tasks: 'getNotionTasks',
    notion_jobs: 'getNotionJobs',
    todays_briefing: 'getCombinedBriefing',
    workspace_briefing: 'getWorkspaceBriefing',
    client_intelligence: 'getClientIntelligence',
    due_soon: 'getDueSoon',
    notion_status: 'testNotion',
    knowledge_graph: 'getKnowledgeGraph',
    voice_status: 'getVoiceStatus'
  };
  if (!toolMap[intent]) return null;
  const started = Date.now(); diagnostics.lastToolName = toolMap[intent]; diagnostics.lastToolStatus = 'running'; diagnostics.lastToolLatencyMs = null; diagnostics.lastToolError = null;
  try {
    let result;
    if (intent === 'weather_lookup') result = await getWeather(message);
    if (intent === 'web_search') result = await webSearchLite(message);
    if (intent === 'notion_tasks') result = await getNotionTasks(settings, message);
    if (intent === 'notion_jobs') result = await getNotionJobs(settings, message);
    if (intent === 'todays_briefing' || intent === 'workspace_briefing') result = await getWorkspaceBriefing(settings, message);
    if (intent === 'client_intelligence') result = await getClientIntelligence(settings, message);
    if (intent === 'due_soon') result = await getDueSoon(settings, message);
    if (intent === 'notion_status') result = await getNotionStatus(settings);
    if (intent === 'knowledge_graph') result = await getKnowledgeGraph(settings);
    if (intent === 'voice_status') result = { ok: true, tool: 'getVoiceStatus', wakeWord: settings.voiceWakeWord || 'Noah', autoSpeak: Boolean(settings.voiceAutoSpeak), note: 'Manual voice input and speech output are available in Alpha 1.3. Always-on wake-word detection is planned for a later local audio service.' };
    diagnostics.lastToolStatus = result.ok ? 'success' : 'limited'; diagnostics.lastToolLatencyMs = Date.now() - started; diagnostics.lastToolError = result.ok ? null : result.error || result.note || 'Tool returned limited data.';
    return result;
  } catch (error) {
    diagnostics.lastToolStatus = 'failed'; diagnostics.lastToolLatencyMs = Date.now() - started; diagnostics.lastToolError = error.message || String(error);
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
  for (const [key, value] of Object.entries(known)) if (m.includes(key)) return value;
  return known.brisbane;
}
async function getWeather(message) {
  const location = extractLocation(message);
  const params = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), current: 'temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m', daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code', timezone: location.timezone, forecast_days: '1' });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data?.reason || response.statusText || 'Weather request failed.');
  const current = data.current || {}, daily = data.daily || {};
  return { ok: true, tool: 'getWeather', location: location.name, provider: 'Open-Meteo', summary: { temperature: current.temperature_2m, apparentTemperature: current.apparent_temperature, windSpeed: current.wind_speed_10m, precipitation: current.precipitation, weatherCode: current.weather_code, high: daily.temperature_2m_max?.[0], low: daily.temperature_2m_min?.[0], rainChance: daily.precipitation_probability_max?.[0], time: current.time } };
}
async function webSearchLite(message) {
  const query = message.replace(/^(noah,?\s*)?/i, '').replace(/\b(search|look up|web|google|latest)\b/gi, '').replace(/\s+/g, ' ').trim() || message;
  const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(response.statusText || 'Web search request failed.');
  const related = Array.isArray(data.RelatedTopics) ? data.RelatedTopics.flatMap((item) => item.Topics || [item]).filter((item) => item.Text).slice(0, 5) : [];
  if (!data.AbstractText && !related.length) return { ok: false, tool: 'webSearchLite', query, note: 'DuckDuckGo Instant Answer returned no usable summary. A stronger search provider can be added next.' };
  return { ok: true, tool: 'webSearchLite', provider: 'DuckDuckGo Instant Answer', query, abstract: data.AbstractText || '', heading: data.Heading || '', results: related.map((item) => ({ text: item.Text, url: item.FirstURL || '' })) };
}

function normalizeDatabaseId(id) { return String(id || '').trim().replace(/-/g, ''); }
async function notionFetch(settings, endpoint, body) {
  if (!settings.notionApiKey) throw new Error('No Notion API key saved.');
  const response = await fetch(`https://api.notion.com/v1/${endpoint}`, { method: 'POST', headers: { Authorization: `Bearer ${settings.notionApiKey}`, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' }, body: JSON.stringify(body || {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || response.statusText || 'Notion request failed.');
  return data;
}
async function queryNotionDatabase(settings, databaseId, body = {}) {
  const cleanId = normalizeDatabaseId(databaseId);
  if (!cleanId) throw new Error('Missing Notion database ID.');
  const data = await notionFetch(settings, `databases/${cleanId}/query`, { page_size: 20, ...body });
  return Array.isArray(data.results) ? data.results : [];
}
function plainText(items) { return Array.isArray(items) ? items.map((x) => x.plain_text || '').join('') : ''; }
function propValue(prop) {
  if (!prop) return '';
  if (prop.type === 'title') return plainText(prop.title);
  if (prop.type === 'rich_text') return plainText(prop.rich_text);
  if (prop.type === 'date') return prop.date?.start || '';
  if (prop.type === 'status') return prop.status?.name || '';
  if (prop.type === 'select') return prop.select?.name || '';
  if (prop.type === 'multi_select') return (prop.multi_select || []).map((x) => x.name).join(', ');
  if (prop.type === 'checkbox') return prop.checkbox ? 'Yes' : 'No';
  if (prop.type === 'people') return (prop.people || []).map((x) => x.name || x.id).join(', ');
  if (prop.type === 'number') return String(prop.number ?? '');
  if (prop.type === 'url') return prop.url || '';
  if (prop.type === 'email') return prop.email || '';
  if (prop.type === 'phone_number') return prop.phone_number || '';
  return '';
}
function pageToItem(page) {
  const props = page.properties || {};
  const entries = Object.entries(props);
  const titleEntry = entries.find(([, p]) => p.type === 'title');
  const dateEntry = entries.find(([name, p]) => p.type === 'date' && /due|date|deadline|schedule|when/i.test(name)) || entries.find(([, p]) => p.type === 'date');
  const statusEntry = entries.find(([name, p]) => ['status', 'select', 'checkbox'].includes(p.type) && /status|stage|done|complete|progress/i.test(name));
  const clientEntry = entries.find(([name]) => /client|customer|brand/i.test(name));
  const priorityEntry = entries.find(([name]) => /priority|urgency|importance/i.test(name));
  return {
    id: page.id,
    title: propValue(titleEntry?.[1]) || 'Untitled',
    date: propValue(dateEntry?.[1]),
    status: propValue(statusEntry?.[1]) || '',
    client: propValue(clientEntry?.[1]) || '',
    priority: propValue(priorityEntry?.[1]) || '',
    url: page.url,
    updatedAt: page.last_edited_time
  };
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function isDueTodayOrOverdue(dateValue) {
  if (!dateValue) return false;
  const d = String(dateValue).slice(0, 10);
  return d <= todayISO();
}
function isIncomplete(item) { return !/done|complete|completed|archived|cancelled|yes/i.test(item.status || ''); }
async function getNotionTasks(settings, message) {
  if (!settings.notionTasksDatabaseId) return { ok: false, tool: 'getNotionTasks', note: 'No Notion tasks database ID saved yet.' };
  const pages = await queryNotionDatabase(settings, settings.notionTasksDatabaseId);
  const items = pages.map(pageToItem).filter(isIncomplete);
  const m = String(message).toLowerCase();
  const filtered = (m.includes('today') || m.includes('overdue') || m.includes('attention') || m.includes('due')) ? items.filter((i) => isDueTodayOrOverdue(i.date)) : items;
  diagnostics.notionConnected = true; diagnostics.lastNotionStatus = 'Success'; diagnostics.lastNotionError = null;
  return { ok: true, tool: 'getNotionTasks', provider: 'Notion', scope: filtered.length === items.length ? 'all_open' : 'due_today_or_overdue', count: filtered.length, items: filtered.slice(0, 12) };
}
async function getNotionJobs(settings, _message) {
  if (!settings.notionJobsDatabaseId) return { ok: false, tool: 'getNotionJobs', note: 'No Notion jobs database ID saved yet.' };
  const pages = await queryNotionDatabase(settings, settings.notionJobsDatabaseId);
  const items = pages.map(pageToItem).filter(isIncomplete).slice(0, 12);
  diagnostics.notionConnected = true; diagnostics.lastNotionStatus = 'Success'; diagnostics.lastNotionError = null;
  return { ok: true, tool: 'getNotionJobs', provider: 'Notion', count: items.length, items };
}
async function getCombinedBriefing(settings, message) {
  return getWorkspaceBriefing(settings, message);
}
function daysFromToday(dateValue) {
  if (!dateValue) return null;
  const today = new Date(todayISO() + 'T00:00:00');
  const target = new Date(String(dateValue).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target - today) / 86400000);
}
function inNextDays(dateValue, days) {
  const diff = daysFromToday(dateValue);
  return diff !== null && diff >= 0 && diff <= days;
}
function extractClientKeyword(message) {
  const m = String(message).toLowerCase();
  const known = ['edgepro', 'omf', 'css touring', 'on top roofing', 'ontoproofing', 'gc elite', 'loco tattoo', 'built by lune', 'voltage energy'];
  return known.find((k) => m.includes(k)) || '';
}
async function getWorkspaceBriefing(settings, message) {
  const tasksResult = settings.notionTasksDatabaseId ? await getNotionTasks(settings, message) : null;
  const jobsResult = settings.notionJobsDatabaseId ? await getNotionJobs(settings, message) : null;
  if (!tasksResult && !jobsResult) return { ok: false, tool: 'getWorkspaceBriefing', note: 'Notion is not configured yet, so I can only provide the prototype briefing.' };
  const tasks = tasksResult?.items || [];
  const jobs = jobsResult?.items || [];
  const overdueTasks = tasks.filter((i) => daysFromToday(i.date) !== null && daysFromToday(i.date) < 0);
  const todayTasks = tasks.filter((i) => daysFromToday(i.date) === 0);
  const weekTasks = tasks.filter((i) => inNextDays(i.date, 7));
  const weekJobs = jobs.filter((i) => inNextDays(i.date, 7));
  const priorityTasks = tasks.filter((i) => /urgent|high/i.test(i.priority || i.status || '')).slice(0, 6);
  diagnostics.notionConnected = true; diagnostics.lastNotionStatus = 'Success'; diagnostics.lastNotionError = null;
  return { ok: true, tool: 'getWorkspaceBriefing', provider: 'Notion', summary: { openTasks: tasks.length, openJobs: jobs.length, overdueTasks: overdueTasks.length, todayTasks: todayTasks.length, weekTasks: weekTasks.length, weekJobs: weekJobs.length }, overdueTasks, todayTasks, weekTasks: weekTasks.slice(0, 10), weekJobs: weekJobs.slice(0, 10), priorityTasks, tasks: tasks.slice(0, 12), jobs: jobs.slice(0, 12) };
}
async function getClientIntelligence(settings, message) {
  const keyword = extractClientKeyword(message);
  const jobsResult = settings.notionJobsDatabaseId ? await getNotionJobs(settings, message) : { ok: true, items: [] };
  const tasksResult = settings.notionTasksDatabaseId ? await getNotionTasks(settings, message) : { ok: true, items: [] };
  const hay = (item) => `${item.title} ${item.client} ${item.status}`.toLowerCase();
  const filter = (item) => !keyword || hay(item).includes(keyword);
  return { ok: true, tool: 'getClientIntelligence', provider: 'Notion', client: keyword || 'requested client', jobs: (jobsResult.items || []).filter(filter).slice(0, 10), tasks: (tasksResult.items || []).filter(filter).slice(0, 10) };
}
async function getDueSoon(settings, message) {
  const tasksResult = settings.notionTasksDatabaseId ? await getNotionTasks(settings, message) : { ok: true, items: [] };
  const jobsResult = settings.notionJobsDatabaseId ? await getNotionJobs(settings, message) : { ok: true, items: [] };
  const dueTasks = (tasksResult.items || []).filter((i) => inNextDays(i.date, 7)).slice(0, 12);
  const dueJobs = (jobsResult.items || []).filter((i) => inNextDays(i.date, 7)).slice(0, 12);
  return { ok: true, tool: 'getDueSoon', provider: 'Notion', dueTasks, dueJobs };
}
async function getNotionStatus(settings) {
  if (!settings.notionApiKey) return { ok: false, tool: 'testNotion', note: 'No Notion API key saved.' };
  return await (async () => {
    const targets = [];
    if (settings.notionTasksDatabaseId) targets.push(await getNotionTasks(settings, 'all tasks'));
    if (settings.notionJobsDatabaseId) targets.push(await getNotionJobs(settings, 'jobs'));
    return { ok: targets.some((x) => x.ok), tool: 'testNotion', results: targets, note: targets.length ? undefined : 'No Notion database IDs saved.' };
  })();
}


function upsertEntity(map, id, label, type, weight = 1, meta = {}) {
  if (!id || !label) return;
  const key = `${type}:${String(id).toLowerCase()}`;
  const existing = map.get(key) || { id: key, label, type, weight: 0, meta: {} };
  existing.weight += weight;
  existing.meta = { ...existing.meta, ...meta };
  map.set(key, existing);
}
function addRelation(relations, from, to, type, weight = 1) {
  if (!from || !to || from === to) return;
  const key = `${from}->${to}:${type}`;
  const existing = relations.get(key) || { id: key, from, to, type, weight: 0 };
  existing.weight += weight;
  relations.set(key, existing);
}
function splitClientValues(value) {
  return String(value || '').split(',').map((x) => x.trim()).filter(Boolean);
}
function entityId(type, label) { return `${type}:${String(label || '').toLowerCase()}`; }
async function getKnowledgeGraph(settings) {
  const tasksResult = settings.notionTasksDatabaseId ? await getNotionTasks(settings, 'all tasks') : { ok: true, items: [] };
  const jobsResult = settings.notionJobsDatabaseId ? await getNotionJobs(settings, 'jobs') : { ok: true, items: [] };
  const entities = new Map();
  const relations = new Map();
  upsertEntity(entities, 'noa', 'NoA Core', 'system', 6);
  upsertEntity(entities, 'notion', 'Notion', 'integration', settings.notionApiKey ? 5 : 1);
  addRelation(relations, 'system:noa', 'integration:notion', 'connects_to', settings.notionApiKey ? 4 : 1);

  const addItem = (item, kind) => {
    const itemType = kind === 'job' ? 'job' : 'task';
    const itemKey = entityId(itemType, item.title);
    upsertEntity(entities, item.title, item.title, itemType, 2, { status: item.status, date: item.date, url: item.url });
    addRelation(relations, 'integration:notion', itemKey, 'contains', 1);
    if (item.date) {
      const bucket = daysFromToday(item.date) === 0 ? 'Today' : inNextDays(item.date, 7) ? 'This Week' : daysFromToday(item.date) < 0 ? 'Overdue' : 'Later';
      const bucketKey = entityId('time', bucket);
      upsertEntity(entities, bucket, bucket, 'time', 1);
      addRelation(relations, itemKey, bucketKey, 'scheduled_for', 1);
    }
    if (item.status) {
      const statusKey = entityId('status', item.status);
      upsertEntity(entities, item.status, item.status, 'status', 1);
      addRelation(relations, itemKey, statusKey, 'has_status', 1);
    }
    for (const client of splitClientValues(item.client)) {
      const clientKey = entityId('client', client);
      upsertEntity(entities, client, client, 'client', 3);
      addRelation(relations, clientKey, itemKey, kind === 'job' ? 'has_job' : 'has_task', 2);
    }
  };
  (tasksResult.items || []).forEach((item) => addItem(item, 'task'));
  (jobsResult.items || []).forEach((item) => addItem(item, 'job'));

  const list = Array.from(entities.values()).sort((a, b) => b.weight - a.weight).slice(0, 80);
  const relList = Array.from(relations.values()).sort((a, b) => b.weight - a.weight).slice(0, 120);
  const clusters = ['client', 'job', 'task', 'time', 'status', 'integration'].map((type) => ({ type, count: list.filter((x) => x.type === type).length })).filter((x) => x.count);
  diagnostics.knowledgeGraphStatus = 'Ready';
  diagnostics.entityCount = list.length;
  diagnostics.relationCount = relList.length;
  return { ok: true, tool: 'getKnowledgeGraph', provider: 'Notion + NoA', entities: list, relations: relList, clusters, sourceCounts: { tasks: tasksResult.items?.length || 0, jobs: jobsResult.items?.length || 0 } };
}

function buildToolContext(intent, settings, diag, toolResult) {
  const memories = Array.isArray(settings.memories) ? settings.memories.slice(-12) : [];
  return {
    intent,
    diagnostics: { provider: diag.provider, apiKeySaved: Boolean(settings.openaiApiKey), model: settings.openaiModel || defaultStore.openaiModel, notionConnected: diag.notionConnected, notionConfigured: Boolean(settings.notionApiKey && (settings.notionTasksDatabaseId || settings.notionJobsDatabaseId)), toolsRegistered: diag.toolsRegistered, memoryEntries: memories.length, lastToolName: diag.lastToolName, lastToolStatus: diag.lastToolStatus },
    availableTools: ['getTodaysBriefing', 'getWorkspaceBriefing', 'getClientIntelligence', 'getDueSoon', 'getSystemStatus', 'listTools', 'rememberContext', 'getWeather', 'webSearchLite', 'memoryLookup', 'diagnosticsStatus', 'getNotionTasks', 'getNotionJobs', 'getCombinedBriefing', 'getKnowledgeGraph'],
    prototypeBriefing: { activeJobs: 3, outstandingTasks: 7, meetings: 1, priorityFocus: 'Connect Notion and Optra data so Noah can brief from live systems.' },
    memories,
    toolResult
  };
}
function buildNoahPrompt({ message, history, toolContext }) {
  return [
    { role: 'system', content: ['You are Noah, the spoken AI assistant inside NoA, John Herholdt’s Noetic Advisor desktop app.', 'NoA is the visual system name. Noah is the natural voice/conversation identity.', 'Speak warmly, naturally and directly. Do not sound like a diagnostic terminal.', 'Do not end replies with intent/source/confidence unless the user asks for technical detail.', 'Be honest about what is live data and what is prototype data.', 'Use toolResult data when provided. If Notion data is provided, summarise the real tasks/jobs clearly and practically.', 'For workspace briefings, group information into: immediate focus, overdue/today, upcoming this week, and recommended next move.', 'For client intelligence, summarise jobs and tasks connected to that client or keyword.', 'When knowledge graph data is provided, explain the important relationships between clients, tasks, jobs, time buckets and statuses.', 'When voice status is provided, explain clearly what voice can do now and what is planned next.', 'If Notion is not configured, explain what setting is missing.', 'Keep replies practical, conversational and useful.'].join('\n') },
    { role: 'user', content: [`Current user message: ${message}`, '', `Recent conversation: ${JSON.stringify(history)}`, '', `NoA tool/context state: ${JSON.stringify(toolContext, null, 2)}`].join('\n') }
  ];
}
async function callOpenAI({ apiKey, model, input }) {
  const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, input, temperature: 0.7 }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || response.statusText || `HTTP ${response.status}`);
  if (typeof data.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const outputText = data?.output?.flatMap((item) => item?.content || [])?.map((content) => content?.text || '').join('\n').trim();
  return outputText || 'OpenAI returned a response, but NoA could not extract readable text.';
}
function formatWeather(toolResult) {
  const w = toolResult?.summary || {}; const parts = [];
  if (w.temperature !== undefined) parts.push(`${w.temperature}°C now`); if (w.apparentTemperature !== undefined) parts.push(`feels like ${w.apparentTemperature}°C`); if (w.high !== undefined && w.low !== undefined) parts.push(`high ${w.high}°C / low ${w.low}°C`); if (w.rainChance !== undefined) parts.push(`${w.rainChance}% chance of rain`); if (w.windSpeed !== undefined) parts.push(`wind ${w.windSpeed} km/h`);
  return `For ${toolResult.location}, I’m seeing ${parts.join(', ')}. Source: ${toolResult.provider}.`;
}
function formatItems(label, items) {
  if (!items?.length) return `I didn’t find any open ${label}.`;
  return items.map((item, index) => `${index + 1}. ${item.title}${item.date ? ` - ${item.date}` : ''}${item.status ? ` (${item.status})` : ''}${item.client ? ` - ${item.client}` : ''}`).join('\n');
}

function formatWorkspaceBriefing(result) {
  const s = result.summary || {};
  const lines = [];
  lines.push(`Here’s your workspace briefing: ${s.openTasks || 0} open tasks and ${s.openJobs || 0} open jobs.`);
  if (s.overdueTasks) lines.push(`You have ${s.overdueTasks} overdue task${s.overdueTasks === 1 ? '' : 's'} that need attention.`);
  if (s.todayTasks) lines.push(`You have ${s.todayTasks} task${s.todayTasks === 1 ? '' : 's'} due today.`);
  if (s.weekJobs) lines.push(`${s.weekJobs} job${s.weekJobs === 1 ? '' : 's'} are coming up this week.`);
  if (result.priorityTasks?.length) lines.push(`\nPriority tasks:\n${formatItems('priority tasks', result.priorityTasks.slice(0, 5))}`);
  if (result.todayTasks?.length) lines.push(`\nDue today:\n${formatItems('today tasks', result.todayTasks.slice(0, 5))}`);
  if (result.weekJobs?.length) lines.push(`\nUpcoming jobs:\n${formatItems('jobs', result.weekJobs.slice(0, 5))}`);
  lines.push('\nRecommended next move: clear anything overdue or due today first, then move into the nearest upcoming client job.');
  return lines.join('\n');
}

function localFallbackResponse(intent, context) {
  const tr = context.toolResult;
  if (intent === 'weather_lookup') return tr?.ok ? formatWeather(tr) : `I tried to use the weather tool, but it failed: ${tr?.error || tr?.note || 'Unknown issue'}.`;
  if (intent === 'web_search') return tr?.ok ? `I found this using lightweight web search:\n${[tr.abstract, ...(tr.results || []).map((r) => `- ${r.text}`)].filter(Boolean).join('\n')}` : (tr?.note || 'The lightweight web search tool did not return a useful result.');
  if (intent === 'notion_tasks') return tr?.ok ? `Here’s what I found in Notion tasks:\n${formatItems('tasks', tr.items)}` : `I couldn’t pull Notion tasks yet: ${tr?.note || tr?.error || 'unknown issue'}`;
  if (intent === 'notion_jobs') return tr?.ok ? `Here’s what I found in Notion jobs:\n${formatItems('jobs', tr.items)}` : `I couldn’t pull Notion jobs yet: ${tr?.note || tr?.error || 'unknown issue'}`;
  if (intent === 'workspace_briefing') return tr?.ok ? formatWorkspaceBriefing(tr) : `I couldn’t build your workspace briefing yet: ${tr?.note || tr?.error || 'unknown issue'}`;
  if (intent === 'client_intelligence') return tr?.ok ? `Here’s what I found for ${tr.client}:\n\nJobs:\n${formatItems('jobs', tr.jobs)}\n\nTasks:\n${formatItems('tasks', tr.tasks)}` : `I couldn’t pull client intelligence yet: ${tr?.note || tr?.error || 'unknown issue'}`;
  if (intent === 'due_soon') return tr?.ok ? `Due this week:\n\nTasks:\n${formatItems('tasks', tr.dueTasks)}\n\nJobs:\n${formatItems('jobs', tr.dueJobs)}` : `I couldn’t pull due-soon items yet: ${tr?.note || tr?.error || 'unknown issue'}`;
  if (intent === 'todays_briefing') {
    if (tr?.ok && tr.results) return tr.results.map((r) => r.ok ? `${r.tool}:\n${formatItems(r.tool.includes('Task') ? 'tasks' : 'jobs', r.items)}` : r.note).join('\n\n');
    const brief = context.prototypeBriefing; return `Here’s your prototype briefing: ${brief.activeJobs} active jobs, ${brief.outstandingTasks} outstanding tasks and ${brief.meetings} meeting. Priority focus: ${brief.priorityFocus}`;
  }
  if (intent === 'knowledge_graph') return tr?.ok ? `I built a workspace knowledge graph with ${tr.entities?.length || 0} entities and ${tr.relations?.length || 0} relationships. Key clusters: ${(tr.clusters || []).map((c) => `${c.type} (${c.count})`).join(', ')}.` : `I couldn't build the knowledge graph yet: ${tr?.error || tr?.note || 'unknown issue'}`;
  if (intent === 'notion_status') return tr?.ok ? 'Notion is connected and at least one configured database is reachable.' : `Notion is not ready yet: ${tr?.note || tr?.error || 'check settings.'}`;
  if (intent === 'voice_status') return `Voice foundation is active. Wake phrase target: ${tr?.wakeWord || 'Noah'}. Auto-speak is ${tr?.autoSpeak ? 'enabled' : 'disabled'}. Manual voice input and text-to-speech are available from the Voice screen; always-on wake-word detection is planned for a later local audio service.`;
  if (intent === 'system_status') return 'NoA is running. Diagnostics, memory, OpenAI bridge, local tools, weather, lightweight web search and Workspace Intelligence are available in Alpha 1.0.';
  if (intent === 'tool_list') return `Right now I can use: ${context.availableTools.join(', ')}.`;
  if (intent === 'memory_lookup') return context.memories?.length ? `Here’s what I remember locally:\n${context.memories.map((m) => `- ${m.text}`).join('\n')}` : 'I do not have any saved local memories yet.';
  return 'I’m here. OpenAI may be offline or unavailable right now, so I’m answering from NoA’s local fallback layer.';
}
