export function nowJakarta(): Date {
  const now = new Date();
  const jakartaOffset = 7 * 60;
  const localOffset = now.getTimezoneOffset();
  const diffMs = (jakartaOffset + localOffset) * 60 * 1000;
  return new Date(now.getTime() + diffMs);
}

export function getJakartaHour(): number {
  return nowJakarta().getHours();
}

export function getJakartaDate(): Date {
  return nowJakarta();
}

export function formatJakartaTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
}

export function formatJakartaDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
  });
}

export function formatJakartaDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta',
  });
}

export const OVERTIME_HOUR = 18;
export const LATE_THRESHOLD_HOUR = 8;
export const WORK_START_HOUR = 8;
export const COOLDOWN_MINUTES = 20;
