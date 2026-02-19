import { Colors } from "@/constants/colors";

/**
 * Shared status style mappings for match/tournament badges.
 * Returns color values (not NativeWind class names) for use with StyleSheet.
 */
export const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  pending: {
    bg: Colors.status.pending.bg,
    text: Colors.status.pending.text,
    border: Colors.status.pending.border,
  },
  scheduled: {
    bg: Colors.status.pending.bg,
    text: Colors.status.pending.text,
    border: Colors.status.pending.border,
  },
  live: {
    bg: Colors.status.live.bg,
    text: Colors.status.live.text,
    border: Colors.status.live.border,
  },
  completed: {
    bg: Colors.status.completed.bg,
    text: Colors.status.completed.text,
    border: Colors.status.completed.border,
  },
  bye: {
    bg: Colors.status.pending.bg,
    text: Colors.status.pending.text,
    border: Colors.status.pending.border,
  },
};
