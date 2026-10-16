import { describe, expect, it } from "vitest";
import { generateDeck, validateDeck } from "../src/shared/deck";
import { SYMBOLS, THEMES } from "../src/assets/symbols";

describe("deck generator", () => {
  const deck = generateDeck(7);
  it("has 57 cards of 8 symbols", () => {
    expect(deck).toHaveLength(57);
    deck.forEach((c) => expect(new Set(c).size).toBe(8));
  });
  it("every pair shares exactly one symbol", () => expect(validateDeck(deck)).toBe(true));
  it("has an emoji for every symbol id", () => {
    const max = Math.max(...deck.flat());
    expect(SYMBOLS.length).toBeGreaterThan(max);
    expect(new Set(SYMBOLS).size).toBe(SYMBOLS.length);
  });
  it("every theme has 57 distinct emoji", () => {
    for (const set of Object.values(THEMES)) {
      expect(set).toHaveLength(57);
      expect(new Set(set).size).toBe(57);
    }
  });
});
