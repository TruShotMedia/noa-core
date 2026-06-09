import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Activity, ArrowUpRight, Brain, CheckCircle2, Command, Cpu, Database, DownloadCloud, Gauge, KeyRound, Loader2, Lock, MessageSquareText, PlugZap, Send, Shield, Sparkles, TerminalSquare, Wifi, WifiOff, Network as NetworkIcon, Mic, MicOff, Volume2 } from 'lucide-react';
import './styles/app.css';

type Screen = 'dashboard' | 'chat' | 'integrations' | 'network' | 'knowledge' | 'voice' | 'diagnostics' | 'settings';
type Role = 'noa' | 'john';
type Message = { role: Role; text: string; source?: string; intent?: string; confidence?: number };

type NoASettings = {
  openaiModel?: string;
  hasOpenAIKey?: boolean;
  hasNotionKey?: boolean;
  notionTasksDatabaseSaved?: boolean;
  notionJobsDatabaseSaved?: boolean;
  notionTasksDatabaseId?: string;
  notionJobsDatabaseId?: string;
  memoryCount?: number;
  voiceAutoSpeak?: boolean;
  voiceWakeWord?: string;
};

type NoADiagnostics = {
  provider?: string;
  brainOnline?: boolean;
  apiKeySaved?: boolean;
  model?: string;
  notionConnected?: boolean;
  notionKeySaved?: boolean;
  notionTasksDatabaseSaved?: boolean;
  notionJobsDatabaseSaved?: boolean;
  lastNotionStatus?: string;
  lastNotionError?: string | null;
  lastNotionRequestAt?: string | null;
  startupHealthStatus?: string;
  startupHealthCheckedAt?: string | null;
  weatherOnline?: boolean;
  webSearchOnline?: boolean;
  memoryOnline?: boolean;
  lastIntent?: string;
  lastConfidence?: number;
  lastApiRequestAt?: string | null;
  lastApiStatus?: string;
  lastApiLatencyMs?: number | null;
  lastApiError?: string | null;
  lastResponseSource?: string;
  toolsRegistered?: number;
  memoryEntries?: number;
  lastToolName?: string;
  lastToolStatus?: string;
  lastToolLatencyMs?: number | null;
  lastToolError?: string | null;
  knowledgeGraphStatus?: string;
  entityCount?: number;
  relationCount?: number;
};

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Gauge },
  { id: 'chat', label: 'Chat', icon: MessageSquareText },
  { id: 'integrations', label: 'Integrations', icon: PlugZap },
  { id: 'network', label: 'Network', icon: Activity },
  { id: 'knowledge', label: 'Knowledge', icon: NetworkIcon },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'diagnostics', label: 'Diagnostics', icon: TerminalSquare },
  { id: 'settings', label: 'Settings', icon: Shield }
];

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [command, setCommand] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'noa', text: 'Hey John - Noah is online. Alpha 1.3 is online. I’ll run a startup health check automatically, then use Workspace Intelligence with properly formatted chat responses.', source: 'local' }
  ]);
  const [sending, setSending] = useState(false);
  const [settings, setSettings] = useState<NoASettings>({});
  const [diagnostics, setDiagnostics] = useState<NoADiagnostics | null>(null);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning, John.';
    if (hour < 18) return 'Good afternoon, John.';
    return 'Good evening, John.';
  }, []);

  const refreshDiagnostics = async () => {
    const [nextSettings, nextDiagnostics] = await Promise.all([window.noa?.getSettings(), window.noa?.getDiagnostics()]);
    if (nextSettings) setSettings(nextSettings);
    if (nextDiagnostics) setDiagnostics(nextDiagnostics);
  };

  useEffect(() => {
    const boot = async () => {
      await refreshDiagnostics();
      const result = await window.noa?.startupHealthCheck?.();
      if (result?.diagnostics) setDiagnostics(result.diagnostics);
      await refreshDiagnostics();
    };
    boot();
    const timer = window.setInterval(refreshDiagnostics, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const sendText = async (raw: string) => {
    if (!raw.trim() || sending) return;
    const input = raw.trim();
    setCommand('');
    setScreen('chat');
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((current) => [...current, { role: 'john', text: input }]);
    setSending(true);
    try {
      const result = await window.noa?.sendChat({ message: input, history });
      setMessages((current) => [...current, { role: 'noa', text: result?.text || 'I tried to respond, but NoA did not return a readable message.', source: result?.source, intent: result?.intent, confidence: result?.confidence }]);
    } catch (error) {
      setMessages((current) => [...current, { role: 'noa', text: `Something failed inside NoA: ${String(error)}`, source: 'error' }]);
    } finally {
      setSending(false);
      refreshDiagnostics();
    }
  };

  const submitCommand = async () => sendText(command);

  const lastSpokenIndex = useRef(0);
  useEffect(() => {
    if (!settings.voiceAutoSpeak) return;
    if (messages.length <= lastSpokenIndex.current) return;
    const latest = messages[messages.length - 1];
    lastSpokenIndex.current = messages.length;
    if (latest?.role === 'noa' && latest.text && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(stripMarkdown(latest.text));
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }, [messages, settings.voiceAutoSpeak]);

  return (
    <main className="shell">
      <aside className="rail">
        <div className="brand-mark">NoA</div>
        <nav>{navItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={screen === item.id ? 'active' : ''} onClick={() => setScreen(item.id as Screen)}><Icon size={18} /><span>{item.label}</span></button>; })}</nav>
        <div className={`rail-status ${diagnostics?.brainOnline ? 'online' : 'fallback'}`}><span />{diagnostics?.brainOnline ? 'OpenAI online' : 'Local fallback'}</div>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">Noetic Advisor</p><h1>{screenTitle(screen)}</h1></div>
          <div className="top-actions">
            <div className={`status-pill ${diagnostics?.brainOnline ? 'success' : 'warn'}`}>{diagnostics?.brainOnline ? <Wifi size={16} /> : <WifiOff size={16} />}{diagnostics?.provider || 'Checking'}</div>
            <div className={`status-pill ${diagnostics?.notionConnected ? 'success' : 'muted'}`}><Database size={16} />Notion {diagnostics?.notionConnected ? 'Live' : 'Pending'}</div>
            <div className={`status-pill ${diagnostics?.startupHealthStatus?.includes('online') ? 'success' : 'muted'}`}><Activity size={16} />Health {diagnostics?.startupHealthStatus || 'Checking'}</div>
            <div className="status-pill muted"><Lock size={16} />Alpha 1.3</div>
          </div>
        </header>
        {screen === 'dashboard' && <Dashboard greeting={greeting} command={command} setCommand={setCommand} submitCommand={submitCommand} sending={sending} diagnostics={diagnostics} />}
        {screen === 'chat' && <Chat messages={messages} command={command} setCommand={setCommand} submitCommand={submitCommand} sending={sending} diagnostics={diagnostics} />}
        {screen === 'integrations' && <Integrations settings={settings} diagnostics={diagnostics} />}
        {screen === 'network' && <Network diagnostics={diagnostics} />}
        {screen === 'knowledge' && <KnowledgeGraph />}
        {screen === 'voice' && <VoiceControl command={command} setCommand={setCommand} sendText={sendText} sending={sending} settings={settings} setSettings={setSettings} refreshDiagnostics={refreshDiagnostics} messages={messages} />}
        {screen === 'diagnostics' && <Diagnostics diagnostics={diagnostics} refreshDiagnostics={refreshDiagnostics} />}
        {screen === 'settings' && <Settings settings={settings} setSettings={setSettings} refreshDiagnostics={refreshDiagnostics} />}
      </section>
    </main>
  );
}

function Dashboard({ greeting, command, setCommand, submitCommand, sending, diagnostics }: any) {
  const cards = [
    { label: 'Brain', value: diagnostics?.brainOnline ? 'Online' : 'Fallback', detail: diagnostics?.model || 'gpt-4.1-mini', icon: Brain },
    { label: 'Tools', value: diagnostics?.toolsRegistered || 11, detail: 'Weather, search, memory, Notion', icon: Cpu },
    { label: 'Notion', value: diagnostics?.notionConnected ? 'Live' : 'Setup', detail: diagnostics?.lastNotionStatus || 'Not tested', icon: Database },
    { label: 'Knowledge', value: diagnostics?.entityCount || 0, detail: `${diagnostics?.relationCount || 0} mapped relationships`, icon: NetworkIcon }
  ];
  return <section className="dashboard page-fade"><div className="hero-grid"><div className="hero-card"><p className="eyebrow">Noah voice identity - NoA visual system</p><h2>{greeting}</h2><p>NoA now understands your workspace and can map relationships between clients, tasks and jobs. Ask: “Noah, give me my briefing”, “what should I focus on?”, “what jobs are coming up?” or “show me EdgePro work”.</p><CommandBar command={command} setCommand={setCommand} submitCommand={submitCommand} sending={sending} placeholder="Ask Noah what needs your attention today..." /></div><div className="core-card"><div className={`orb ${diagnostics?.notionConnected ? 'orb-online' : ''}`}><Database size={58} /></div><h3>Workspace Intelligence</h3><p>{diagnostics?.notionConnected ? 'Connected to live Notion data.' : 'Add Notion settings to go live.'}</p><div className="meter"><span style={{ width: diagnostics?.notionConnected ? '86%' : '38%' }} /></div></div></div><div className="grid cards">{cards.map((card) => { const Icon = card.icon; return <article className="glass-card" key={card.label}><Icon size={22} /><p>{card.label}</p><h3>{card.value}</h3><span>{card.detail}</span></article>; })}</div></section>;
}
function Chat({ messages, command, setCommand, submitCommand, sending, diagnostics }: any) {
  return <section className="chat page-fade"><div className="chat-intro"><MessageSquareText size={24} /><div><h2>Conversation with Noah</h2><p>{diagnostics?.notionConnected ? 'Notion is connected. Noah can brief you from live task/job databases.' : 'Notion is not connected yet. Add your token and database IDs in Settings.'}</p></div></div><div className="chat-log">{messages.map((message: Message, index: number) => <div key={index} className={`bubble-wrap ${message.role}`}><div className={`bubble ${message.role}`}>{message.role === 'noa' ? <MarkdownText text={message.text} /> : message.text}</div>{message.role === 'noa' && <details className="message-meta"><summary>Details</summary><span>Source: {message.source || 'unknown'}</span>{message.intent && <span>Intent: {message.intent}</span>}{message.confidence !== undefined && <span>Confidence: {message.confidence}%</span>}</details>}</div>)}{sending && <div className="bubble-wrap noa"><div className="bubble noa thinking"><Loader2 className="spin" size={16} /> Noah is thinking...</div></div>}</div><CommandBar command={command} setCommand={setCommand} submitCommand={submitCommand} sending={sending} placeholder="Talk to Noah..." docked /></section>;
}

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^[-•]\s+/gm, '')
    .replace(/^\d+[.)]\s+/gm, '')
    .trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatInlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: Array<{ type: 'p' | 'ul' | 'ol'; items: string[] }> = [];
  let current: { type: 'p' | 'ul' | 'ol'; items: string[] } | null = null;

  const pushCurrent = () => {
    if (current && current.items.length) blocks.push(current);
    current = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      pushCurrent();
      continue;
    }
    const bullet = line.match(/^[-•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet) {
      if (!current || current.type !== 'ul') { pushCurrent(); current = { type: 'ul', items: [] }; }
      current.items.push(bullet[1]);
    } else if (numbered) {
      if (!current || current.type !== 'ol') { pushCurrent(); current = { type: 'ol', items: [] }; }
      current.items.push(numbered[1]);
    } else {
      if (!current || current.type !== 'p') { pushCurrent(); current = { type: 'p', items: [] }; }
      current.items.push(line);
    }
  }
  pushCurrent();

  return (
    <div className="markdown-body">
      {blocks.map((block, index) => {
        if (block.type === 'ul') return <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }} />)}</ul>;
        if (block.type === 'ol') return <ol key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }} />)}</ol>;
        return <p key={index} dangerouslySetInnerHTML={{ __html: block.items.map(formatInlineMarkdown).join('<br />') }} />;
      })}
    </div>
  );
}

