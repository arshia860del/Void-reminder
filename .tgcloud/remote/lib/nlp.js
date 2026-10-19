import { getTimezoneOffsetMinutes, gregorianToJalali, jalaliToGregorian } from './dates.js';

function normalizePersianText(str) {
  if (!str) return '';
  const faDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  let s = str;
  for (let i = 0; i < 10; i++) {
    s = s.replaceAll(faDigits[i], String(i)).replaceAll(arDigits[i], String(i));
  }
  return s.trim();
}

/**
 * Intelligent natural language parser for Persian reminder requests.
 * Examples:
 *   - "فردا ساعت ۱۸ جلسه کاری"
 *   - "امروز ساعت ۲۰:۳۰ خرید نان"
 *   - "۱۰ دقیقه دیگه زنگ زدن به علی فوری"
 *   - "پس‌فردا ساعت ۹ صبح پرداخت قسط"
 *   - "ساعت ۵ بعدازظهر جلسه"
 */
export function parseNaturalLanguageReminder(rawText, timezone = 'Asia/Tehran') {
  if (!rawText || rawText.startsWith('/')) return null;

  const text = normalizePersianText(rawText);
  const now = new Date();
  const offsetSec = getTimezoneOffsetMinutes(timezone) * 60;
  const localNow = new Date(now.getTime() + offsetSec * 1000);

  let targetTimestamp = null;
  let cleanTitle = text;
  let priority = 'normal';

  // 1. Detect Priority keywords
  if (/فوری|اضطراری|اورژانسی|سریع|🔴/i.test(cleanTitle)) {
    priority = 'urgent';
    cleanTitle = cleanTitle.replace(/فوری|اضطراری|اورژانسی|سریع|🔴/g, '');
  } else if (/مهم|ضروری|با اهمیت|🟡/i.test(cleanTitle)) {
    priority = 'high';
    cleanTitle = cleanTitle.replace(/مهم|ضروری|با اهمیت|🟡/g, '');
  }

  // 2. Relative minutes or hours ("۱۰ دقیقه دیگه", "۱ ساعت بعد")
  const relMinMatch = text.match(/(\d+)\s*(دقیقه|دقیقه\s*ی|دقیقه\s*دیگه|دقیقه\s*دیگر|دقیقه\s*بعد)/);
  const relHourMatch = text.match(/(\d+)\s*(ساعت|ساعت\s*دیگه|ساعت\s*دیگر|ساعت\s*بعد)/);

  if (relMinMatch) {
    const mins = parseInt(relMinMatch[1], 10);
    if (mins > 0 && mins <= 1440) {
      targetTimestamp = Math.floor(now.getTime() / 1000) + mins * 60;
      cleanTitle = cleanTitle.replace(relMinMatch[0], '');
    }
  } else if (relHourMatch) {
    const hours = parseInt(relHourMatch[1], 10);
    if (hours > 0 && hours <= 72) {
      targetTimestamp = Math.floor(now.getTime() / 1000) + hours * 3600;
      cleanTitle = cleanTitle.replace(relHourMatch[0], '');
    }
  }

  // 3. Day and Time expressions
  if (!targetTimestamp) {
    let dayOffset = 0;
    let dayMatched = false;

    if (/پس\s*فردا|پسفردا/.test(text)) {
      dayOffset = 2;
      dayMatched = true;
      cleanTitle = cleanTitle.replace(/پس\s*فردا|پسفردا/g, '');
    } else if (/فردا/.test(text)) {
      dayOffset = 1;
      dayMatched = true;
      cleanTitle = cleanTitle.replace(/فردا/g, '');
    } else if (/امروز/.test(text)) {
      dayOffset = 0;
      dayMatched = true;
      cleanTitle = cleanTitle.replace(/امروز/g, '');
    }

    // Time matching (e.g. "ساعت ۱۷:۳۰", "ساعت ۵ عصر", "ساعت ۸ شب", "۹:۰۰")
    let targetHour = null;
    let targetMinute = 0;

    const timeRegex = /(?:ساعت\s*)?(\d{1,2})(?::(\d{2}))?\s*(صبح|عصر|بعد\s*از\s*ظهر|ظهر|شب)?/i;
    const timeMatch = text.match(timeRegex);

    if (timeMatch && (timeMatch[0].includes('ساعت') || timeMatch[2] || dayMatched)) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const period = timeMatch[3] || '';

      if (/عصر|بعد\s*از\s*ظهر|شب/.test(period) && h < 12) {
        h += 12;
      } else if (/صبح/.test(period) && h === 12) {
        h = 0;
      }

      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        targetHour = h;
        targetMinute = m;
        cleanTitle = cleanTitle.replace(timeMatch[0], '');
      }
    }

    if (targetHour !== null) {
      const targetLocalDate = new Date(localNow.getTime() + dayOffset * 86400 * 1000);
      const gy = targetLocalDate.getUTCFullYear();
      const gm = targetLocalDate.getUTCMonth();
      const gd = targetLocalDate.getUTCDate();

      const naiveUtc = Date.UTC(gy, gm, gd, targetHour, targetMinute, 0);
      targetTimestamp = Math.floor(naiveUtc / 1000) - offsetSec;

      // If no day was specified and the time already passed today, assume tomorrow!
      if (!dayMatched && targetTimestamp < Math.floor(now.getTime() / 1000)) {
        targetTimestamp += 86400;
      }
    }
  }

  // Cleanup title
  cleanTitle = cleanTitle
    .replace(/(?:دیگه|دیگر|بعد)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[,،:;\-\s]+|[,،:;\-\s]+$/g, '')
    .trim();

  // If we found a valid timestamp and non-empty title (or fallback title)
  if (targetTimestamp && targetTimestamp > Math.floor(now.getTime() / 1000)) {
    return {
      title: cleanTitle || 'یادآوری',
      targetTimestamp,
      priority,
    };
  }

  return null;
}
