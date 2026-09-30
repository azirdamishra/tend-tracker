// HTTP layer over store.ts, matching window.storage's get/set/delete/list
// shape. The `shared` flag is accepted for shape-compatibility with that API
// but isn't given a separate namespace here — this app has no concept of a
// second user/device, so a real "shared" store would be unused complexity.

import { Router } from 'express';
import { z } from 'zod';
import { deleteValue, getValue, listKeys, setValue } from '../store.js';

export const storageRouter = Router();

const keyParamSchema = z.object({ key: z.string().min(1) });
const setBodySchema = z.object({ value: z.string(), shared: z.boolean().optional().default(false) });
const listQuerySchema = z.object({
  prefix: z.string().optional().default(''),
  shared: z.coerce.boolean().optional().default(false),
});

storageRouter.get('/', async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { prefix, shared } = parsed.data;
  const keys = await listKeys(prefix);
  res.json({ keys, prefix, shared });
});

storageRouter.get('/:key', async (req, res) => {
  const parsed = keyParamSchema.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { key } = parsed.data;
  const value = await getValue(key);
  if (value === undefined) return res.status(404).json({ error: `Key "${key}" not found` });
  res.json({ key, value, shared: false });
});

storageRouter.put('/:key', async (req, res) => {
  const keyParsed = keyParamSchema.safeParse(req.params);
  const bodyParsed = setBodySchema.safeParse(req.body);
  if (!keyParsed.success) return res.status(400).json({ error: keyParsed.error.flatten() });
  if (!bodyParsed.success) return res.status(400).json({ error: bodyParsed.error.flatten() });
  const { key } = keyParsed.data;
  const { value, shared } = bodyParsed.data;
  await setValue(key, value);
  res.json({ key, value, shared });
});

storageRouter.delete('/:key', async (req, res) => {
  const parsed = keyParamSchema.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { key } = parsed.data;
  const deleted = await deleteValue(key);
  res.json({ key, deleted, shared: false });
});
