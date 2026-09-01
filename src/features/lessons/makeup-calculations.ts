export function availablePackageLessons(totalLessons: number, usedLessons: number, reservedLessons: number) {
  return Math.max(0, totalLessons - usedLessons - reservedLessons);
}

export function isMakeupNearEnd(totalLessons: number, usedLessons: number, reservedLessons: number) {
  const available = availablePackageLessons(totalLessons, usedLessons, reservedLessons);
  return available > 0 && available <= 2;
}
