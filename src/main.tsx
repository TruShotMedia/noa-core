import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Command, Cpu, DownloadCloud, Loader2, Lock, MessageSquareText, PlugZap, Send, Shield, Sparkles, TerminalSquare, Zap } from 'lucide-react';
import { dashboardCards, integrations, navItems, priorities } from './data/system';
import { noaSettings } from './config/settings';
import { getOpenAISettings, saveOpenAISettings, testOpenAIConnection, type OpenAISettings } from './services/ai/openai';
import { routeCommand } from './services/commandRouter';
import { clearMemory, getRecentMemory } from './services/memory/memoryStore';
import { toolRegistry } from './services/tools/registry';
import './styles/app.css';

type Screen = 'dashboard' | 'chat' | 'integrations' | 'network' | 'settings';
type Message = { role: 'noa' | 'john'; text: string };

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [command, setCommand] = useState('');
  const [isRouting, setIsRouting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'noa', text: 'Noah online. NoA Alpha 0.4 Brain Layer is active. Enable OpenAI in Settings to let me reason over local tool results.' }
  ]);
  const [updateStatus, setUpdateStatus] = useState('Ready');
  const [memoryCount, setMemoryCount] = useState(getRecentMemory(100).length);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning, John.';
    if (hour < 18) return 'Good afternoon, John.';
    return 'Good evening, John.';
  }, []);

  const submitCommand = async () => {
    if (!command.trim() || isRouting) return;
    const input = command.trim();
    setCommand('');
    setScreen('chat');
    setIsRouting(true);
    setMessages((current) => [...current, { role: 'john', text: input }]);

    try {
      const routed = await routeCommand(input);
      setMessages((current) => [
        ...current,
        { role: 'noa', text: `${routed.response}\n\nIntent: ${routed.intent}${routed.toolUsed ? `\nTool used: ${routed.toolUsed}` : ''}\nConfidence: ${Math.round(routed.confidence * 100)}%` }
      ]);
      setMemoryCount(getRecentMemory(100).length);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: 'noa', text: `I hit an error while routing that command. ${error instanceof Error ? error.message : 'Unknown error'}` }
      ]);
    } finally {
      setIsRouting(false);
    }
  };

  const checkForUpdates = async () => {
    setUpdateStatus('Checking...');
    const result = await window.noa?.checkForUpdates();
    setUpdateStatus(result?.message || result?.status || 'Unavailable in dev mode');
  };

  const resetMemory = () => {
    clearMemory();
    setMemoryCount(0);
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
        <div className="rail-status"><span /> Brain Layer</div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Noetic Advisor</p>
            <h1>{screenTitle(screen)}</h1>
          </div>
          <div className="top-actions">
            <div className="status-pill"><Shield size={16} /> Alpha 0.4</div>
            <div className="status-pill muted"><Lock size={16} /> AI bridge</div>
          </div>
        </header>

        {screen === 'dashboard' && <Dashboard greeting={greeting} command={command} setCommand={setCommand} submitCommand={submitCommand} isRouting={isRouting} />}
        {screen === 'chat' && <Chat messages={messages} command={command} setCommand={setCommand} submitCommand={submitCommand} isRouting={isRouting} />}
        {screen === 'integrations' && <Integrations />}
        {screen === 'network' && <Network />}
        {screen === 'settings' && <Settings checkForUpdates={checkForUpdates} updateStatus={updateStatus} memoryCount={memoryCount} resetMemory={resetMemory} />}
      </section>
    </main>
  );
}

