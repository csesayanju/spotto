import { createContext, useContext } from "react";
import { THEMES } from "../assets/symbols";
import type { SymbolTheme } from "../shared/types";

/** The current room's symbol theme; classic outside rooms (Practice, Daily, How to play on Home). */
export const ThemeContext = createContext<SymbolTheme>("classic");

/** Emoji for each symbol id in the current theme. */
export function useSymbols(): readonly string[] {
  return THEMES[useContext(ThemeContext)];
}
