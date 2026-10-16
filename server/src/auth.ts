// HTTP Basic Auth gate behind a single shared passphrase, so Tend isn't
// openly usable by anyone else on the same WiFi. Opt-in: a no-op unless
// TEND_PASSPHRASE is set, so local dev is unaffected.

import type { NextFunction, Request, Response } from 'express';

const PASSPHRASE = process.env.TEND_PASSPHRASE;

export function passphraseGate(req: Request, res: Response, next: NextFunction): void {
  if (!PASSPHRASE) return next();

  const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
  const provided = scheme === 'Basic' && encoded ? Buffer.from(encoded, 'base64').toString('utf8').split(':')[1] : undefined;

  if (provided === PASSPHRASE) return next();

  res.set('WWW-Authenticate', 'Basic realm="Tend"');
  res.status(401).send('Passphrase required');
}
