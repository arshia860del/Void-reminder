export const JALALI_MONTHS_FA = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
];

export const JALALI_MONTHS_EN = [
  'Farvardin', 'Ordibehesht', 'Khordad',
  'Tir', 'Mordad', 'Shahrivar',
  'Mehr', 'Aban', 'Azar',
  'Dey', 'Bahman', 'Esfand'
];

export const GREGORIAN_MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const JALALI_WEEKDAYS_FA = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه'
];

export const JALALI_WEEKDAYS_SHORT_FA = [
  'ش',
  'ی',
  'د',
  'س',
  'چ',
  'پ',
  'ج'
];

export const GREGORIAN_WEEKDAYS_EN = [
  'Saturday',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday'
];

export const TIMEZONE_OFFSETS: Record<string, number> = {
  'Asia/Tehran': 210, // UTC+3:30 in minutes
  'Asia/Dubai': 240,
  'UTC': 0,
  'Europe/London': 0,
  'Europe/Berlin': 60,
  'Europe/Istanbul': 180,
  'America/New_York': -300,
  'America/Los_Angeles': -480,
};

export function getTimezoneOffsetMinutes(timezone = 'Asia/Tehran'): number {
  return TIMEZONE_OFFSETS[timezone] !== undefined ? TIMEZONE_OFFSETS[timezone] : 210;
}