function CommandBar({ command, setCommand, submitCommand, sending, placeholder, docked }: any) {
  return <div className={`command-card ${docked ? 'docked' : 'hero-command'}`}><Sparkles size={20} /><input value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitCommand()} placeholder={placeholder} /><button onClick={submitCommand} disabled={sending}>{sending ? <Loader2 className="spin" size={18} /> : <Send size={18} />}</button></div>;
}
function Integrations({ settings, diagnostics }: { settings: NoASettings; diagnostics: NoADiagnostics | null }) {
  const integrations = [
    { name: 'OpenAI', description: 'Brain layer for natural Noah responses', status: diagnostics?.brainOnline ? 'connected' : settings.hasOpenAIKey ? 'error' : 'missing', health: diagnostics?.brainOnline ? 92 : 28 },
    { name: 'Notion', description: 'Live tasks and jobs from configured databases', status: diagnostics?.notionConnected ? 'connected' : settings.hasNotionKey ? 'configured' : 'missing', health: diagnostics?.notionConnected ? 88 : settings.hasNotionKey ? 54 : 16 },
    { name: 'Weather', description: 'Live forecast data through Open-Meteo', status: diagnostics?.weatherOnline ? 'connected' : 'checking', health: diagnostics?.weatherOnline ? 86 : 32 },
    { name: 'Web Search', description: 'Lightweight web lookup through DuckDuckGo Instant Answer', status: diagnostics?.webSearchOnline ? 'connected' : 'limited', health: diagnostics?.webSearchOnline ? 58 : 28 },
    { name: 'Memory', description: 'Local saved context and reminders', status: diagnostics?.memoryOnline ? 'connected' : 'checking', health: diagnostics?.memoryOnline ? 76 : 30 },
    { name: 'Knowledge Graph', description: 'Maps clients, jobs, tasks, statuses and time buckets', status: diagnostics?.entityCount ? 'connected' : 'building', health: diagnostics?.entityCount ? 72 : 28 },
    { name: 'Optra', description: 'Planned client and job integration', status: 'planned', health: 12 }
  ];
  return <section className="page-fade integrations-grid">{integrations.map((item) => <article className="integration-card" key={item.name}><div className="integration-head"><div className="integration-icon"><PlugZap size={20} /></div><div><h3>{item.name}</h3><p>{item.description}</p></div></div><div className="integration-meta"><span className={`tag ${item.status}`}>{item.status}</span><div className="meter"><span style={{ width: `${item.health}%` }} /></div></div></article>)}</section>;
}
function Network({ diagnostics }: { diagnostics: NoADiagnostics | null }) {
  const nodes = ['OpenAI', 'Weather', 'Search', 'Memory', 'Knowledge', 'Notion', 'Tasks', 'Jobs', 'Optra', 'Displays'];
  return <section className="network page-fade"><div className="scanline" /><div className="network-panel left"><p className="eyebrow">Live topology</p><h3>{diagnostics?.notionConnected ? 'Notion linked' : 'Notion pending'}</h3><p>Tasks, jobs and daily briefing intelligence now have a live path through Notion.</p></div><div className="network-panel right"><p className="eyebrow">Last Notion state</p><h3>{diagnostics?.lastNotionStatus || 'Not tested'}</h3><p>{diagnostics?.lastNotionError || 'Run a test from Settings.'}</p></div><div className={`network-core ${diagnostics?.brainOnline ? 'online' : ''}`}><span>NoA</span><small>Core</small></div>{nodes.map((node, index) => { const hot = (node === 'OpenAI' && diagnostics?.brainOnline) || (node === 'Notion' && diagnostics?.notionConnected) || (node === 'Weather' && diagnostics?.weatherOnline) || (node === 'Search' && diagnostics?.webSearchOnline) || (node === 'Memory' && diagnostics?.memoryOnline) || (node === 'Knowledge' && Boolean(diagnostics?.entityCount)); return <div key={node} className={`network-node n${index + 1} ${hot ? 'hot' : ''}`}>{node}</div>; })}{nodes.map((node, index) => <div key={`${node}-line`} className={`pulse-line l${index + 1} ${diagnostics?.notionConnected ? 'active-line' : ''}`} />)}</section>;
}