function Dashboard({ greeting, command, setCommand, submitCommand, isRouting }: { greeting: string; command: string; setCommand: (value: string) => void; submitCommand: () => void; isRouting: boolean }) {
  return (
    <section className="dashboard page-fade">
      <div className="hero-grid">
        <div className="hero-card">
          <p className="eyebrow">Noah voice identity - NoA visual system</p>
          <h2>{greeting}</h2>
          <p>NoA now has its first OpenAI Brain Layer. Local tools still run first, then Noah can reason over tool output when OpenAI is enabled.</p>
          <div className="command-card hero-command">
            <Command size={20} />
            <input value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitCommand()} placeholder="Ask Noah what needs your attention today..." />
            <button onClick={submitCommand} disabled={isRouting}>{isRouting ? <Loader2 className="spin" size={18} /> : <Send size={18} />}</button>
          </div>
        </div>
        <div className="core-card">
          <div className="orb"><Cpu size={58} /></div>
          <h3>NoA Core</h3>
          <p>Tool Engine active. OpenAI bridge ready.</p>
          <div className="meter"><span style={{ width: '68%' }} /></div>
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

function Chat({ messages, command, setCommand, submitCommand, isRouting }: { messages: Message[]; command: string; setCommand: (value: string) => void; submitCommand: () => void; isRouting: boolean }) {
  return (
    <section className="chat page-fade">
      <div className="chat-intro">
        <MessageSquareText size={24} />
        <div>
          <h2>Conversation with Noah</h2>
          <p>Alpha 0.4 can route through local tools, then use OpenAI to turn tool output into a more natural Noah response.</p>
        </div>
      </div>
      <div className="chat-log">
        {messages.map((message, index) => <div key={index} className={`bubble ${message.role}`}>{message.text}</div>)}
        {isRouting && <div className="bubble noa">Routing command through tools and brain layer...</div>}
      </div>
      <div className="command-card docked">
        <Sparkles size={20} />
        <input value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitCommand()} placeholder="Try: Noah, system status" />
        <button onClick={submitCommand} disabled={isRouting}>{isRouting ? <Loader2 className="spin" size={18} /> : <Send size={18} />}</button>
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
  const nodes = ['OpenAI', 'Supabase', 'Optra', 'Notion', 'Gmail', 'Calendar', 'Xero', 'Meta', 'Spotify', 'Tools'];
  return (
    <section className="network page-fade">
      <div className="scanline" />
      <div className="network-panel left">
        <p className="eyebrow">Live topology</p>
        <h3>System graph</h3>
        <p>Local Tool Engine now connects to the OpenAI Brain Layer. Live integrations come next.</p>
      </div>
      <div className="network-panel right">
        <p className="eyebrow">Engine state</p>
        <h3>{toolRegistry.length} tools active</h3>
        <p>{toolRegistry.map((tool) => tool.label).join(', ')}</p>
      </div>
      <div className="network-core"><span>NoA</span><small>Core</small></div>
      {nodes.map((node, index) => <div key={node} className={`network-node n${index + 1}`}>{node}</div>)}
      {nodes.map((node, index) => <div key={`${node}-line`} className={`pulse-line l${index + 1}`} />)}
    </section>
  );
}


function Settings({ checkForUpdates, updateStatus, memoryCount, resetMemory }: { checkForUpdates: () => void; updateStatus: string; memoryCount: number; resetMemory: () => void }) {
  const [openAISettings, setOpenAISettings] = useState<OpenAISettings>(getOpenAISettings());
  const [aiStatus, setAiStatus] = useState('Not tested');

  const saveAI = () => {
    saveOpenAISettings(openAISettings);
    setAiStatus(openAISettings.enabled && openAISettings.apiKey ? 'Saved. OpenAI brain layer enabled.' : 'Saved. OpenAI brain layer disabled.');
  };

  const testAI = async () => {
    saveOpenAISettings(openAISettings);
    setAiStatus('Testing OpenAI connection...');
    const result = await testOpenAIConnection();
    setAiStatus(result.ok ? result.text : result.message);
  };

  return (
    <section className="settings page-fade">
      <article className="glass-card wide">
        <Sparkles size={24} />
        <h3>OpenAI Brain Layer</h3>
        <p>Enable OpenAI to let Noah reason over local tool results. Your key is stored locally on this computer during alpha development.</p>
        <label className="settings-field">
          <span>Enable OpenAI</span>
          <input type="checkbox" checked={openAISettings.enabled} onChange={(e) => setOpenAISettings({ ...openAISettings, enabled: e.target.checked })} />
        </label>
        <label className="settings-field">
          <span>Model</span>
          <input value={openAISettings.model} onChange={(e) => setOpenAISettings({ ...openAISettings, model: e.target.value })} placeholder="gpt-5.5" />
        </label>
        <label className="settings-field">
          <span>API key</span>
          <input type="password" value={openAISettings.apiKey || ''} onChange={(e) => setOpenAISettings({ ...openAISettings, apiKey: e.target.value })} placeholder="sk-..." />
        </label>
        <div className="settings-actions">
          <button className="primary" onClick={saveAI}>Save OpenAI settings</button>
          <button className="primary" onClick={testAI}>Test connection</button>
        </div>
        <span>{aiStatus}</span>
      </article>
      <article className="glass-card wide">
        <DownloadCloud size={24} />
        <h3>Auto updates</h3>
        <p>NoA is configured for GitHub Releases through electron-updater. Packaged builds can check and install updates.</p>
        <button className="primary" onClick={checkForUpdates}>{updateStatus === 'Checking...' ? <Loader2 className="spin" size={16} /> : <DownloadCloud size={16} />} Check for updates</button>
        <span>{updateStatus}</span>
      </article>
      <article className="glass-card wide">
        <TerminalSquare size={24} />
        <h3>Tool Engine</h3>
        <p>Mode: {noaSettings.mode}. Local memory entries: {memoryCount}. Available tools: {toolRegistry.length}.</p>
        <button className="primary" onClick={resetMemory}>Clear local memory</button>
      </article>
    </section>
  );
}

function screenTitle(screen: Screen) {
  return ({ dashboard: 'Command Centre', chat: 'Conversation', integrations: 'Integrations', network: 'Network Core', settings: 'Settings' } as const)[screen];
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
