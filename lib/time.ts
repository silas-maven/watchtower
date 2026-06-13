export function startOfDayInTimeZone(date: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';

  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

export function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

type LocalClock = { weekday: string; minutes: number };

function clockInTimeZone(date: Date, timeZone: string): LocalClock {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return { weekday, minutes: hour * 60 + minute };
}

function isWeekday(clock: LocalClock): boolean {
  return clock.weekday !== 'Sat' && clock.weekday !== 'Sun';
}

function within(clock: LocalClock, openMinutes: number, closeMinutes: number): boolean {
  return clock.minutes >= openMinutes && clock.minutes <= closeMinutes;
}

export function isLseOpen(date = new Date()): boolean {
  const clock = clockInTimeZone(date, 'Europe/London');
  return isWeekday(clock) && within(clock, 8 * 60, 16 * 60 + 30);
}

export function isUsMarketOpen(date = new Date()): boolean {
  const clock = clockInTimeZone(date, 'America/New_York');
  return isWeekday(clock) && within(clock, 9 * 60 + 30, 16 * 60);
}

export function isAsxOpen(date = new Date()): boolean {
  const clock = clockInTimeZone(date, 'Australia/Sydney');
  return isWeekday(clock) && within(clock, 10 * 60, 16 * 60);
}

/**
 * Whether the venue an asset trades on is currently in session. Crypto is always
 * on. Currency is used as the venue proxy because that is what the data has.
 */
export function isMarketOpenForAsset(assetType: string, currency: string | null | undefined, date = new Date()): boolean {
  if (assetType === 'CRYPTO') return true;
  const ccy = (currency ?? '').toUpperCase();
  if (ccy === 'GBX' || ccy === 'GBP') return isLseOpen(date);
  if (ccy === 'EUR') return isLseOpen(date);
  if (ccy === 'AUD') return isAsxOpen(date);
  return isUsMarketOpen(date);
}
