import type { Card } from "./types";

/**
 * Builds a projective-plane deck of order n (n must be prime).
 * Produces n^2 + n + 1 cards, each with n + 1 symbols, and any two cards
 * share exactly one symbol.
 */
export function generateDeck(n: number): Card[] {
  if (!isPrime(n)) throw new Error(`Order must be prime, got ${n}`);
  const cards: Card[] = [];

  for (let i = 0; i <= n; i++) {
    const card = [0];
    for (let j = 0; j < n; j++) card.push(1 + i * n + j);
    cards.push(card);
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const card = [1 + i];
      for (let k = 0; k < n; k++) card.push(n + 1 + n * k + ((i * k + j) % n));
      cards.push(card);
    }
  }
  return cards;
}

/** Returns the single shared symbol between two cards, or null if invalid. */
export function sharedSymbol(a: Card, b: Card): number | null {
  const set = new Set(a);
  const common = b.filter((s) => set.has(s));
  return common.length === 1 ? common[0] : null;
}

export function validateDeck(cards: Card[]): boolean {
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++)
      if (sharedSymbol(cards[i], cards[j]) === null) return false;
  return true;
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}
