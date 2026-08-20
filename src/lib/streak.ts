/** Day-boundary streak bookkeeping, kept separate from SRS scheduling. */

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isYesterday(a: Date, b: Date): boolean {
  const prev = new Date(b);
  prev.setDate(prev.getDate() - 1);
  return isSameDay(a, prev);
}

export function updateStreak(
  lastStudyDate: Date | null,
  currentStreak: number,
  longestStreak: number,
  now: Date = new Date(),
): { currentStreak: number; longestStreak: number; lastStudyDate: Date } {
  let nextCurrent: number;

  if (!lastStudyDate) {
    nextCurrent = 1;
  } else if (isSameDay(lastStudyDate, now)) {
    nextCurrent = currentStreak; // already studied today, no change
  } else if (isYesterday(lastStudyDate, now)) {
    nextCurrent = currentStreak + 1;
  } else {
    nextCurrent = 1; // streak broken, restart
  }

  return {
    currentStreak: nextCurrent,
    longestStreak: Math.max(longestStreak, nextCurrent),
    lastStudyDate: now,
  };
}
