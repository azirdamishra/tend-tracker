import { describe, expect, it } from 'vitest';
import { applyInventoryDraft, applyInventoryDrafts, normalize, reverseInventoryDelta, reverseInventoryLinks, suggestCategory } from './App.jsx';

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

describe('applyInventoryDrafts', () => {
  it('applies several drafts (e.g. from a scanned receipt) and collects a link per item', () => {
    const { inventory, links } = applyInventoryDrafts([], [
      { name: 'Milk', categoryId: 'kitchen', quantity: 1, price: 4 },
      { name: 'Eggs', categoryId: 'kitchen', quantity: 1, price: 3 },
    ]);
    expect(inventory).toHaveLength(2);
    expect(inventory.map((i) => i.name)).toEqual(['Milk', 'Eggs']);
    expect(links).toEqual([
      { inventoryItemId: inventory[0].id, qtyAdded: 1 },
      { inventoryItemId: inventory[1].id, qtyAdded: 1 },
    ]);
  });

  it('increments an existing item across drafts the same way a single draft would', () => {
    const existing = [{ id: 'abc', name: 'Rice', normalizedName: 'rice', categoryId: 'kitchen', quantity: 2, unitCostLast: 100, createdAt: 1, updatedAt: 1 }];
    const { inventory, links } = applyInventoryDrafts(existing, [{ name: 'Rice', categoryId: 'kitchen', quantity: 3, price: 150 }]);
    expect(inventory[0]).toMatchObject({ id: 'abc', quantity: 5, unitCostLast: 50 });
    expect(links).toEqual([{ inventoryItemId: 'abc', qtyAdded: 3 }]);
  });

  it('skips drafts with a blank name or non-positive quantity, producing no link for them', () => {
    const { inventory, links } = applyInventoryDrafts([], [
      { name: '  ', categoryId: null, quantity: 1, price: 5 },
      { name: 'Soap', categoryId: null, quantity: 0, price: 5 },
    ]);
    expect(inventory).toEqual([]);
    expect(links).toEqual([]);
  });
});

describe('reverseInventoryLinks', () => {
  it('reverses every link in the array', () => {
    const inventory = [{ id: 'a', quantity: 5, updatedAt: 1 }, { id: 'b', quantity: 3, updatedAt: 1 }];
    const result = reverseInventoryLinks(inventory, [{ inventoryItemId: 'a', qtyAdded: 2 }, { inventoryItemId: 'b', qtyAdded: 3 }]);
    expect(result.find((i) => i.id === 'a').quantity).toBe(3);
    expect(result.find((i) => i.id === 'b').quantity).toBe(0);
  });

  it('is a no-op for an empty or missing links array', () => {
    const inventory = [{ id: 'a', quantity: 5 }];
    expect(reverseInventoryLinks(inventory, [])).toBe(inventory);
    expect(reverseInventoryLinks(inventory, undefined)).toBe(inventory);
  });
});
