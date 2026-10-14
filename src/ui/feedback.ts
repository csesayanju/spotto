import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

/** Feedback Layer: haptics now; sounds and animations to come. */
export async function buzzWrong() {
  try { await Haptics.notification({ type: NotificationType.Error }); }
  catch { navigator.vibrate?.(200); }
}

export async function buzzWin() {
  try { await Haptics.impact({ style: ImpactStyle.Medium }); }
  catch { navigator.vibrate?.(40); }
}

// TODO: playSound("win" | "wrong" | "start") using small bundled audio files
