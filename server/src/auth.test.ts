import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';

let tmpDir: string;

async function freshApp() {
  vi.resetModules();
  process.env.DATA_FILE = join(tmpDir, 'tend-store.json');
  const { app } = await import('./app.js');
  return app;
}

function basicAuthHeader(passphrase: string, username = 'tend'): string {
  return `Basic ${Buffer.from(`${username}:${passphrase}`).toString('base64')}`;
}

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'tend-auth-test-'));
});

afterEach(async () => {
  delete process.env.DATA_FILE;
  delete process.env.TEND_PASSPHRASE;
  await rm(tmpDir, { recursive: true, force: true });
});

describe('passphrase gate', () => {
  it('lets requests through when no passphrase is configured', async () => {
    const app = await freshApp();
    await request(app).get('/api/storage').expect(200);
  });

  it('rejects requests with no credentials when a passphrase is set', async () => {
    process.env.TEND_PASSPHRASE = 'correct-horse';
    const app = await freshApp();
    await request(app).get('/api/storage').expect(401);
  });

  it('rejects the wrong passphrase', async () => {
    process.env.TEND_PASSPHRASE = 'correct-horse';
    const app = await freshApp();
    await request(app)
      .get('/api/storage')
      .set('Authorization', basicAuthHeader('wrong-guess'))
      .expect(401);
  });

  it('accepts the right passphrase, ignoring the username field', async () => {
    process.env.TEND_PASSPHRASE = 'correct-horse';
    const app = await freshApp();
    await request(app)
      .get('/api/storage')
      .set('Authorization', basicAuthHeader('correct-horse', 'anything'))
      .expect(200);
  });
});
