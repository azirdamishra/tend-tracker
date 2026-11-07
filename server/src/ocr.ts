// Shells out to the system `tesseract` binary (installed separately —
// `apt install tesseract-ocr` on the Pi, `brew install tesseract` for local
// dev; see README). Uses execFile with an argument array, which never
// spawns a shell, so nothing in the image bytes or file paths can be
// interpreted as shell syntax.
//
// The obvious npm wrapper for this, node-tesseract-ocr, has an unpatched
// critical OS command-injection CVE (GHSA-8j44-735h-w4w2) in every published
// version, so this ~20-line replacement is deliberate, not an oversight.

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function extractTextFromImage(image: Buffer): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'tend-receipt-'));
  const imagePath = join(dir, 'receipt.img');
  const outBase = join(dir, 'out');
  try {
    await writeFile(imagePath, image);
    await execFileAsync('tesseract', [imagePath, outBase, '-l', 'eng', '--psm', '6']);
    return await readFile(`${outBase}.txt`, 'utf8');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
