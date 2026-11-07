// Express app: JSON body parsing, the storage API, and the built frontend,
// all on one process/port so the Pi only needs one systemd service.
//
// No .listen() here — index.ts owns that — so tests can import `app`
// directly with supertest without binding a real port.

import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { passphraseGate } from './auth.js';
import { storageRouter } from './routes/storage.js';
import { receiptRouter } from './routes/receipt.js';

const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist');

export const app = express();

app.use(passphraseGate);

// Receipt photos are much bigger than anything else this server handles, so
// this route gets its own raised body-size limit rather than raising it
// globally for the tiny JSON-string storage API.
app.use('/api/receipt', express.json({ limit: '40mb' }), receiptRouter);

app.use(express.json());
app.use('/api/storage', storageRouter);

app.use(express.static(distDir));
// Catch-all SPA fallback. No path pattern (rather than '*') because Express 5's
// router no longer accepts a bare wildcard string.
app.use((req, res) => {
  if (req.method !== 'GET') return res.status(404).end();
  res.sendFile(join(distDir, 'index.html'));
});
