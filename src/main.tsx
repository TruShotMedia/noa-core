import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ArrowUpRight, Brain, CheckCircle2, Command, Cpu, DownloadCloud, Gauge, Loader2, Lock, MessageSquareText, PlugZap, RadioTower, Send, Shield, Sparkles, TerminalSquare, Zap } from 'lucide-react';
import { dashboardCards, integrations, navItems, priorities } from './data/system';
import './styles/app.css';

type Screen = 'dashboard' | 'chat' | 'integrations' | 'network' | 'settings';
type Message = { role: 'noa' | 'john'; text: string };

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [command, setCommand] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'noa', text: 'Noah online. NoA Alpha 0.2 shell is active. The next major system layer is OpenAI + tool routing.' }
  ]);
  const [updateStatus, setUpdateStatus] = useState('Ready');

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning, John.';
    if (hour < 18) return 'Good afternoon, John.';
    return 'Good evening, John.';
  }, []);

  const submitCommand = () => {
    if (!command.trim()) return;
    const input = command.trim();
    setMessages((current) => [
      ...current,
      { role: 'john', text: input },
      { role: 'noa', text: 'Command received. I am currently running in local shell mode. In the next phase, this command will route through OpenAI, then into tools such as Optra, Notion, Calendar and Supabase memory.' }
    ]);
    setCommand('');
    setScreen('chat');
  };

  const checkForUpdates = async () => {
    setUpdateStatus('Checking...');
    const result = await window.noa?.checkForUpdates();
    setUpdateStatus(result?.message || result?.status || 'Unavailable in dev mode');
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
        <div className="rail-status"><span /> Online</div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Noetic Advisor</p>
            <h1>{screenTitle(screen)}</h1>
          </div>
          <div className="top-actions">
            <div className="status-pill"><Shield size={16} /> Alpha 0.2</div>
            <div className="status-pill muted"><Lock size={16} /> Local shell</div>
          </div>
        </header>

        {screen === 'dashboard' && <Dashboard greeting={greeting} command={command} setCommand={setCommand} submitCommand={submitCommand} />}
        {screen === 'chat' && <Chat messages={messages} command={command} setCommand={setCommand} submitCommand={submitCommand} />}
        {screen === 'integrations' && <Integrations />}
        {screen === 'network' && <Network />}
        {screen === 'settings' && <Settings checkForUpdates={checkForUpdates} updateStatus={updateStatus} />}
      </section>
    </main>
  );
}

function Dashboard({ greeting, command, setCommand, submitCommand }: { greeting: string; command: string; setCommand: (value: string) => void; submitCommand: () => void }) {
  return (
    <section className="dashboard page-fade">
      <div className="hero-grid">
        <div className="hero-card">
          <p className="eyebrow">Noah voice identity - NoA visual system</p>
          <h2>{greeting}</h2>
          <p>NoA is becoming the central intelligence layer for your businesses, displays, client systems, skills, integrations and future voice interaction.</p>
          <div className="command-card hero-command">
            <Command size={20} />
            <input value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitCommand()} placeholder="Ask Noah what needs your attention today..." />
            <button onClick={submitCommand}><Send size={18} /></button>
          </div>
        </div>
        <div className="core-card">
          <div className="orb"><Cpu size={58} /></div>
          <h3>NoA Core</h3>
          <p>Shell active. Tool engine pending.</p>
          <div className="meter"><span style={{ width: '42%' }} /></div>
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

      <div className="priority-row">
        {priorities.map((item) => (
          <article className="priority-card" key={item.title}>
            <div><Zap size={18} /><strong>{item.state}</strong></div>
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Chat({ messages, command, setCommand, submitCommand }: { messages: Message[]; command: string; setCommand: (value: string) => void; submitCommand: () => void }) {
  return (
    <section className="chat page-fade">
      <div className="chat-intro">
        <MessageSquareText size={24} />
        <div>
          <h2>Conversation with Noah</h2>
          <p>For now this is local shell mode. Next we connect OpenAI and the tool router.</p>
        </div>
      </div>
      <div className="chat-log">
        {messages.map((message, index) => <div key={index} className={`bubble ${message.role}`}>{message.text}</div>)}
      </div>
      <div className="command-card docked">
        <Sparkles size={20} />
        <input value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitCommand()} placeholder="Talk to Noah..." />
        <button onClick={submitCommand}><Send size={18} /></button>
      </div>
    </section>
  );
}

function Integrations() {
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

function Network() {
  const nodes = ['OpenAI', 'Supabase', 'Optra', 'Notion', 'Gmail', 'Calendar', 'Xero', 'Meta', 'Spotify', 'Displays'];
  return (
    <section className="network page-fade">
      <div className="scanline" />
      <div className="network-panel left">
        <p className="eyebrow">Live topology</p>
        <h3>System graph</h3>
        <p>Visual map of services, tools and skills that will connect into NoA.</p>
      </div>
      <div className="network-panel right">
        <p className="eyebrow">Engine state</p>
        <h3>Prototype</h3>
        <p>Animated graph now. Live service state next.</p>
      </div>
      <div className="network-core"><span>NoA</span><small>Core</small></div>
      {nodes.map((node, index) => <div key={node} className={`network-node n${index + 1}`}>{node}</div>)}
      {nodes.map((node, index) => <div key={`${node}-line`} className={`pulse-line l${index + 1}`} />)}
    </section>
  );
}

function Settings({ checkForUpdates, updateStatus }: { checkForUpdates: () => void; updateStatus: string }) {
  return (
    <section className="settings page-fade">
      <article className="glass-card wide">
        <DownloadCloud size={24} />
        <h3>Auto updates</h3>
        <p>NoA is configured for GitHub Releases through electron-updater. Packaged builds can check and install updates.</p>
        <button className="primary" onClick={checkForUpdates}>{updateStatus === 'Checking...' ? <Loader2 className="spin" size={16} /> : <DownloadCloud size={16} />} Check for updates</button>
        <span>{updateStatus}</span>
      </article>
      <article className="glass-card wide">
        <TerminalSquare size={24} />
        <h3>Next developer phase</h3>
        <p>Create the OpenAI service, secure API key storage, tool registry and first mock action: getTodaysBriefing.</p>
      </article>
    </section>
  );
}

function screenTitle(screen: Screen) {
  return ({ dashboard: 'Command Centre', chat: 'Conversation', integrations: 'Integrations', network: 'Network Core', settings: 'Settings' } as const)[screen];
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
