import type { ContextProfile, MemoryEntry, MemoryType } from '../../types/noa';

const MEMORY_KEY = 'noa.localMemory.v2';
const PROFILE_KEY = 'noa.contextProfile.v1';
const MAX_MEMORY = 250;

const defaultProfile: ContextProfile = {
  name: 'John',
  visualIdentity: 'NoA',
  voiceIdentity: 'Noah',
  mission: 'Act as John\'s personal and business intelligence layer across clients, tasks, content, displays, automations and integrations.',
  primaryBusinesses: ['TruShot Media', 'Fearless', 'Optra Studio'],
  activeSystems: ['NoA Core', 'Optra', 'Life Dashboard', 'Notion workflows', 'Spotify display prototype'],
  preferredTone: 'Calm, direct, operational, premium and useful. Australian English.',
  updatedAt: new Date().toISOString()
};

const starterMemories: Array<Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    type: 'business_context',
    title: 'NoA identity',
    content: 'The app is visually called NoA, while voice interaction recognises and speaks as Noah. NoA means Noetic Advisor.',
    tags: ['identity', 'core'],
    pinned: true
  },
  {
    type: 'business_context',
    title: 'Operating system goal',
    content: 'NoA should become the central intelligence layer across TruShot Media, Optra, Fearless, Life Dashboard, Notion, displays, future voice control and client workflows.',
    tags: ['mission', 'strategy'],
    pinned: true
  },
  {
    type: 'system',
    title: 'Current architecture',
    content: 'NoA is an Electron, React, TypeScript and Vite desktop app with a Tool Engine, OpenAI Brain Layer, local memory and planned integrations.',
    tags: ['architecture'],
    pinned: true
  }
];

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readMemory(): MemoryEntry[] {
  try {
    const raw = window.localStorage.getItem(MEMORY_KEY);
    if (!raw) return seedMemory();
    return JSON.parse(raw) as MemoryEntry[];
  } catch {
    return [];
  }
}

function writeMemory(entries: MemoryEntry[]) {
  const sorted = [...entries].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  window.localStorage.setItem(MEMORY_KEY, JSON.stringify(sorted.slice(-MAX_MEMORY)));
}

function seedMemory() {
  const now = new Date().toISOString();
  const entries = starterMemories.map((entry) => ({ ...entry, id: makeId(), createdAt: now, updatedAt: now }));
  window.localStorage.setItem(MEMORY_KEY, JSON.stringify(entries));
  return entries;
}

export function getContextProfile(): ContextProfile {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? { ...defaultProfile, ...JSON.parse(raw) } : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export function saveContextProfile(profile: ContextProfile) {
  const next = { ...profile, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  return next;
}

export function addMemoryEntry(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>) {
  const entries = readMemory();
  const nextEntry: MemoryEntry = {
    ...entry,
    id: makeId(),
    tags: entry.tags || [],
    pinned: entry.pinned || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeMemory([...entries, nextEntry]);
  return nextEntry;
}

export function getAllMemory() {
  return readMemory().sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getRecentMemory(limit = 10) {
  return getAllMemory().slice(0, limit);
}

export function getMemoryStats() {
  const entries = readMemory();
  const byType = entries.reduce<Record<MemoryType, number>>((acc, entry) => {
    acc[entry.type] = (acc[entry.type] || 0) + 1;
    return acc;
  }, {} as Record<MemoryType, number>);

  return {
    total: entries.length,
    pinned: entries.filter((entry) => entry.pinned).length,
    byType
  };
}

export function searchMemory(query: string, limit = 8) {
  const terms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 2);
  if (!terms.length) return getRecentMemory(limit);

  return readMemory()
    .map((entry) => {
      const haystack = `${entry.title || ''} ${entry.content} ${(entry.tags || []).join(' ')} ${entry.type}`.toLowerCase();
      const score = terms.reduce((count, term) => count + (haystack.includes(term) ? 1 : 0), 0) + (entry.pinned ? 0.5 : 0);
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.entry);
}

export function deleteMemory(id: string) {
  writeMemory(readMemory().filter((entry) => entry.id !== id));
}

export function clearMemory() {
  window.localStorage.removeItem(MEMORY_KEY);
  seedMemory();
}

export function buildContextSummary() {
  const profile = getContextProfile();
  const pinned = getAllMemory().filter((entry) => entry.pinned).slice(0, 8);
  return [
    `User: ${profile.name}`,
    `Visual identity: ${profile.visualIdentity}`,
    `Voice identity: ${profile.voiceIdentity}`,
    `Mission: ${profile.mission}`,
    `Businesses: ${profile.primaryBusinesses.join(', ')}`,
    `Active systems: ${profile.activeSystems.join(', ')}`,
    `Tone: ${profile.preferredTone}`,
    `Pinned memory: ${pinned.map((entry) => `${entry.title || entry.type}: ${entry.content}`).join(' | ')}`
  ].join('\n');
}
