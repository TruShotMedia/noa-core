import type { MemoryEntry } from '../../types/noa';

const MEMORY_KEY = 'noa.localMemory.v1';

function readMemory(): MemoryEntry[] {
  try {
    const raw = window.localStorage.getItem(MEMORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeMemory(entries: MemoryEntry[]) {
  window.localStorage.setItem(MEMORY_KEY, JSON.stringify(entries.slice(-100)));
}

export function addMemoryEntry(entry: Omit<MemoryEntry, 'id' | 'createdAt'>) {
  const entries = readMemory();
  const nextEntry: MemoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };

  writeMemory([...entries, nextEntry]);
  return nextEntry;
}

export function getRecentMemory(limit = 10) {
  return readMemory().slice(-limit).reverse();
}

export function clearMemory() {
  window.localStorage.removeItem(MEMORY_KEY);
}
