/**
 * Jalali (Solar Hijri) and Gregorian date utility for TGCloud Serverless.
 * Fully timezone-aware (handles Asia/Tehran +03:30 and custom offsets with minute-level precision).
 */

export const JALALI_MONTH_NAMES_FA = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
];

export const JALALI_MONTH_NAMES_EN = [
  'Farvardin', 'Ordibehesht', 'Khordad',
  'Tir', 'Mordad', 'Shahrivar',
  'Mehr', 'Aban', 'Azar',
  'Dey', 'Bahman', 'Esfand'
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

export const TIMEZONE_OFFSETS = {
  'Asia/Tehran': 210, // UTC+3:30 in minutes
  'Asia/Dubai': 240,  // UTC+4:00
  'UTC': 0,
  'Europe/London': 0,
  'Europe/Berlin': 60,
  'Europe/Istanbul': 180,
  'America/New_York': -300,
  'America/Los_Angeles': -480,
};

export function getTimezoneOffsetMinutes(timezone = 'Asia/Tehran') {
  return TIMEZONE_OFFSETS[timezone] !== undefined ? TIMEZONE_OFFSETS[timezone] : 210;
}

/**
 * Converts Gregorian date to Jalali date
 */
export function gregorianToJalali(gy, gm, gd) {
  gy = parseInt(gy, 10);
  gm = parseInt(gm, 10);
  gd = parseInt(gd, 10);

  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm, jd;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

/**
 * Converts Jalali date to Gregorian date
 */
export function jalaliToGregorian(jy, jm, jd) {
  jy = parseInt(jy, 10);
  jm = parseInt(jm, 10);
  jd = parseInt(jd, 10);

  let jy2 = jy - 979;
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
export function isJalaliLeapYear(jy) {
  const g = jalaliToGregorian(jy, 12, 30);
  const j = gregorianToJalali(g.gy, g.gm, g.gd);
  return j.jy === jy && j.jm === 12 && j.jd === 30;
}

/**
 * Returns exact number of days in a given Jalali month (considering leap year for Esfand).
 */
export function getDaysInJalaliMonth(jy, jm) {
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
export function getJalaliWeekday(jy, jm, jd) {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  const d = new Date(Date.UTC(gy, gm - 1, gd));
  return (d.getUTCDay() + 1) % 7;
}

export function getJalaliWeekdayName(jy, jm, jd) {
  const weekday = getJalaliWeekday(jy, jm, jd);
  return JALALI_WEEKDAYS_FA[weekday];
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
 * Returns formatted Jalali date string in user's timezone: YYYY/MM/DD HH:mm
 */
export function formatJalali(utcTimestampSeconds, includeTime = true, timezone = 'Asia/Tehran') {
  const offsetSec = getTimezoneOffsetMinutes(timezone) * 60;
  const localDate = new Date((utcTimestampSeconds + offsetSec) * 1000);

  const { jy, jm, jd } = gregorianToJalali(
    localDate.getUTCFullYear(),
    localDate.getUTCMonth() + 1,
    localDate.getUTCDate()
  );
  const pad = (n) => String(n).padStart(2, '0');
  const datePart = `${jy}/${pad(jm)}/${pad(jd)}`;
  if (!includeTime) return datePart;
  const timePart = `${pad(localDate.getUTCHours())}:${pad(localDate.getUTCMinutes())}`;
  return `${datePart} ${timePart}`;
}

/**
 * Returns formatted Gregorian date string in user's timezone: YYYY-MM-DD HH:mm
 */
export function formatGregorian(utcTimestampSeconds, includeTime = true, timezone = 'Asia/Tehran') {
  const offsetSec = getTimezoneOffsetMinutes(timezone) * 60;
  const localDate = new Date((utcTimestampSeconds + offsetSec) * 1000);

  const pad = (n) => String(n).padStart(2, '0');
  const datePart = `${localDate.getUTCFullYear()}-${pad(localDate.getUTCMonth() + 1)}-${pad(localDate.getUTCDate())}`;
  if (!includeTime) return datePart;
  const timePart = `${pad(localDate.getUTCHours())}:${pad(localDate.getUTCMinutes())}`;
  return `${datePart} ${timePart}`;
}

/**
 * Parses Jalali string like "1405/07/28 14:30" into canonical UTC epoch seconds
 * using the user's specific timezone (default: Asia/Tehran +03:30).
 */
export function parseJalaliToTimestamp(dateStr, timeStr = '12:00', timezone = 'Asia/Tehran') {
  if (!dateStr) return null;
  const cleanDate = dateStr.replace(/[^\d/]/g, '').trim();
  const parts = cleanDate.split('/');
  if (parts.length !== 3) return null;

  const jy = parseInt(parts[0], 10);
  const jm = parseInt(parts[1], 10);
  const jd = parseInt(parts[2], 10);

  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;

  const cleanTime = timeStr.replace(/[^\d:]/g, '').trim();
  const timeParts = cleanTime.split(':');
  const hours = timeParts[0] ? parseInt(timeParts[0], 10) : 0;
  const minutes = timeParts[1] ? parseInt(timeParts[1], 10) : 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  const naiveUtc = Date.UTC(gy, gm - 1, gd, hours, minutes, 0);

  // Subtract user timezone offset to convert local time to exact UTC epoch
  const offsetSec = getTimezoneOffsetMinutes(timezone) * 60;
  const exactUtcSeconds = Math.floor(naiveUtc / 1000) - offsetSec;

  return exactUtcSeconds;
}

export function parseGregorianToTimestamp(dateStr, timeStr = '12:00', timezone = 'Asia/Tehran') {
  if (!dateStr) return null;
  const parts = dateStr.replace(/[^\d-]/g, '').split('-');
  if (parts.length !== 3) return null;

  const gy = parseInt(parts[0], 10);
  const gm = parseInt(parts[1], 10);
  const gd = parseInt(parts[2], 10);

  const timeParts = timeStr.replace(/[^\d:]/g, '').split(':');
  const hours = timeParts[0] ? parseInt(timeParts[0], 10) : 0;
  const minutes = timeParts[1] ? parseInt(timeParts[1], 10) : 0;

  const naiveUtc = Date.UTC(gy, gm - 1, gd, hours, minutes, 0);
  const offsetSec = getTimezoneOffsetMinutes(timezone) * 60;
  return Math.floor(naiveUtc / 1000) - offsetSec;
}

/**
 * Calculates next timestamp based on recurrence rule (supports Jalali and Gregorian).
 */
export function calculateNextRecurrence(currentTimestamp, recurrence, calendarType = 'jalali', timezone = 'Asia/Tehran') {
  if (recurrence === 'daily') {
    return currentTimestamp + 86400;
  }
  if (recurrence === 'weekly') {
    return currentTimestamp + 7 * 86400;
  }

  const offsetSec = getTimezoneOffsetMinutes(timezone) * 60;
  const localDate = new Date((currentTimestamp + offsetSec) * 1000);

  if (calendarType === 'jalali') {
    let { jy, jm, jd } = gregorianToJalali(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth() + 1,
      localDate.getUTCDate()
    );
    const h = localDate.getUTCHours();
    const m = localDate.getUTCMinutes();

    if (recurrence === 'monthly') {
      jm += 1;
      if (jm > 12) {
        jy += 1;
        jm = 1;
      }
      const maxDays = getDaysInJalaliMonth(jy, jm);
      if (jd > maxDays) jd = maxDays;
    } else if (recurrence === 'yearly') {
      jy += 1;
      const maxDays = getDaysInJalaliMonth(jy, jm);
      if (jd > maxDays) jd = maxDays;
    } else {
      return null;
    }

    const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
    const naiveUtc = Date.UTC(gy, gm - 1, gd, h, m, 0);
    return Math.floor(naiveUtc / 1000) - offsetSec;
  } else {
    const d = new Date(localDate.getTime());
    if (recurrence === 'monthly') {
      d.setUTCMonth(d.getUTCMonth() + 1);
    } else if (recurrence === 'yearly') {
      d.setUTCFullYear(d.getUTCFullYear() + 1);
    } else {
      return null;
    }
    return Math.floor(d.getTime() / 1000) - offsetSec;
  }
}

/**
 * Human readable relative description (e.g., "۱۰ دقیقه بعد", "فردا", "منقضی شده")
 */
export function getRelativeTimeDescription(targetSeconds, nowSeconds, lang = 'fa') {
  const diff = targetSeconds - nowSeconds;
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
    if (absDiff < 60) return isPast ? 'Just now' : 'In less than a minute';
    if (mins < 60) return isPast ? `${mins}m ago` : `in ${mins}m`;
    if (hours < 24) return isPast ? `${hours}h ago` : `in ${hours}h`;
    return isPast ? `${days}d ago` : `in ${days}d`;
  }
}
