import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';

let tmpDir: string;

// extractTextFromImage shells out to the real `tesseract` binary, which
// tests shouldn't depend on having installed — mock the seam instead.
vi.mock('../ocr.js', () => ({ extractTextFromImage: vi.fn() }));

async function freshApp() {
  vi.resetModules();
  process.env.DATA_FILE = join(tmpDir, 'tend-store.json');
  const { app } = await import('../app.js');
  const { extractTextFromImage } = await import('../ocr.js');
  return { app, extractTextFromImage: extractTextFromImage as unknown as ReturnType<typeof vi.fn> };
}

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'tend-receipt-test-'));
});

afterEach(async () => {
  delete process.env.DATA_FILE;
  delete process.env.TEND_PASSPHRASE;
  await rm(tmpDir, { recursive: true, force: true });
  vi.clearAllMocks();
});

// A real (tiny, valid) 1x1 PNG — content doesn't matter since OCR itself is mocked.
const IMAGE_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('POST /api/receipt/extract', () => {
  it('parses OCR text into items', async () => {
    const { app, extractTextFromImage } = await freshApp();
    extractTextFromImage.mockResolvedValue('MILK 2% GAL   4.29\nTOTAL   4.29\n');

    const res = await request(app)
      .post('/api/receipt/extract')
      .send({ images: [IMAGE_DATA_URL] })
      .expect(200);

    expect(res.body).toEqual({ items: [{ name: 'MILK 2% GAL', price: 4.29 }], warnings: [] });
  });

  it('merges items across multiple photos, processed one at a time', async () => {
    const { app, extractTextFromImage } = await freshApp();
    extractTextFromImage.mockResolvedValueOnce('BREAD   2.50').mockResolvedValueOnce('EGGS   3.99');

    const res = await request(app)
      .post('/api/receipt/extract')
      .send({ images: [IMAGE_DATA_URL, IMAGE_DATA_URL] })
      .expect(200);

    expect(res.body.items).toEqual([{ name: 'BREAD', price: 2.5 }, { name: 'EGGS', price: 3.99 }]);
    expect(extractTextFromImage).toHaveBeenCalledTimes(2);
  });

  it('reports a per-photo warning instead of failing the whole request when OCR errors', async () => {
    const { app, extractTextFromImage } = await freshApp();
    extractTextFromImage.mockRejectedValue(new Error('tesseract not found'));

    const res = await request(app)
      .post('/api/receipt/extract')
      .send({ images: [IMAGE_DATA_URL] })
      .expect(200);

    expect(res.body).toEqual({ items: [], warnings: ["Photo 1: OCR failed (tesseract not found)."] });
  });

  it('400s when no images are provided', async () => {
    const { app } = await freshApp();
    await request(app).post('/api/receipt/extract').send({ images: [] }).expect(400);
  });

  it('400s when more than 5 images are provided', async () => {
    const { app } = await freshApp();
    await request(app)
      .post('/api/receipt/extract')
      .send({ images: Array(6).fill(IMAGE_DATA_URL) })
      .expect(400);
  });

  it('is protected by the passphrase gate like everything else', async () => {
    process.env.TEND_PASSPHRASE = 'correct-horse';
    const { app } = await freshApp();
    await request(app).post('/api/receipt/extract').send({ images: [IMAGE_DATA_URL] }).expect(401);
  });
});