function VoiceControl({ command, setCommand, sendText, sending, settings, setSettings, refreshDiagnostics, messages }: any) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('Ready');
  const recognitionRef = useRef<any>(null);
  const latestNoah = [...messages].reverse().find((m: Message) => m.role === 'noa')?.text || '';
  const SpeechRecognition = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
  const voiceSupported = Boolean(SpeechRecognition);
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const startListening = () => {
    if (!SpeechRecognition) {
      setVoiceStatus('Speech recognition is not available in this browser runtime yet. You can still use text-to-speech.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-AU';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => { setListening(true); setVoiceStatus('Listening...'); };
    recognition.onerror = (event: any) => { setListening(false); setVoiceStatus(`Voice error: ${event?.error || 'unknown'}`); };
    recognition.onend = () => { setListening(false); setVoiceStatus('Stopped listening.'); };
    recognition.onresult = (event: any) => {
      const text = Array.from(event.results).map((result: any) => result[0]?.transcript || '').join(' ').trim();
      setTranscript(text);
      setCommand(text);
      const finalResult = Array.from(event.results).some((result: any) => result.isFinal);
      if (finalResult) setVoiceStatus('Voice captured. Review or send it to Noah.');
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop?.();
    setListening(false);
  };

  const speakLatest = () => {
    if (!speechSupported) {
      setVoiceStatus('Text-to-speech is not available in this runtime.');
      return;
    }
    if (!latestNoah) {
      setVoiceStatus('No Noah response available to read yet.');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(stripMarkdown(latestNoah));
    utterance.lang = 'en-AU';
    utterance.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setVoiceStatus('Reading Noah’s latest response aloud.');
  };

  const saveVoice = async (voiceAutoSpeak: boolean) => {
    const next = await window.noa?.saveSettings({ voiceAutoSpeak, voiceWakeWord: settings.voiceWakeWord || 'Noah' });
    if (next) setSettings(next);
    await refreshDiagnostics();
  };

  return <section className="settings page-fade">
    <article className="glass-card wide voice-hero">
      <Mic size={24} />
      <h3>Voice Foundation</h3>
      <p>NoA now has a first voice layer: manual voice capture, text-to-speech playback and a stored voice preference. Full always-on wake-word support comes later because desktop wake-word detection needs a local audio service.</p>
      <div className="button-row">
        <button className="primary" onClick={listening ? stopListening : startListening}>{listening ? <MicOff size={16} /> : <Mic size={16} />} {listening ? 'Stop listening' : 'Start voice input'}</button>
        <button className="secondary" onClick={() => sendText(transcript || command)} disabled={sending || !(transcript || command)}><Send size={16} /> Send to Noah</button>
        <button className="secondary" onClick={speakLatest}><Volume2 size={16} /> Read latest response</button>
      </div>
      <span>{voiceStatus}</span>
    </article>

    <div className="knowledge-grid">
      <article className="glass-card wide">
        <h3>Captured voice</h3>
        <p className="voice-transcript">{transcript || 'Press Start voice input and speak naturally. The transcript will appear here.'}</p>
      </article>
      <article className="glass-card wide">
        <h3>Voice settings</h3>
        <label className="checkbox-row"><input type="checkbox" checked={Boolean(settings.voiceAutoSpeak)} onChange={(e) => saveVoice(e.target.checked)} /> Auto-read Noah responses aloud</label>
        <p>Wake phrase target: <strong>{settings.voiceWakeWord || 'Noah'}</strong></p>
        <p className="muted-copy">Speech recognition: {voiceSupported ? 'available' : 'not available in this runtime'} · Speech output: {speechSupported ? 'available' : 'not available'}</p>
      </article>
    </div>
  </section>;
}

function KnowledgeGraph() {
  const [graph, setGraph] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const loadGraph = async () => {
    setLoading(true);
    const result = await window.noa?.getKnowledgeGraph?.();
    setGraph(result);
    setLoading(false);
  };
  useEffect(() => { loadGraph(); }, []);
  const entities = graph?.entities || [];
  const relations = graph?.relations || [];
  const clusters = graph?.clusters || [];
  return <section className="settings page-fade">
    <article className="glass-card wide">
      <NetworkIcon size={24} />
      <h3>Knowledge Graph Foundation</h3>
      <p>NoA maps your live Notion workspace into entities and relationships - clients, jobs, tasks, statuses and time buckets.</p>
      <button className="primary" onClick={loadGraph} disabled={loading}>{loading ? <Loader2 className="spin" size={16} /> : <Activity size={16} />} Rebuild graph</button>
      <span>{graph?.ok ? `${entities.length} entities and ${relations.length} relationships mapped.` : graph?.error || 'Building graph...'}</span>
    </article>
    <div className="knowledge-summary">
      {clusters.map((cluster: any) => <article className="diagnostic-row" key={cluster.type}><span>{cluster.type}</span><strong>{cluster.count}</strong></article>)}
    </div>
    <div className="knowledge-grid">
      <article className="glass-card wide"><h3>Top entities</h3>{entities.slice(0, 18).map((entity: any) => <div className="entity-row" key={entity.id}><span>{entity.label}</span><strong>{entity.type}</strong></div>)}</article>
      <article className="glass-card wide"><h3>Strongest relationships</h3>{relations.slice(0, 18).map((rel: any) => <div className="entity-row" key={rel.id}><span>{rel.from.replace(/^\w+:/, '')} → {rel.to.replace(/^\w+:/, '')}</span><strong>{rel.type}</strong></div>)}</article>
    </div>
  </section>;
}

function Diagnostics({ diagnostics, refreshDiagnostics }: { diagnostics: NoADiagnostics | null; refreshDiagnostics: () => void }) {
  const rows = [['Provider', diagnostics?.provider], ['Brain online', diagnostics?.brainOnline ? 'Yes' : 'No'], ['API key saved', diagnostics?.apiKeySaved ? 'Yes' : 'No'], ['Model', diagnostics?.model], ['Startup health', diagnostics?.startupHealthStatus || 'Not run'], ['Startup checked', diagnostics?.startupHealthCheckedAt || 'None'], ['Notion connected', diagnostics?.notionConnected ? 'Yes' : 'No'], ['Notion key saved', diagnostics?.notionKeySaved ? 'Yes' : 'No'], ['Tasks DB saved', diagnostics?.notionTasksDatabaseSaved ? 'Yes' : 'No'], ['Jobs DB saved', diagnostics?.notionJobsDatabaseSaved ? 'Yes' : 'No'], ['Last Notion request', diagnostics?.lastNotionRequestAt || 'None'], ['Last Notion status', diagnostics?.lastNotionStatus], ['Notion error', diagnostics?.lastNotionError || 'None'], ['Knowledge graph', diagnostics?.knowledgeGraphStatus || 'Not built'], ['Entities', diagnostics?.entityCount || 0], ['Relations', diagnostics?.relationCount || 0], ['Weather tool', diagnostics?.weatherOnline ? 'Online' : 'Offline'], ['Web search tool', diagnostics?.webSearchOnline ? 'Online' : 'Offline'], ['Memory store', diagnostics?.memoryOnline ? 'Online' : 'Offline'], ['Last API request', diagnostics?.lastApiRequestAt || 'None'], ['Last API status', diagnostics?.lastApiStatus], ['Last latency', diagnostics?.lastApiLatencyMs ? `${diagnostics.lastApiLatencyMs}ms` : 'None'], ['Last response source', diagnostics?.lastResponseSource], ['Last intent', diagnostics?.lastIntent], ['Last confidence', `${diagnostics?.lastConfidence || 0}%`], ['Tools registered', diagnostics?.toolsRegistered], ['Last tool', diagnostics?.lastToolName], ['Tool status', diagnostics?.lastToolStatus], ['Tool error', diagnostics?.lastToolError || 'None'], ['Memory entries', diagnostics?.memoryEntries]];
  return <section className="settings page-fade"><article className="glass-card wide"><Activity size={24} /><h3>Brain + integration diagnostics</h3><p>This panel confirms whether NoA is calling OpenAI, using tools and reaching Notion.</p><button className="primary" onClick={refreshDiagnostics}><Activity size={16} /> Refresh diagnostics</button></article><div className="diagnostic-grid">{rows.map(([label, value]) => <article className="diagnostic-row" key={String(label)}><span>{label}</span><strong>{String(value ?? 'Unknown')}</strong></article>)}</div></section>;
}
function Settings({ settings, setSettings, refreshDiagnostics }: any) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(settings.openaiModel || 'gpt-4.1-mini');
  const [notionKey, setNotionKey] = useState('');
  const [tasksDb, setTasksDb] = useState(settings.notionTasksDatabaseId || '');
  const [jobsDb, setJobsDb] = useState(settings.notionJobsDatabaseId || '');
  const [testResult, setTestResult] = useState('Not tested');
  const [notionTestResult, setNotionTestResult] = useState('Not tested');
  const [testing, setTesting] = useState(false);
  const [testingNotion, setTestingNotion] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setModel(settings.openaiModel || 'gpt-4.1-mini'); setTasksDb(settings.notionTasksDatabaseId || ''); setJobsDb(settings.notionJobsDatabaseId || ''); }, [settings.openaiModel, settings.notionTasksDatabaseId, settings.notionJobsDatabaseId]);
  const save = async () => { setSaving(true); const next = await window.noa?.saveSettings({ openaiApiKey: apiKey, openaiModel: model, notionApiKey: notionKey, notionTasksDatabaseId: tasksDb, notionJobsDatabaseId: jobsDb }); if (next) setSettings(next); setApiKey(''); setNotionKey(''); setSaving(false); refreshDiagnostics(); };
  const testOpenAI = async () => { setTesting(true); setTestResult('Testing real OpenAI request...'); const result = await window.noa?.testOpenAI(); setTestResult(result?.ok ? `Success: ${result.text || 'OpenAI responded.'}` : `Failed: ${result?.lastApiError || 'Unknown error'}`); setTesting(false); refreshDiagnostics(); };
  const testNotion = async () => { setTestingNotion(true); setNotionTestResult('Testing Notion databases...'); const result = await window.noa?.testNotion(); setNotionTestResult(result?.ok ? `Success: ${result.message || 'Notion responded.'}` : `Failed: ${result?.lastNotionError || 'Unknown error'}`); setTestingNotion(false); refreshDiagnostics(); };
  return <section className="settings page-fade"><article className="glass-card wide"><KeyRound size={24} /><h3>OpenAI Brain Layer</h3><p>Save your API key here. NoA masks saved keys and does not return the full key back to the UI.</p><label>API key</label><input className="settings-input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={settings.hasOpenAIKey ? 'API key saved - leave blank to keep existing key' : 'Paste OpenAI API key'} /><label>Model</label><input className="settings-input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4.1-mini" /><div className="button-row"><button className="primary" onClick={save} disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} Save settings</button><button className="secondary" onClick={testOpenAI} disabled={testing}>{testing ? <Loader2 className="spin" size={16} /> : <ArrowUpRight size={16} />} Test OpenAI</button></div><span>{testResult}</span></article><article className="glass-card wide"><Database size={24} /><h3>Notion Integration</h3><p>Create an internal Notion integration, share your tasks/jobs databases with it, then paste the token and database IDs here.</p><label>Notion integration token</label><input className="settings-input" type="password" value={notionKey} onChange={(e) => setNotionKey(e.target.value)} placeholder={settings.hasNotionKey ? 'Notion key saved - leave blank to keep existing key' : 'Paste Notion internal integration token'} /><label>Tasks database ID</label><input className="settings-input" value={tasksDb} onChange={(e) => setTasksDb(e.target.value)} placeholder="Paste Notion tasks database ID" /><label>Jobs database ID</label><input className="settings-input" value={jobsDb} onChange={(e) => setJobsDb(e.target.value)} placeholder="Paste Notion jobs database ID" /><div className="button-row"><button className="primary" onClick={save} disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} Save settings</button><button className="secondary" onClick={testNotion} disabled={testingNotion}>{testingNotion ? <Loader2 className="spin" size={16} /> : <ArrowUpRight size={16} />} Test Notion</button></div><span>{notionTestResult}</span></article><article className="glass-card wide"><DownloadCloud size={24} /><h3>Local network development</h3><p>Use npm run dev:lan when you want to view the web UI from tablets or other computers on your network.</p></article><article className="glass-card wide"><Mic size={24} /><h3>Voice preferences</h3><p>Voice is managed from the Voice screen. You can capture speech, send it to Noah, and optionally auto-read Noah’s replies aloud.</p><span>Wake phrase target: Noah</span></article></section>;
}
function screenTitle(screen: Screen) { return ({ dashboard: 'Command Centre', chat: 'Conversation', integrations: 'Integrations', network: 'Network Core', knowledge: 'Knowledge Graph', voice: 'Voice Layer', diagnostics: 'Diagnostics', settings: 'Settings' } as const)[screen]; }
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
