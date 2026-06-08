import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Activity,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  Command,
  Cpu,
  Database,
  DownloadCloud,
  Gauge,
  KeyRound,
  Loader2,
  Lock,
  MessageSquareText,
  PlugZap,
  Send,
  Shield,
  Sparkles,
  TerminalSquare,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react';
import './styles/app.css';

type Screen = 'dashboard' | 'chat' | 'integrations' | 'network' | 'diagnostics' | 'settings';
type Role = 'noa' | 'john';
type Message = { role: Role; text: string; source?: string; intent?: string; confidence?: number };

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Gauge },
  { id: 'chat', label: 'Chat', icon: MessageSquareText },
  { id: 'integrations', label: 'Integrations', icon: PlugZap },
  { id: 'network', label: 'Network', icon: Activity },
  { id: 'diagnostics', label: 'Diagnostics', icon: TerminalSquare },
  { id: 'settings', label: 'Settings', icon: Shield }
];

const dashboardCards = [
  { label: 'Brain', value: 'OpenAI-ready', detail: 'Real API diagnostics now visible', icon: Brain },
  { label: 'Tools', value: '8', detail: 'Weather, search, memory and diagnostics', icon: Cpu },
  { label: 'Memory', value: 'Local', detail: 'Context notes saved privately', icon: Database },
  { label: 'Status', value: 'Alpha 0.7', detail: 'Tool integrations + natural chat', icon: Sparkles }
];

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [command, setCommand] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'noa',
      text: 'Hey John - Noah is online. I can now use live weather, lightweight web lookup, memory, diagnostics and OpenAI when available.',
      source: 'local'
    }
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
    const [nextSettings, nextDiagnostics] = await Promise.all([
      window.noa?.getSettings(),
      window.noa?.getDiagnostics()
    ]);
    if (nextSettings) setSettings(nextSettings);
    if (nextDiagnostics) setDiagnostics(nextDiagnostics);
  };

  useEffect(() => {
    refreshDiagnostics();
    const timer = window.setInterval(refreshDiagnostics, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const submitCommand = async () => {
    if (!command.trim() || sending) return;
    const input = command.trim();
    setCommand('');
    setScreen('chat');
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((current) => [...current, { role: 'john', text: input }]);
    setSending(true);

    try {
      const result = await window.noa?.sendChat({ message: input, history });
      setMessages((current) => [
        ...current,
        {
          role: 'noa',
          text: result?.text || 'I tried to respond, but NoA did not return a readable message.',
          source: result?.source,
          intent: result?.intent,
          confidence: result?.confidence
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: 'noa', text: `Something failed inside NoA: ${String(error)}`, source: 'error' }
      ]);
    } finally {
      setSending(false);
      refreshDiagnostics();
    }
  };

  return (
    <main className="shell">
      <aside className="rail">
        <div className="brand-mark">NoA</div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={screen === item.id ? 'active' : ''} onClick={() => setScreen(item.id as Screen)}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className={`rail-status ${diagnostics?.brainOnline ? 'online' : 'fallback'}`}>
          <span />
          {diagnostics?.brainOnline ? 'OpenAI online' : 'Local fallback'}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Noetic Advisor</p>
            <h1>{screenTitle(screen)}</h1>
          </div>
          <div className="top-actions">
            <div className={`status-pill ${diagnostics?.brainOnline ? 'success' : 'warn'}`}>
              {diagnostics?.brainOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
              {diagnostics?.provider || 'Checking'}
            </div>
            <div className="status-pill muted"><Lock size={16} /> Alpha 0.7</div>
          </div>
        </header>

        {screen === 'dashboard' && <Dashboard greeting={greeting} command={command} setCommand={setCommand} submitCommand={submitCommand} sending={sending} diagnostics={diagnostics} />}
        {screen === 'chat' && <Chat messages={messages} command={command} setCommand={setCommand} submitCommand={submitCommand} sending={sending} diagnostics={diagnostics} />}
        {screen === 'integrations' && <Integrations settings={settings} diagnostics={diagnostics} />}
        {screen === 'network' && <Network diagnostics={diagnostics} />}
        {screen === 'diagnostics' && <Diagnostics diagnostics={diagnostics} refreshDiagnostics={refreshDiagnostics} />}
        {screen === 'settings' && <Settings settings={settings} setSettings={setSettings} refreshDiagnostics={refreshDiagnostics} />}
      </section>
    </main>
  );
}

function Dashboard({ greeting, command, setCommand, submitCommand, sending, diagnostics }: any) {
  return (
    <section className="dashboard page-fade">
      <div className="hero-grid">
        <div className="hero-card">
          <p className="eyebrow">Noah voice identity - NoA visual system</p>
          <h2>{greeting}</h2>
          <p>NoA now has the first real tool integrations. Ask about Brisbane weather, search something lightweight, save a memory, or check system status.</p>
          <CommandBar command={command} setCommand={setCommand} submitCommand={submitCommand} sending={sending} placeholder="Ask Noah something natural..." />
        </div>
        <div className="core-card">
          <div className={`orb ${diagnostics?.brainOnline ? 'orb-online' : ''}`}><Cpu size={58} /></div>
          <h3>NoA Core</h3>
          <p>{diagnostics?.brainOnline ? 'OpenAI brain online.' : 'Local fallback active.'}</p>
          <div className="meter"><span style={{ width: diagnostics?.brainOnline ? '86%' : '46%' }} /></div>
        </div>
      </div>

      <div className="grid cards">
        {dashboardCards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="glass-card" key={card.label}>
              <Icon size={22} />
              <p>{card.label}</p>
              <h3>{card.value}</h3>
              <span>{card.detail}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Chat({ messages, command, setCommand, submitCommand, sending, diagnostics }: any) {
  return (
    <section className="chat page-fade">
      <div className="chat-intro">
        <MessageSquareText size={24} />
        <div>
          <h2>Conversation with Noah</h2>
          <p>{diagnostics?.brainOnline ? 'OpenAI is connected. Noah can also use tools like weather, memory and diagnostics.' : 'OpenAI is not confirmed online yet. Noah can still use local tools where possible.'}</p>
        </div>
      </div>
      <div className="chat-log">
        {messages.map((message: Message, index: number) => (
          <div key={index} className={`bubble-wrap ${message.role}`}>
            <div className={`bubble ${message.role}`}>{message.text}</div>
            {message.role === 'noa' && (
              <details className="message-meta">
                <summary>Details</summary>
                <span>Source: {message.source || 'unknown'}</span>
                {message.intent && <span>Intent: {message.intent}</span>}
                {message.confidence !== undefined && <span>Confidence: {message.confidence}%</span>}
              </details>
            )}
          </div>
        ))}
        {sending && <div className="bubble-wrap noa"><div className="bubble noa thinking"><Loader2 className="spin" size={16} /> Noah is thinking...</div></div>}
      </div>
      <CommandBar command={command} setCommand={setCommand} submitCommand={submitCommand} sending={sending} placeholder="Talk to Noah..." docked />
    </section>
  );
}

function CommandBar({ command, setCommand, submitCommand, sending, placeholder, docked }: any) {
  return (
    <div className={`command-card ${docked ? 'docked' : 'hero-command'}`}>
      <Sparkles size={20} />
      <input value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitCommand()} placeholder={placeholder} />
      <button onClick={submitCommand} disabled={sending}>{sending ? <Loader2 className="spin" size={18} /> : <Send size={18} />}</button>
    </div>
  );
}

function Integrations({ settings, diagnostics }: { settings: NoASettings; diagnostics: NoADiagnostics | null }) {
  const integrations = [
    { name: 'OpenAI', description: 'Brain layer for natural Noah responses', status: diagnostics?.brainOnline ? 'connected' : settings.hasOpenAIKey ? 'error' : 'missing', health: diagnostics?.brainOnline ? 92 : 28 },
    { name: 'Local Tools', description: 'Briefings, diagnostics, memory and tool list', status: 'connected', health: 84 },
    { name: 'Weather', description: 'Live forecast data through Open-Meteo', status: 'connected', health: 86 },
    { name: 'Web Search', description: 'Lightweight web lookup through DuckDuckGo Instant Answer', status: 'connected', health: 48 },
    { name: 'Memory', description: 'Local saved context and reminders', status: 'connected', health: settings.memoryCount ? 68 : 44 },
    { name: 'Notion', description: 'Planned task and job integration', status: 'planned', health: 12 },
    { name: 'Optra', description: 'Planned client and job integration', status: 'planned', health: 12 }
  ];

  return (
    <section className="page-fade integrations-grid">
      {integrations.map((item) => (
        <article className="integration-card" key={item.name}>
          <div className="integration-head">
            <div className="integration-icon"><PlugZap size={20} /></div>
            <div><h3>{item.name}</h3><p>{item.description}</p></div>
          </div>
          <div className="integration-meta">
            <span className={`tag ${item.status}`}>{item.status}</span>
            <div className="meter"><span style={{ width: `${item.health}%` }} /></div>
          </div>
        </article>
      ))}
    </section>
  );
}

function Network({ diagnostics }: { diagnostics: NoADiagnostics | null }) {
  const nodes = ['OpenAI', 'Weather', 'Search', 'Memory', 'Tools', 'Notion', 'Optra', 'Calendar', 'Spotify', 'Displays'];
  return (
    <section className="network page-fade">
      <div className="scanline" />
      <div className="network-panel left">
        <p className="eyebrow">Live topology</p>
        <h3>{diagnostics?.brainOnline ? 'OpenAI linked' : 'Fallback mode'}</h3>
        <p>Connections will become live as integrations are added.</p>
      </div>
      <div className="network-panel right">
        <p className="eyebrow">Last API state</p>
        <h3>{diagnostics?.lastApiStatus || 'Not tested'}</h3>
        <p>{diagnostics?.lastApiLatencyMs ? `${diagnostics.lastApiLatencyMs}ms latency` : 'Run a test from Settings.'}</p>
      </div>
      <div className={`network-core ${diagnostics?.brainOnline ? 'online' : ''}`}><span>NoA</span><small>Core</small></div>
      {nodes.map((node, index) => <div key={node} className={`network-node n${index + 1} ${node === 'OpenAI' && diagnostics?.brainOnline ? 'hot' : ''}`}>{node}</div>)}
      {nodes.map((node, index) => <div key={`${node}-line`} className={`pulse-line l${index + 1} ${diagnostics?.brainOnline ? 'active-line' : ''}`} />)}
    </section>
  );
}

function Diagnostics({ diagnostics, refreshDiagnostics }: { diagnostics: NoADiagnostics | null; refreshDiagnostics: () => void }) {
  const rows = [
    ['Provider', diagnostics?.provider],
    ['Brain online', diagnostics?.brainOnline ? 'Yes' : 'No'],
    ['API key saved', diagnostics?.apiKeySaved ? 'Yes' : 'No'],
    ['Model', diagnostics?.model],
    ['Last API request', diagnostics?.lastApiRequestAt || 'None'],
    ['Last API status', diagnostics?.lastApiStatus],
    ['Last latency', diagnostics?.lastApiLatencyMs ? `${diagnostics.lastApiLatencyMs}ms` : 'None'],
    ['Last response source', diagnostics?.lastResponseSource],
    ['Last intent', diagnostics?.lastIntent],
    ['Last confidence', `${diagnostics?.lastConfidence || 0}%`],
    ['Tools registered', diagnostics?.toolsRegistered],
    ['Last tool', diagnostics?.lastToolName],
    ['Tool status', diagnostics?.lastToolStatus],
    ['Tool latency', diagnostics?.lastToolLatencyMs ? `${diagnostics.lastToolLatencyMs}ms` : 'None'],
    ['Tool error', diagnostics?.lastToolError || 'None'],
    ['Memory entries', diagnostics?.memoryEntries],
    ['Last error', diagnostics?.lastApiError || 'None']
  ];

  return (
    <section className="settings page-fade">
      <article className="glass-card wide">
        <Activity size={24} />
        <h3>Brain diagnostics</h3>
        <p>This panel confirms whether NoA is actually calling OpenAI or falling back locally.</p>
        <button className="primary" onClick={refreshDiagnostics}><Activity size={16} /> Refresh diagnostics</button>
      </article>
      <div className="diagnostic-grid">
        {rows.map(([label, value]) => (
          <article className="diagnostic-row" key={String(label)}>
            <span>{label}</span>
            <strong>{String(value ?? 'Unknown')}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function Settings({ settings, setSettings, refreshDiagnostics }: any) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(settings.openaiModel || 'gpt-4.1-mini');
  const [testResult, setTestResult] = useState('Not tested');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setModel(settings.openaiModel || 'gpt-4.1-mini');
  }, [settings.openaiModel]);

  const save = async () => {
    setSaving(true);
    const next = await window.noa?.saveSettings({ openaiApiKey: apiKey, openaiModel: model });
    if (next) setSettings(next);
    setApiKey('');
    setSaving(false);
    refreshDiagnostics();
  };

  const testOpenAI = async () => {
    setTesting(true);
    setTestResult('Testing real OpenAI request...');
    const result = await window.noa?.testOpenAI();
    setTestResult(result?.ok ? `Success: ${result.text || 'OpenAI responded.'}` : `Failed: ${result?.lastApiError || 'Unknown error'}`);
    setTesting(false);
    refreshDiagnostics();
  };

  return (
    <section className="settings page-fade">
      <article className="glass-card wide">
        <KeyRound size={24} />
        <h3>Brain + Tool Layer</h3>
        <p>Save your API key here. Weather and lightweight search work without an OpenAI key, but natural reasoning needs OpenAI. Never commit your key to GitHub.</p>
        <label>API key</label>
        <input className="settings-input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={settings.hasOpenAIKey ? 'API key saved - leave blank to keep existing key' : 'Paste OpenAI API key'} />
        <label>Model</label>
        <input className="settings-input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4.1-mini" />
        <div className="button-row">
          <button className="primary" onClick={save} disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} Save settings</button>
          <button className="secondary" onClick={testOpenAI} disabled={testing}>{testing ? <Loader2 className="spin" size={16} /> : <ArrowUpRight size={16} />} Test OpenAI connection</button>
        </div>
        <span>{testResult}</span>
      </article>
      <article className="glass-card wide">
        <DownloadCloud size={24} />
        <h3>Auto updates</h3>
        <p>Auto updates run once NoA is packaged and released through GitHub Releases. Dev mode will not auto-update.</p>
      </article>
    </section>
  );
}

function screenTitle(screen: Screen) {
  return ({ dashboard: 'Command Centre', chat: 'Conversation', integrations: 'Integrations', network: 'Network Core', diagnostics: 'Diagnostics', settings: 'Settings' } as const)[screen];
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
