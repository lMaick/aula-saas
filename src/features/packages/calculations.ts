export function packageProgress(totalLessons: number, usedLessons: number) {
  const remaining = Math.max(0, totalLessons - usedLessons);
  const percentage = totalLessons > 0
    ? Math.min(100, Math.round((usedLessons / totalLessons) * 100))
    : 0;
  return {
    remaining,
    percentage,
    nearEnd: remaining > 0 && remaining <= 2,
    completed: remaining === 0,
  };
}
