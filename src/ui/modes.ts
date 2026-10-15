import { CONFIG } from "../shared/config";
import type { GameLength, GameMode } from "../shared/types";

/** Display copy for each mode: lobby picker, How to play, scores and results. */
export interface ModeInfo {
  name: string;
  icon: string;
  tagline: string;
  goal: string;
  steps: string[];
  /** How a score reads, e.g. "12 cards" or "3 left". */
  score: (n: number) => string;
}

const cards = (n: number) => `${n} card${n === 1 ? "" : "s"}`;

export const MODE_ORDER: GameMode[] = ["tower", "well", "gift"];

export const MODE_INFO: Record<GameMode, ModeInfo> = {
  tower: {
    name: "Tower",
    icon: "🗼",
    tagline: "Grab the center card. Most cards wins.",
    goal: "Collect the most cards by the time the deck runs out.",
    steps: [
      "Everyone starts with one card. The rest of the deck is the center pile.",
      "Find the one symbol your card shares with the center card and tap it on your card.",
      "Get there first and you win the center card. It goes on top of your tower and becomes your new card.",
      "A new center card is revealed and the race starts again.",
    ],
    score: cards,
  },
  well: {
    name: "Well",
    icon: "🪣",
    tagline: "Empty your pile first.",
    goal: "Be the first player to get rid of every card in your pile.",
    steps: [
      "One card goes in the center. The rest are dealt evenly into everyone's pile.",
      "Find the symbol your top card shares with the center card and tap it on your card.",
      "Get there first and your card is played onto the center, revealing your next card.",
      "The center card keeps changing, so watch it closely.",
    ],
    score: (n) => `${n} left`,
  },
  gift: {
    name: "Gift",
    icon: "🎁",
    tagline: "Hand the center card to someone else. Fewest cards wins.",
    goal: "Hold the fewest cards when the deck runs out.",
    steps: [
      "Everyone starts with one card. The rest of the deck is the center pile.",
      "Find a symbol the center card shares with an opponent's card.",
      "Tap that symbol on their card. Get there first and they receive the center card.",
      "Your own card doesn't count for matching, so keep your eyes on everyone else.",
    ],
    score: cards,
  },
};

/** Rules that apply to every mode. */
export const BASICS = [
  "Any two cards share exactly one symbol. There's always one match, never more.",
  "Symbols can be different sizes and turned any way. A big 🍕 and a tiny tilted 🍕 still match.",
  "Tap the shared symbol to claim it. The first correct tap wins the round.",
  `Tap a wrong symbol and your card freezes for ${CONFIG.penaltyMs / 1000} seconds.`,
  `Rooms hold 2 to ${CONFIG.maxPlayers} players. The host picks the mode in the lobby.`,
];

export const LENGTH_INFO: Record<GameLength, { name: string }> = {
  quick: { name: "Quick" },
  normal: { name: "Normal" },
  full: { name: "Full" },
};
