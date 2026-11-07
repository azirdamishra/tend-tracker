import { describe, expect, it } from 'vitest';
import { parseReceiptText } from './receiptParser.js';

describe('parseReceiptText', () => {
  it('extracts name/price pairs from item lines and drops totals/tender lines', () => {
    const text = [
      'WHOLE FOODS MARKET',
      'BANANAS            0.89',
      'MILK 2% GAL         4.29',
      'EGGS LARGE DZ       3.99',
      'SUBTOTAL            9.17',
      'TAX                 0.73',
      'TOTAL               9.90',
      'VISA DEBIT',
      'THANK YOU',
    ].join('\n');

    expect(parseReceiptText(text)).toEqual([
      { name: 'BANANAS', price: 0.89 },
      { name: 'MILK 2% GAL', price: 4.29 },
      { name: 'EGGS LARGE DZ', price: 3.99 },
    ]);
  });

  it('skips lines with no trailing price', () => {
    expect(parseReceiptText('STORE #4821\nSome garbled OCR noise')).toEqual([]);
  });

  it('handles a $ prefix on the price', () => {
    expect(parseReceiptText('COFFEE BEANS    $12.50')).toEqual([{ name: 'COFFEE BEANS', price: 12.5 }]);
  });

  it('ignores blank lines', () => {
    expect(parseReceiptText('BREAD   2.50\n\n\nTOTAL   2.50')).toEqual([{ name: 'BREAD', price: 2.5 }]);
  });

  it('returns an empty list for text with no price-shaped lines at all', () => {
    expect(parseReceiptText('')).toEqual([]);
    expect(parseReceiptText('   \n  \n')).toEqual([]);
  });
});
