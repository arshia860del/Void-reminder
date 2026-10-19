import React, { useState, useEffect } from 'react';
import { CategoryType, RecurrenceType, PriorityType } from '../types';
import {
  getCurrentJalali,
  getJalaliFromTimestamp,
  getJalaliWeekdayName,
  getDaysInJalaliMonth,
  JALALI_MONTHS_FA,
  parseLocalJalaliToUtc,
  parseLocalGregorianToUtc
} from '../lib/dates';
import { X, Calendar, Clock, Sparkles, AlertTriangle, Flame } from 'lucide-react';

interface NewReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  timezone?: string;
  initialDate?: { jy: number; jm: number; jd: number } | null;
  onSubmit: (data: {
    title: string;
    description: string;
    category: CategoryType;
    priority: PriorityType;
    targetTimestamp: number;
    recurrence: RecurrenceType;
  }) => void;
}

export const NewReminderModal: React.FC<NewReminderModalProps> = ({
  isOpen,
  onClose,
  timezone = 'Asia/Tehran',
  initialDate,
  onSubmit,
}) => {
  const currentJalali = getCurrentJalali(timezone);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryType>('general');
  const [priority, setPriority] = useState<PriorityType>('normal');
  const [calendarMode, setCalendarMode] = useState<'jalali' | 'gregorian'>('jalali');

  // Jalali Date state
  const [jYear, setJYear] = useState<number>(currentJalali.jy);
  const [jMonth, setJMonth] = useState<number>(currentJalali.jm);
  const [jDay, setJDay] = useState<number>(currentJalali.jd);

  // Time state
  const [hours, setHours] = useState('10');
  const [minutes, setMinutes] = useState('00');

  // Recurrence
  const [recurrence, setRecurrence] = useState<RecurrenceType>('once');

  // Reset or initialize when opened
  useEffect(() => {
    if (isOpen) {
      const nowJalali = getCurrentJalali(timezone);
      if (initialDate) {
        setJYear(initialDate.jy);
        setJMonth(initialDate.jm);
        setJDay(initialDate.jd);
      } else {
        setJYear(nowJalali.jy);
        setJMonth(nowJalali.jm);
        setJDay(nowJalali.jd);
      }
      const nextHour = (nowJalali.hours + 1) % 24;
      setHours(String(nextHour).padStart(2, '0'));
      setMinutes('00');
    }
  }, [isOpen, initialDate, timezone]);

  if (!isOpen) return null;

  // Clamp days whenever month changes
  const maxDays = calendarMode === 'jalali' ? getDaysInJalaliMonth(jYear, jMonth) : 31;
  const safeDay = Math.min(jDay, maxDays);

  const weekdayName = calendarMode === 'jalali'
    ? getJalaliWeekdayName(jYear, jMonth, safeDay, 'fa')
    : '';

  // Quick preset buttons
  const applyPreset = (offsetMinutes: number, setFixedTime?: { h: number; m: number; nextDay?: boolean }) => {
    const nowSec = Math.floor(Date.now() / 1000);
    if (setFixedTime) {
      const targetSec = nowSec + (setFixedTime.nextDay ? 86400 : 0);
      const j = getJalaliFromTimestamp(targetSec, timezone);
      setJYear(j.jy);
      setJMonth(j.jm);
      setJDay(j.jd);
      setHours(String(setFixedTime.h).padStart(2, '0'));
      setMinutes(String(setFixedTime.m).padStart(2, '0'));
    } else {
      const targetSec = nowSec + offsetMinutes * 60;
      const j = getJalaliFromTimestamp(targetSec, timezone);
      setJYear(j.jy);
      setJMonth(j.jm);
      setJDay(j.jd);
      setHours(String(j.hours).padStart(2, '0'));
      setMinutes(String(j.minutes).padStart(2, '0'));
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;

    let targetTimestamp = 0;
    if (calendarMode === 'jalali') {
      targetTimestamp = parseLocalJalaliToUtc(jYear, jMonth, safeDay, h, m, timezone);
    } else {
      targetTimestamp = parseLocalGregorianToUtc(jYear, jMonth, safeDay, h, m, timezone);
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      targetTimestamp,
      recurrence,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#130f1e] border border-[#3b255e] rounded-2xl p-5 shadow-2xl text-right space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#291b42]">
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-[#1e1533] text-[#a49bbd] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">ثبت یادآور جدید</h3>
            <Sparkles className="w-4 h-4 text-[#a855f7]" />
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-3.5">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs text-[#9490a6] font-medium">عنوان یادآوری *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: جلسه کاری، تماس مهم، پرداخت قبض"
              className="w-full bg-[#181326] border border-[#322352] rounded-xl px-3 py-2 text-sm text-white placeholder-[#5d5870] outline-none focus:border-[#a855f7]"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs text-[#9490a6] font-medium">توضیحات بیشتر (اختیاری)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="جزییات، شماره پیگیری، آدرس..."
              className="w-full bg-[#181326] border border-[#322352] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5d5870] outline-none focus:border-[#a855f7] resize-none"
            />
          </div>

          {/* Priority Level */}
          <div className="space-y-1.5">
            <label className="text-xs text-[#9490a6] font-medium block">سطح اولویت</label>
            <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
              <button
                type="button"
                onClick={() => setPriority('urgent')}
                className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                  priority === 'urgent'
                    ? 'bg-rose-950/60 border-rose-500 text-rose-300 font-bold shadow-md shadow-rose-950/50'
                    : 'bg-[#181326] border-[#311f42] text-[#8e89a4] hover:border-rose-900/50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>فوری</span>
                </div>
                <span className="text-[9px] text-rose-400/80">تکرار هر ۵ دقیقه</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('high')}
                className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                  priority === 'high'
                    ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-950/50'
                    : 'bg-[#181326] border-[#311f42] text-[#8e89a4] hover:border-amber-900/50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>مهم</span>
                </div>
                <span className="text-[9px] text-amber-400/80">با هشدار ویژه</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('normal')}
                className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                  priority === 'normal'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold shadow-md shadow-emerald-950/50'
                    : 'bg-[#181326] border-[#311f42] text-[#8e89a4] hover:border-emerald-900/50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>عادی</span>
                </div>
                <span className="text-[9px] text-emerald-400/80">اعلان معمول</span>
              </button>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <label className="text-xs text-[#9490a6] font-medium block">انتخاب سریع زمان</label>
            <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
              <button
                type="button"
                onClick={() => applyPreset(15)}
                className="py-1.5 px-1 bg-[#191329] border border-[#352554] rounded-lg text-[#c4bddb] hover:border-[#a855f7] active:scale-95"
              >
                ۱۵ دقیقه دیگر
              </button>
              <button
                type="button"
                onClick={() => applyPreset(60)}
                className="py-1.5 px-1 bg-[#191329] border border-[#352554] rounded-lg text-[#c4bddb] hover:border-[#a855f7] active:scale-95"
              >
                ۱ ساعت دیگر
              </button>
              <button
                type="button"
                onClick={() => applyPreset(0, { h: 9, m: 0, nextDay: true })}
                className="py-1.5 px-1 bg-[#191329] border border-[#352554] rounded-lg text-[#c4bddb] hover:border-[#a855f7] active:scale-95"
              >
                فردا صبح (۰۹:۰۰)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(0, { h: 18, m: 0, nextDay: true })}
                className="py-1.5 px-1 bg-[#191329] border border-[#352554] rounded-lg text-[#c4bddb] hover:border-[#a855f7] active:scale-95"
              >
                فردا عصر (۱۸:۰۰)
              </button>
            </div>
          </div>

          {/* Date & Time Picker */}
          <div className="p-3 rounded-xl bg-[#171224] border border-[#2b2044] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-[#a855f7]">
                <Calendar className="w-3.5 h-3.5" />
                <span>تنظیم تاریخ و ساعت دقیق</span>
              </div>

              {/* Mode switch */}
              <div className="flex items-center bg-[#110d1c] p-0.5 rounded-lg border border-[#2c2045]">
                <button
                  type="button"
                  onClick={() => setCalendarMode('jalali')}
                  className={`text-[10px] px-2 py-0.5 rounded-md ${
                    calendarMode === 'jalali'
                      ? 'bg-[#a855f7] text-white font-bold'
                      : 'text-[#87819e]'
                  }`}
                >
                  شمسی
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMode('gregorian')}
                  className={`text-[10px] px-2 py-0.5 rounded-md ${
                    calendarMode === 'gregorian'
                      ? 'bg-[#a855f7] text-white font-bold'
                      : 'text-[#87819e]'
                  }`}
                >
                  میلادی
                </button>
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-[#6b6880] block mb-1">روز</span>
                <input
                  type="number"
                  min={1}
                  max={maxDays}
                  value={safeDay}
                  onChange={(e) => setJDay(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-[#181326] border border-[#322352] rounded-lg px-2.5 py-1.5 text-xs text-white text-center font-mono outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] text-[#6b6880] block mb-1">ماه</span>
                {calendarMode === 'jalali' ? (
                  <select
                    value={jMonth}
                    onChange={(e) => setJMonth(parseInt(e.target.value, 10))}
                    className="w-full bg-[#181326] border border-[#322352] rounded-lg px-1.5 py-1.5 text-xs text-white outline-none"
                  >
                    {JALALI_MONTHS_FA.map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m} ({idx + 1})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={jMonth}
                    onChange={(e) => setJMonth(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#181326] border border-[#322352] rounded-lg px-2.5 py-1.5 text-xs text-white text-center font-mono outline-none"
                  />
                )}
              </div>

              <div>
                <span className="text-[10px] text-[#6b6880] block mb-1">سال</span>
                <input
                  type="number"
                  value={jYear}
                  onChange={(e) => setJYear(parseInt(e.target.value, 10) || currentJalali.jy)}
                  className="w-full bg-[#181326] border border-[#322352] rounded-lg px-2.5 py-1.5 text-xs text-white text-center font-mono outline-none"
                />
              </div>
            </div>

            {/* Dynamic Date Preview Badge */}
            {calendarMode === 'jalali' && (
              <div className="text-[11px] text-center text-[#c084fc] bg-[#22173d] py-1 rounded-lg border border-[#442c73] font-medium">
                🗓 {weekdayName} {safeDay} {JALALI_MONTHS_FA[jMonth - 1]} {jYear}
              </div>
            )}

            {/* Time Pickers */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#231a38]">
              <div>
                <span className="text-[10px] text-[#6b6880] block mb-1">ساعت (00 - 23)</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full bg-[#181326] border border-[#322352] rounded-lg px-2.5 py-1.5 text-xs text-white text-center font-mono outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-[#6b6880] block mb-1">دقیقه (00 - 59)</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="w-full bg-[#181326] border border-[#322352] rounded-lg px-2.5 py-1.5 text-xs text-white text-center font-mono outline-none"
                />
              </div>
            </div>
          </div>

          {/* Recurrence */}
          <div className="space-y-1">
            <label className="text-xs text-[#9490a6] font-medium">دوره‌ی تکرار</label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
              className="w-full bg-[#181326] border border-[#322352] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#a855f7]"
            >
              <option value="once">یک‌باره (بدون تکرار)</option>
              <option value="daily">روزانه (هر روز در این ساعت)</option>
              <option value="weekly">هفتگی (هر هفته در همین روز)</option>
              <option value="monthly">ماهانه (هر ماه در همین تاریخ)</option>
              <option value="yearly">سالانه (هر سال در همین روز)</option>
            </select>
          </div>

          {/* Categories */}
          <div className="space-y-1">
            <label className="text-xs text-[#9490a6] font-medium">دسته‌بندی موضوعی</label>
            <div className="grid grid-cols-4 gap-1 text-[11px] text-center">
              {[
                { key: 'general', label: '📌 عمومی' },
                { key: 'work', label: '💼 کاری' },
                { key: 'personal', label: '👤 شخصی' },
                { key: 'finance', label: '💳 مالی / قسط' },
                { key: 'shopping', label: '🛒 خرید' },
                { key: 'education', label: '📚 درسی' },
                { key: 'health', label: '💊 سلامت' },
              ].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key as CategoryType)}
                  className={`py-1.5 rounded-lg border transition-all ${
                    category === c.key
                      ? 'bg-[#a855f7] border-[#c084fc] text-white font-bold'
                      : 'bg-[#181326] border-[#30214c] text-[#8e89a4] hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#9333ea] to-[#a855f7] hover:from-[#7e22ce] hover:to-[#9333ea] text-white text-xs font-bold shadow-lg shadow-purple-950/50 transition-all active:scale-98"
            >
              ذخیره و زمان‌بندی یادآور
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-[#1b152d] border border-[#322352] text-xs text-[#9d97b5] hover:text-white"
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
