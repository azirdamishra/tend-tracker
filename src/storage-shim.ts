// Emulates the window.storage API (get/set/delete/list) that Claude.ai
// provides inside artifacts, backed by the Tend server's JSON-file storage
// (server/src/store.ts) instead of localStorage. This lets App.jsx run
// unchanged whether it's inside Claude.ai or standalone.
//
// Calls are relative (`/api/storage/...`) so this works unmodified in both
// dev (Vite proxies /api to the Express dev server) and production (the
// same Express process serves the built frontend and the API).

interface StorageResult {
  key: string;
  value: string;
  shared: boolean;
}

interface DeleteResult {
  key: string;
  deleted: boolean;
  shared: boolean;
}

interface ListResult {
  keys: string[];
  prefix: string;
  shared: boolean;
}

declare global {
  interface Window {
    storage: {
      get(key: string, shared?: boolean): Promise<StorageResult>;
      set(key: string, value: string, shared?: boolean): Promise<StorageResult>;
      delete(key: string, shared?: boolean): Promise<DeleteResult>;
      list(prefix?: string, shared?: boolean): Promise<ListResult>;
    };
  }
}

window.storage = {
  async get(key, shared = false) {
    const res = await fetch(`/api/storage/${encodeURIComponent(key)}`);
    if (!res.ok) {
      // Matches the real API: accessing a missing key throws, not returns null.
      throw new Error(`Key "${key}" not found`);
    }
    return res.json();
  },

  async set(key, value, shared = false) {
    const res = await fetch(`/api/storage/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, shared }),
    });
    if (!res.ok) throw new Error(`Failed to save "${key}"`);
    return res.json();
  },

  async delete(key, shared = false) {
    const res = await fetch(`/api/storage/${encodeURIComponent(key)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete "${key}"`);
    return res.json();
  },

  async list(prefix = '', shared = false) {
    const params = new URLSearchParams({ prefix, shared: String(shared) });
    const res = await fetch(`/api/storage?${params}`);
    if (!res.ok) throw new Error('Failed to list keys');
    return res.json();
  },
};

export {};
