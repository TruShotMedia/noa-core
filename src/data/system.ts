import { Brain, BriefcaseBusiness, CalendarDays, CircleDot, Cloud, Database, Mail, RadioTower, Settings, Sparkles, WalletCards } from 'lucide-react';

export const integrations = [
  { name: 'OpenAI', status: 'prototype', health: 78, description: 'Reasoning brain and tool-calling layer for Noah.' },
  { name: 'Local Memory', status: 'ready', health: 86, description: 'Local context, saved notes, profile and memory search.' },
  { name: 'Supabase', status: 'next', health: 68, description: 'Cloud memory, user settings, logs and secure app state.' },
  { name: 'Optra', status: 'ready', health: 84, description: 'Jobs, clients, tasks and delivery pipeline.' },
  { name: 'Notion', status: 'ready', health: 81, description: 'Daily tasks, knowledge hub and planning systems.' },
  { name: 'Calendar', status: 'planned', health: 34, description: 'Schedule awareness, planning and daily briefings.' },
  { name: 'Gmail', status: 'planned', health: 22, description: 'Inbox summaries, follow-ups and client communications.' },
  { name: 'Xero', status: 'planned', health: 18, description: 'Accounting, invoices, cashflow and business finance.' },
  { name: 'Meta Ads', status: 'planned', health: 18, description: 'Campaign visibility, ad metrics and performance summaries.' },
  { name: 'Life Dashboard', status: 'prototype', health: 60, description: 'Home display and ambient command centre screens.' }
];

export const dashboardCards = [
  { label: 'Today', value: '8 tasks', detail: '2 need attention', icon: CalendarDays },
  { label: 'Jobs', value: '12 active', detail: '3 due this week', icon: BriefcaseBusiness },
  { label: 'Systems', value: '7 online', detail: 'Memory active', icon: RadioTower },
  { label: 'Memory', value: 'Active', detail: 'Local context engine', icon: Brain },
  { label: 'Updates', value: 'Enabled', detail: 'GitHub releases', icon: Cloud },
  { label: 'Finance', value: 'Planned', detail: 'Xero integration queued', icon: WalletCards }
];

export const priorities = [
  { title: 'Move memory to Supabase', detail: 'Take the local memory model and prepare cloud tables for multi-device recall.', state: 'Next build' },
  { title: 'Connect Notion', detail: 'Start reading Daily Tasks and planning systems into the daily briefing tool.', state: 'Integration' },
  { title: 'Create context rules', detail: 'Define which memories Noah should always use, search for, or ignore.', state: 'Queued' }
];

export const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: CircleDot },
  { id: 'chat', label: 'Chat', icon: Sparkles },
  { id: 'memory', label: 'Memory', icon: Database },
  { id: 'integrations', label: 'Integrations', icon: Cloud },
  { id: 'network', label: 'Network', icon: RadioTower },
  { id: 'settings', label: 'Settings', icon: Settings }
] as const;
