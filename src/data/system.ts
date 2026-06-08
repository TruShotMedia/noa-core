import { Brain, BriefcaseBusiness, CalendarDays, CircleDot, Cloud, Mail, RadioTower, Settings, Sparkles, WalletCards } from 'lucide-react';

export const integrations = [
  { name: 'OpenAI', status: 'next', health: 72, description: 'Reasoning brain and tool-calling layer for Noah.' },
  { name: 'Supabase', status: 'next', health: 68, description: 'Memory, user settings, logs and secure app state.' },
  { name: 'Optra', status: 'ready', health: 84, description: 'Jobs, clients, tasks and delivery pipeline.' },
  { name: 'Notion', status: 'ready', health: 81, description: 'Daily tasks, knowledge hub and planning systems.' },
  { name: 'Calendar', status: 'planned', health: 34, description: 'Schedule awareness, planning and daily briefings.' },
  { name: 'Gmail', status: 'planned', health: 22, description: 'Inbox summaries, follow-ups and client communications.' },
  { name: 'Xero', status: 'planned', health: 18, description: 'Accounting, invoices, cashflow and business finance.' },
  { name: 'Meta Ads', status: 'planned', health: 18, description: 'Campaign visibility, ad metrics and performance summaries.' },
  { name: 'Spotify', status: 'prototype', health: 56, description: 'Now playing data for displays and the vehicle gauge.' },
  { name: 'Life Dashboard', status: 'prototype', health: 60, description: 'Home display and ambient command centre screens.' }
];

export const dashboardCards = [
  { label: 'Today', value: '8 tasks', detail: '2 need attention', icon: CalendarDays },
  { label: 'Jobs', value: '12 active', detail: '3 due this week', icon: BriefcaseBusiness },
  { label: 'Systems', value: '6 online', detail: '2 prototypes', icon: RadioTower },
  { label: 'Memory', value: 'Core ready', detail: 'Supabase layer next', icon: Brain },
  { label: 'Updates', value: 'Enabled', detail: 'GitHub releases', icon: Cloud },
  { label: 'Finance', value: 'Planned', detail: 'Xero integration queued', icon: WalletCards }
];

export const priorities = [
  { title: 'Connect OpenAI API', detail: 'Add secure local API key handling and first NoA response service.', state: 'Next build' },
  { title: 'Create tool engine', detail: 'Standardise how Noah calls actions like getJobs, getTasks and searchMemory.', state: 'Architecture' },
  { title: 'Persist memory', detail: 'Prepare Supabase tables for user profile, conversation logs and skills.', state: 'Queued' }
];

export const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: CircleDot },
  { id: 'chat', label: 'Chat', icon: Sparkles },
  { id: 'integrations', label: 'Integrations', icon: Cloud },
  { id: 'network', label: 'Network', icon: RadioTower },
  { id: 'settings', label: 'Settings', icon: Settings }
] as const;