export function gregorianToJalali(gy: number, gm: number, gd: number) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number, jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number) {
  const jy2 = jy - 979;
  let j_day_no = 365 * jy2 + Math.floor(jy2 / 33) * 8 + Math.floor(((jy2 % 33) + 3) / 4);
  for (let i = 0; i < jm - 1; ++i) {
    j_day_no += (i < 6) ? 31 : 30;
  }
  j_day_no += jd - 1;

  let g_day_no = j_day_no + 79;
  let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
  g_day_no = g_day_no % 146097;

  let leap = true;
  if (g_day_no >= 36525) {
    g_day_no--;
    gy += 100 * Math.floor(g_day_no / 36524);
    g_day_no = g_day_no % 36524;
    if (g_day_no >= 365) {
      g_day_no++;
    } else {
      leap = false;
    }
  }

  gy += 4 * Math.floor(g_day_no / 1461);
  g_day_no %= 1461;

  if (g_day_no >= 366) {
    leap = false;
    g_day_no--;
    gy += Math.floor(g_day_no / 365);
    g_day_no = g_day_no % 365;
  }

  const g_days_in_month = [31, (leap ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 12 && g_day_no >= g_days_in_month[gm]) {
    g_day_no -= g_days_in_month[gm];
    gm++;
  }
  return { gy, gm: gm + 1, gd: g_day_no + 1 };
}

/**
 * Checks if a given Jalali year is a leap year (کبیسه).
 */
export function isJalaliLeapYear(jy: number): boolean {
  const g = jalaliToGregorian(jy, 12, 30);
  const j = gregorianToJalali(g.gy, g.gm, g.gd);
  return j.jy === jy && j.jm === 12 && j.jd === 30;
}

/**
 * Returns exact number of days in a given Jalali month (considering leap year for Esfand).
 */
export function getDaysInJalaliMonth(jy: number, jm: number): number {
  if (jm < 1 || jm > 12) return 30;
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

/**
 * Returns Persian weekday index:
 * 0: شنبه (Saturday)
 * 1: یکشنبه (Sunday)
 * 2: دوشنبه (Monday)
 * 3: سه‌شنبه (Tuesday)
 * 4: چهارشنبه (Wednesday)
 * 5: پنج‌شنبه (Thursday)
 * 6: جمعه (Friday)
 */
export function getJalaliWeekday(jy: number, jm: number, jd: number): number {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  const d = new Date(Date.UTC(gy, gm - 1, gd));
  return (d.getUTCDay() + 1) % 7;
}

export function getJalaliWeekdayName(jy: number, jm: number, jd: number, lang = 'fa'): string {
  const weekday = getJalaliWeekday(jy, jm, jd);
  return lang === 'fa' ? JALALI_WEEKDAYS_FA[weekday] : GREGORIAN_WEEKDAYS_EN[weekday];
}

/**
 * Get current Jalali date with user timezone applied.
 */
export function getCurrentJalali(timezone = 'Asia/Tehran') {
  const offsetSec = getTimezoneOffsetMinutes(timezone) * 60;
  const localDate = new Date(Date.now() + offsetSec * 1000);
  const { jy, jm, jd } = gregorianToJalali(
    localDate.getUTCFullYear(),
    localDate.getUTCMonth() + 1,
    localDate.getUTCDate()
  );
  return {
    jy,
    jm,
    jd,
    hours: localDate.getUTCHours(),
    minutes: localDate.getUTCMinutes(),
    weekday: getJalaliWeekday(jy, jm, jd),
    weekdayName: JALALI_WEEKDAYS_FA[getJalaliWeekday(jy, jm, jd)],
  };
}

/**
 * Extract Jalali date from UTC timestamp using timezone.
 */
export function getJalaliFromTimestamp(utcTimestamp: number, timezone = 'Asia/Tehran') {
  const offsetSec = getTimezoneOffsetMinutes(timezone) * 60;
  const localDate = new Date((utcTimestamp + offsetSec) * 1000);
  const { jy, jm, jd } = gregorianToJalali(
    localDate.getUTCFullYear(),
    localDate.getUTCMonth() + 1,
    localDate.getUTCDate()
  );
  return {
    jy,
    jm,
    jd,
    hours: localDate.getUTCHours(),
    minutes: localDate.getUTCMinutes(),
    weekday: getJalaliWeekday(jy, jm, jd),
    weekdayName: JALALI_WEEKDAYS_FA[getJalaliWeekday(jy, jm, jd)],
  };
}

export function formatJalaliDate(utcTimestamp: number, includeTime = true, timezone = 'Asia/Tehran'): string {
  const offsetSec = getTimezoneOffsetMinutes(timezone) * 60;
  const localDate = new Date((utcTimestamp + offsetSec) * 1000);

  const { jy, jm, jd } = gregorianToJalali(
    localDate.getUTCFullYear(),
    localDate.getUTCMonth() + 1,
    localDate.getUTCDate()
  );
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${jy}/${pad(jm)}/${pad(jd)}`;
  if (!includeTime) return dateStr;
  return `${dateStr} ${pad(localDate.getUTCHours())}:${pad(localDate.getUTCMinutes())}`;
}

export function formatFullJalaliDate(utcTimestamp: number, timezone = 'Asia/Tehran'): string {
  const j = getJalaliFromTimestamp(utcTimestamp, timezone);
  const monthName = JALALI_MONTHS_FA[j.jm - 1];
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${j.weekdayName} ${j.jd} ${monthName} ${j.jy} - ${pad(j.hours)}:${pad(j.minutes)}`;
}

export function formatGregorianDate(utcTimestamp: number, includeTime = true, timezone = 'Asia/Tehran'): string {
  const offsetSec = getTimezoneOffsetMinutes(timezone) * 60;
  const localDate = new Date((utcTimestamp + offsetSec) * 1000);

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${localDate.getUTCFullYear()}-${pad(localDate.getUTCMonth() + 1)}-${pad(localDate.getUTCDate())}`;
  if (!includeTime) return dateStr;
  return `${dateStr} ${pad(localDate.getUTCHours())}:${pad(localDate.getUTCMinutes())}`;
}

export function parseLocalJalaliToUtc(jy: number, jm: number, jd: number, h: number, m: number, timezone = 'Asia/Tehran'): number {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  const naiveUtc = Date.UTC(gy, gm - 1, gd, h, m, 0);
  const offsetSec = getTimezoneOffsetMinutes(timezone) * 60;
  return Math.floor(naiveUtc / 1000) - offsetSec;
}

export function parseLocalGregorianToUtc(gy: number, gm: number, gd: number, h: number, m: number, timezone = 'Asia/Tehran'): number {
  const naiveUtc = Date.UTC(gy, gm - 1, gd, h, m, 0);
  const offsetSec = getTimezoneOffsetMinutes(timezone) * 60;
  return Math.floor(naiveUtc / 1000) - offsetSec;
}

export function getRelativeTimeText(targetSeconds: number, lang = 'fa'): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = targetSeconds - now;
  const isPast = diff < 0;
  const absDiff = Math.abs(diff);

  const mins = Math.floor(absDiff / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (lang === 'fa') {
    if (absDiff < 60) return isPast ? 'هم‌اکنون' : 'کمتر از ۱ دقیقه دیگر';
    if (mins < 60) return isPast ? `${mins} دقیقه پیش` : `${mins} دقیقه دیگر`;
    if (hours < 24) return isPast ? `${hours} ساعت پیش` : `${hours} ساعت دیگر`;
    return isPast ? `${days} روز پیش` : `${days} روز دیگر`;
  } else {
    if (absDiff < 60) return isPast ? 'Just now' : 'in < 1m';
    if (mins < 60) return isPast ? `${mins}m ago` : `in ${mins}m`;
    if (hours < 24) return isPast ? `${hours}h ago` : `in ${hours}h`;
    return isPast ? `${days}d ago` : `in ${days}d`;
  }
}
