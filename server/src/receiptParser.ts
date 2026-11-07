// Turns raw OCR text from a photographed receipt into a rough list of line
// items. Deliberately approximate (no weighed-item unit parsing, no column
// alignment) — the review screen in the client is where the user fixes
// whatever this gets wrong, which is the whole reason that screen exists.

export interface ReceiptItem {
  name: string;
  price: number;
}

const PRICE_PATTERN = /\$?\s*(\d+\.\d{2})\s*$/;

// Lines these match are receipt furniture (totals, tender, header/footer),
// not purchased items, even when they happen to end in a price-shaped number.
const SKIP_PATTERNS = [
  /total/i,
  /\btax\b/i,
  /\bcash\b/i,
  /\bchange\b/i,
  /\bvisa\b/i,
  /\bmastercard\b/i,
  /\bdebit\b/i,
  /\bcredit\b/i,
  /\bcard\b/i,
  /balance/i,
  /\bauth(?:orized)?\b/i,
  /approved/i,
  /items?\s*sold/i,
  /receipt/i,
  /thank you/i,
  /store\s*#/i,
];

export function parseReceiptText(text: string): ReceiptItem[] {
  const items: ReceiptItem[] = [];

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || SKIP_PATTERNS.some((p) => p.test(line))) continue;

    const match = line.match(PRICE_PATTERN);
    if (!match || match.index === undefined) continue;

    const price = Number(match[1]);
    const name = line.slice(0, match.index).replace(/[\s.*-]+$/, '').trim();
    if (!name || !(price > 0)) continue;

    items.push({ name, price });
  }

  return items;
}
