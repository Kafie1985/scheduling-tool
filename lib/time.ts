export const BUSINESS_TIME_ZONE = "America/Denver";
export const BUSINESS_TIME_LABEL = "Mountain Time";

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function zonedParts(
  date: Date,
  timeZone = BUSINESS_TIME_ZONE,
): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) => {
    const value = parts.find((part) => part.type === type)?.value;
    return Number(value);
  };

  let hour = read("hour");
  let day = read("day");
  let month = read("month");
  let year = read("year");

  // Some engines report midnight as 24:00 on the previous civil day.
  if (hour === 24) {
    hour = 0;
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    year = next.getUTCFullYear();
    month = next.getUTCMonth() + 1;
    day = next.getUTCDate();
  }

  return {
    year,
    month,
    day,
    hour,
    minute: read("minute"),
    second: read("second"),
  };
}

export function todayKey(now = new Date()): string {
  const parts = zonedParts(now);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function parseKey(key: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) {
    throw new Error("Invalid calendar day.");
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function addDays(key: string, days: number): string {
  const { year, month, day } = parseKey(key);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addMonths(key: string, count: number): string {
  const { year, month, day } = parseKey(key);
  const shifted = new Date(Date.UTC(year, month - 1 + count, 1));
  const lastDay = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const clamped = Math.min(day, lastDay);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(clamped)}`;
}

export function startOfWeek(key: string): string {
  const { year, month, day } = parseKey(key);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDays(key, -weekday);
}

export function monthGrid(cursor: string): string[] {
  const gridStart = startOfWeek(`${cursor.slice(0, 7)}-01`);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function isSameMonth(key: string, cursor: string): boolean {
  return key.slice(0, 7) === cursor.slice(0, 7);
}

export function dateKeyFromIso(iso: string): string {
  const parts = zonedParts(new Date(iso));
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatMonthLabel(cursor: string): string {
  const { year, month, day } = parseKey(`${cursor.slice(0, 7)}-01`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatWeekLabel(cursor: string): string {
  const start = parseKey(startOfWeek(cursor));
  const endKey = addDays(startOfWeek(cursor), 6);
  const end = parseKey(endKey);
  const month = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const startMonth = month.format(new Date(Date.UTC(start.year, start.month - 1, 1)));
  const endMonth = month.format(new Date(Date.UTC(end.year, end.month - 1, 1)));

  if (start.year === end.year && start.month === end.month) {
    return `${startMonth} ${start.day} – ${end.day}, ${end.year}`;
  }
  if (start.year === end.year) {
    return `${startMonth} ${start.day} – ${endMonth} ${end.day}, ${end.year}`;
  }
  return `${startMonth} ${start.day}, ${start.year} – ${endMonth} ${end.day}, ${end.year}`;
}

export function formatDayHeading(key: string): string {
  const { year, month, day } = parseKey(key);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function weekdayLabel(key: string): string {
  const { year, month, day } = parseKey(key);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function dayNumber(key: string): number {
  return parseKey(key).day;
}

/**
 * Convert a `datetime-local` value in Mountain Time to a UTC ISO string.
 * Returns null when the clock time does not exist (spring-forward gap).
 */
export function denverLocalToIso(local: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59
  ) {
    return null;
  }

  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  const wall = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utc = new Date(wall);
  for (let pass = 0; pass < 2; pass += 1) {
    const zoned = zonedParts(utc);
    const zonedAsUtc = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      zoned.second,
    );
    const offset = zonedAsUtc - utc.getTime();
    utc = new Date(wall - offset);
  }

  const back = zonedParts(utc);
  if (
    back.year !== year ||
    back.month !== month ||
    back.day !== day ||
    back.hour !== hour ||
    back.minute !== minute
  ) {
    return null;
  }

  return utc.toISOString();
}

export function defaultRange(now = new Date()): { start: string; end: string } {
  const parts = zonedParts(now);
  let hour = parts.minute === 0 && parts.second === 0 ? parts.hour : parts.hour + 1;
  let key = todayKey(now);
  if (hour >= 24) {
    hour -= 24;
    key = addDays(key, 1);
  }
  const start = `${key}T${pad(hour)}:00`;
  let endHour = hour + 1;
  let endKey = key;
  if (endHour >= 24) {
    endHour -= 24;
    endKey = addDays(key, 1);
  }
  return { start, end: `${endKey}T${pad(endHour)}:00` };
}
