// JSON-file-backed key/value store, mirroring the get/set/delete/list shape
// window.storage exposes in Claude.ai artifacts (see src/storage-shim.ts).
//
// Source of truth is a single JSON file on disk. The whole file is loaded
// into memory once at startup; reads are served from memory, and every
// mutation is persisted back to disk through a serialized write queue so
// concurrent requests can't interleave writes, using a write-to-temp-then-
// rename so a crash or power loss mid-write can never leave a corrupt file.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const DATA_FILE = process.env.DATA_FILE || new URL('../data/tend-store.json', import.meta.url).pathname;

let data: Record<string, string> = {};
let loaded: Promise<void> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function load(): Promise<void> {
  if (!loaded) {
    loaded = (async () => {
      try {
        data = JSON.parse(await readFile(DATA_FILE, 'utf8'));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
        data = {};
        await persist();
      }
    })();
  }
  return loaded;
}

async function persist(): Promise<void> {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  const tmpFile = `${DATA_FILE}.${process.pid}.tmp`;
  await writeFile(tmpFile, JSON.stringify(data, null, 2), 'utf8');
  await rename(tmpFile, DATA_FILE);
}

function enqueueWrite(): Promise<void> {
  writeQueue = writeQueue.then(persist);
  return writeQueue;
}

export async function getValue(key: string): Promise<string | undefined> {
  await load();
  return data[key];
}

export async function setValue(key: string, value: string): Promise<void> {
  await load();
  data[key] = value;
  await enqueueWrite();
}

export async function deleteValue(key: string): Promise<boolean> {
  await load();
  const existed = Object.prototype.hasOwnProperty.call(data, key);
  delete data[key];
  if (existed) await enqueueWrite();
  return existed;
}

export async function listKeys(prefix = ''): Promise<string[]> {
  await load();
  return Object.keys(data).filter((k) => k.startsWith(prefix));
}

// Test-only escape hatch to reset in-memory state between test files.
export function __resetForTests(): void {
  data = {};
  loaded = null;
  writeQueue = Promise.resolve();
}
