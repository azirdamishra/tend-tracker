import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';

let tmpDir: string;

async function freshApp() {
  vi.resetModules();
  process.env.DATA_FILE = join(tmpDir, 'tend-store.json');
  const { app } = await import('../app.js');
  return app;
}

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'tend-routes-test-'));
});

afterEach(async () => {
  delete process.env.DATA_FILE;
  await rm(tmpDir, { recursive: true, force: true });
});

describe('storage routes', () => {
  it('404s on a missing key', async () => {
    const app = await freshApp();
    await request(app).get('/api/storage/nope').expect(404);
  });

  it('round-trips a value through PUT then GET', async () => {
    const app = await freshApp();
    await request(app)
      .put('/api/storage/categories')
      .send({ value: '[{"id":"a"}]' })
      .expect(200, { key: 'categories', value: '[{"id":"a"}]', shared: false });

    await request(app)
      .get('/api/storage/categories')
      .expect(200, { key: 'categories', value: '[{"id":"a"}]', shared: false });
  });

  it('400s a PUT with no value in the body', async () => {
    const app = await freshApp();
    await request(app).put('/api/storage/categories').send({}).expect(400);
  });

  it('deletes a key and reports whether it existed', async () => {
    const app = await freshApp();
    await request(app).put('/api/storage/goals').send({ value: '[]' });
    await request(app).delete('/api/storage/goals').expect(200, { key: 'goals', deleted: true, shared: false });
    await request(app).delete('/api/storage/goals').expect(200, { key: 'goals', deleted: false, shared: false });
  });

  it('lists keys filtered by prefix', async () => {
    const app = await freshApp();
    await request(app).put('/api/storage/tend:a').send({ value: '1' });
    await request(app).put('/api/storage/tend:b').send({ value: '2' });
    await request(app).put('/api/storage/other').send({ value: '3' });

    const res = await request(app).get('/api/storage?prefix=tend:').expect(200);
    expect(res.body.keys.sort()).toEqual(['tend:a', 'tend:b']);
    expect(res.body.prefix).toBe('tend:');
  });
});
