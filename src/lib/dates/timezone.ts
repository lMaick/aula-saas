const dateKeyFormatter = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  let value = dateKeyFormatter.get(timeZone);
  if (!value) {
    value = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    dateKeyFormatter.set(timeZone, value);
  }
  return value;
}

function zonedParts(date: Date, timeZone: string) {
  const parts = formatter(timeZone).formatToParts(date);
  return Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]),
  ) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
}

export function localDateTimeToUtc(value: string, timeZone: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  if (
    new Date(guess).getUTCFullYear() !== year ||
    new Date(guess).getUTCMonth() !== month - 1 ||
    new Date(guess).getUTCDate() !== day
  ) return null;

  let result = guess;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = zonedParts(new Date(result), timeZone);
    const renderedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    result -= renderedAsUtc - guess;
  }

  const check = zonedParts(new Date(result), timeZone);
  if (
    check.year !== year || check.month !== month || check.day !== day ||
    check.hour !== hour || check.minute !== minute
  ) return null;
  return new Date(result);
}

export function utcToLocalInput(value: string | Date, timeZone: string) {
  const parts = zonedParts(new Date(value), timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function localDateKey(value: string | Date, timeZone: string) {
  return utcToLocalInput(value, timeZone).slice(0, 10);
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function startOfWeekDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDaysToDateKey(dateKey, -(weekday === 0 ? 6 : weekday - 1));
}

export function localDayRange(dateKey: string, timeZone: string) {
  const start = localDateTimeToUtc(`${dateKey}T00:00`, timeZone);
  const end = localDateTimeToUtc(`${addDaysToDateKey(dateKey, 1)}T00:00`, timeZone);
  if (!start || !end) throw new Error("Data local inválida.");
  return { start, end };
}

export function formatLessonDate(value: string | Date, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function formatLessonTime(value: string | Date, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

export function durationInMinutes(startsAt: string, endsAt: string) {
  return Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000);
}

export function intervalsOverlap(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
) {
  return firstStart < secondEnd && firstEnd > secondStart;
}
