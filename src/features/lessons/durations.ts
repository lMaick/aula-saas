export const allowedLessonDurations = [30, 45, 60, 90, 120] as const;

export type LessonDuration = (typeof allowedLessonDurations)[number];

export function isAllowedLessonDuration(value: number): value is LessonDuration {
  return allowedLessonDurations.includes(value as LessonDuration);
}
