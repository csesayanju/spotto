import type { GameMode } from "../shared/types";
import type { ModeRules } from "./rules";
import { tower } from "./modes/tower";

export const MODES: Record<GameMode, ModeRules> = { tower };
