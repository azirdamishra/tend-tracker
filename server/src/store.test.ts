import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let tmpDir: string;

// store.ts reads DATA_FILE (and its own module-level cache) at import time /
// on first use, so each test resets the module registry and gets a fresh
// temp file, to keep tests isolated from each other and from the real data
// directory.
async function freshStore() {
  vi.resetModules();
  process.env.DATA_FILE = join(tmpDir, 'tend-store.json');
  return import('./store.js');
}

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'tend-store-test-'));
});

afterEach(async () => {
  delete process.env.DATA_FILE;
  await rm(tmpDir, { recursive: true, force: true });
});

describe('store', () => {
  it('returns undefined for a missing key', async () => {
    const { getValue } = await freshStore();
    expect(await getValue('nope')).toBeUndefined();
  });

  it('round-trips a value through set/get', async () => {
    const { getValue, setValue } = await freshStore();
    await setValue('categories', '[{"id":"a"}]');
    expect(await getValue('categories')).toBe('[{"id":"a"}]');
  });

  it('persists the value to disk atomically', async () => {
    const { setValue } = await freshStore();
    await setValue('expenses', '[]');
    const onDisk = JSON.parse(await readFile(process.env.DATA_FILE as string, 'utf8'));
    expect(onDisk).toEqual({ expenses: '[]' });
  });

  it('deletes a key and reports whether it existed', async () => {
    const { setValue, deleteValue, getValue } = await freshStore();
    await setValue('goals', '[]');
    expect(await deleteValue('goals')).toBe(true);
    expect(await deleteValue('goals')).toBe(false);
    expect(await getValue('goals')).toBeUndefined();
  });

  it('lists keys filtered by prefix', async () => {
    const { setValue, listKeys } = await freshStore();
    await setValue('tend:categories', '[]');
    await setValue('tend:expenses', '[]');
    await setValue('other:thing', '[]');
    expect((await listKeys('tend:')).sort()).toEqual(['tend:categories', 'tend:expenses']);
    expect(await listKeys()).toHaveLength(3);
  });

  it('loads back what a previous store instance persisted', async () => {
    const first = await freshStore();
    await first.setValue('currency', '"₹"');

    vi.resetModules();
    const second = await import('./store.js');
    expect(await second.getValue('currency')).toBe('"₹"');
  });
});
