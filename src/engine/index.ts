import type { GameMode } from "../shared/types";
import type { ModeRules } from "./rules";
import { gift } from "./modes/gift";
import { tower } from "./modes/tower";
import { well } from "./modes/well";

export const MODES: Record<GameMode, ModeRules> = { tower, well, gift };
