import { describe, expect, it } from 'vitest';
import { applyInventoryDraft, normalize, reverseInventoryDelta, suggestCategory } from './App.jsx';

const KEYWORDS = {
  beauty: ['moisturiser', 'moisturizer', 'shampoo'],
  kitchen: ['spice', 'oil'],
};

describe('normalize', () => {
  it('lowercases, trims, and collapses whitespace', () => {
    expect(normalize('  Neutrogena   Moisturiser ')).toBe('neutrogena moisturiser');
  });
});

describe('suggestCategory', () => {
  it('matches an existing inventory item by normalized name first', () => {
    const inventory = [{ normalizedName: 'neutrogena moisturiser', categoryId: 'beauty' }];
    const result = suggestCategory('Neutrogena Moisturiser', inventory, KEYWORDS);
    expect(result).toEqual({ categoryId: 'beauty', confidence: 'known' });
  });

  it('falls back to an unambiguous keyword match', () => {
    const result = suggestCategory('Head & Shoulders shampoo', [], KEYWORDS);
    expect(result).toEqual({ categoryId: 'beauty', confidence: 'guess' });
  });

  it('returns none when no keyword matches', () => {
    const result = suggestCategory('random gadget', [], KEYWORDS);
    expect(result).toEqual({ categoryId: null, confidence: 'none' });
  });

  it('returns none when keywords match more than one category (ambiguous)', () => {
    const ambiguous = { beauty: ['oil'], kitchen: ['oil'] };
    const result = suggestCategory('coconut oil', [], ambiguous);
    expect(result).toEqual({ categoryId: null, confidence: 'none' });
  });
});

describe('applyInventoryDraft', () => {
  it('creates a new item when no match exists', () => {
    const { inventory, itemId, qtyAdded } = applyInventoryDraft([], { name: 'Mosquito repellent', categoryId: 'home', quantity: 6 }, 300);
    expect(inventory).toHaveLength(1);
    expect(inventory[0]).toMatchObject({
      name: 'Mosquito repellent',
      normalizedName: 'mosquito repellent',
      categoryId: 'home',
      quantity: 6,
      unitCostLast: 50,
    });
    expect(itemId).toBe(inventory[0].id);
    expect(qtyAdded).toBe(6);
  });

  it('increments quantity and updates unit cost on an existing match', () => {
    const existing = [{ id: 'abc', name: 'Rice', normalizedName: 'rice', categoryId: 'kitchen', quantity: 2, unitCostLast: 100, createdAt: 1, updatedAt: 1 }];
    const { inventory, itemId, qtyAdded } = applyInventoryDraft(existing, { name: 'Rice', categoryId: 'kitchen', quantity: 3 }, 300);
    expect(inventory[0]).toMatchObject({ id: 'abc', quantity: 5, unitCostLast: 100 });
    expect(itemId).toBe('abc');
    expect(qtyAdded).toBe(3);
  });

  it('does nothing for a blank name or non-positive quantity', () => {
    expect(applyInventoryDraft([], { name: '  ', categoryId: null, quantity: 1 }, 100).itemId).toBeNull();
    expect(applyInventoryDraft([], { name: 'Soap', categoryId: null, quantity: 0 }, 100).itemId).toBeNull();
  });
});

describe('reverseInventoryDelta', () => {
  it('subtracts the given quantity, flooring at 0', () => {
    const inventory = [{ id: 'abc', quantity: 2, updatedAt: 1 }];
    const result = reverseInventoryDelta(inventory, 'abc', 5);
    expect(result[0].quantity).toBe(0);
  });

  it('is a no-op when there is no item id or quantity', () => {
    const inventory = [{ id: 'abc', quantity: 2 }];
    expect(reverseInventoryDelta(inventory, null, 5)).toBe(inventory);
    expect(reverseInventoryDelta(inventory, 'abc', 0)).toBe(inventory);
  });
});
