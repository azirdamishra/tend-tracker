// Local OCR for scanned grocery receipts: runs entirely on the Pi via the
// `tesseract` binary (see ocr.ts) — no outbound API calls, no API key.
// Stateless: nothing is written to the store and no image bytes survive
// past the request.

import { Router } from 'express';
import { z } from 'zod';
import { extractTextFromImage } from '../ocr.js';
import { parseReceiptText, type ReceiptItem } from '../receiptParser.js';

export const receiptRouter = Router();

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // decoded size, per image

const bodySchema = z.object({
  images: z.array(z.string().min(1)).min(1).max(MAX_IMAGES),
});

function decodeDataUrl(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  return Buffer.from(match?.[1] ?? dataUrl, 'base64');
}

receiptRouter.post('/extract', async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const warnings: string[] = [];
  const items: ReceiptItem[] = [];

  // Sequential, not Promise.all: bounds peak memory on a 1GB Pi rather than
  // decoding and OCRing every photo at once.
  for (const [i, dataUrl] of parsed.data.images.entries()) {
    let buffer: Buffer;
    try {
      buffer = decodeDataUrl(dataUrl);
    } catch {
      warnings.push(`Photo ${i + 1}: couldn't decode image data.`);
      continue;
    }
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      warnings.push(`Photo ${i + 1}: too large or empty, skipped.`);
      continue;
    }
    try {
      const text = await extractTextFromImage(buffer);
      items.push(...parseReceiptText(text));
    } catch (err) {
      warnings.push(`Photo ${i + 1}: OCR failed (${(err as Error).message}).`);
    }
  }

  res.json({ items, warnings });
});
