import React, { useState } from 'react';
import { Reminder } from '../types';
import {
  getCurrentJalali,
  getJalaliFromTimestamp,
  getJalaliWeekday,
  getDaysInJalaliMonth,
  isJalaliLeapYear,
  jalaliToGregorian,
  JALALI_MONTHS_FA,
  JALALI_WEEKDAYS_FA,
  JALALI_WEEKDAYS_SHORT_FA
} from '../lib/dates';
import {
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Clock,
  Calendar as CalendarIcon,
  RotateCcw,
  Plus
} from 'lucide-react';

interface CalendarViewProps {
  reminders: Reminder[];
  onOpenNewModal: (presetDate?: { jy: number; jm: number; jd: number }) => void;
  timezone?: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  reminders,
  onOpenNewModal,
  timezone = 'Asia/Tehran'
}) => {
  const currentJalali = getCurrentJalali(timezone);

  const [jYear, setJYear] = useState<number>(currentJalali.jy);
  const [jMonth, setJMonth] = useState<number>(currentJalali.jm);
  const [selectedDay, setSelectedDay] = useState<number>(currentJalali.jd);

  // Month navigation
  const prevMonth = () => {
    if (jMonth === 1) {
      setJYear(jYear - 1);
      setJMonth(12);
    } else {
      setJMonth(jMonth - 1);
    }
  };

  const nextMonth = () => {
    if (jMonth === 12) {
      setJYear(jYear + 1);
      setJMonth(1);
    } else {
      setJMonth(jMonth + 1);
    }
  };

  const prevYear = () => setJYear(jYear - 1);
  const nextYear = () => setJYear(jYear + 1);

  const goToToday = () => {
    setJYear(currentJalali.jy);
    setJMonth(currentJalali.jm);
    setSelectedDay(currentJalali.jd);
  };

  // Determine days in current Jalali month (takes leap year into account for Esfand)
  const daysInMonth = getDaysInJalaliMonth(jYear, jMonth);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Calculate weekday offset for the 1st day of the selected month
  // 0: شنبه, 1: یکشنبه, ..., 6: جمعه
  const firstDayWeekday = getJalaliWeekday(jYear, jMonth, 1);
  const emptyPaddingSlots = Array.from({ length: firstDayWeekday }, (_, i) => i);

  // Days in previous month for subtle date background
  const prevMonthDaysCount = getDaysInJalaliMonth(
    jMonth === 1 ? jYear - 1 : jYear,
    jMonth === 1 ? 12 : jMonth - 1
  );

  // Check which days have reminders
  const remindersByDay: Record<number, Reminder[]> = {};
  reminders.forEach((r) => {
    const j = getJalaliFromTimestamp(r.targetTimestamp, timezone);
    if (j.jy === jYear && j.jm === jMonth) {
      if (!remindersByDay[j.jd]) remindersByDay[j.jd] = [];
      remindersByDay[j.jd].push(r);
    }
  });

  // Clamp selectedDay if month has fewer days
  const effectiveSelectedDay = Math.min(selectedDay, daysInMonth);
  const selectedDayReminders = remindersByDay[effectiveSelectedDay] || [];

  // Selected day info
  const selectedDayWeekday = getJalaliWeekday(jYear, jMonth, effectiveSelectedDay);
  const selectedDayWeekdayName = JALALI_WEEKDAYS_FA[selectedDayWeekday];
  const selectedGregorian = jalaliToGregorian(jYear, jMonth, effectiveSelectedDay);
  const selectedGregorianDate = new Date(Date.UTC(selectedGregorian.gy, selectedGregorian.gm - 1, selectedGregorian.gd));
  const gregorianOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const gregorianFormatted = selectedGregorianDate.toLocaleDateString('en-US', gregorianOptions);

  const isLeap = isJalaliLeapYear(jYear);

  return (
    <div className="space-y-4">
      {/* Today Banner */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-[#20153b] via-[#1a1230] to-[#120e24] border border-[#3b255e]/60 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#a855f7]/20 border border-[#a855f7]/40 flex items-center justify-center text-[#c084fc]">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-[#9b94b8] flex items-center gap-1.5">
              <span>امروز:</span>
              <span className="font-semibold text-white">
                {currentJalali.weekdayName} {currentJalali.jd} {JALALI_MONTHS_FA[currentJalali.jm - 1]} {currentJalali.jy}
              </span>
            </div>
            <div className="text-[10px] text-[#6e678a] font-mono">
              سال {currentJalali.jy} خورشیدی {isJalaliLeapYear(currentJalali.jy) ? '(کبیسه)' : '(عادی)'}
            </div>
          </div>
        </div>

        <button
          onClick={goToToday}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#281a45] hover:bg-[#34225b] border border-[#52338c] text-[11px] text-[#e9d5ff] transition-all active:scale-95 shadow-sm"
          title="برو به امروز"
        >
          <RotateCcw className="w-3 h-3 text-[#c084fc]" />
          <span>امروز</span>
        </button>
      </div>

      {/* Calendar Header Card */}
      <div className="rounded-2xl p-4 bg-[#12101a] border border-[#292040] shadow-xl space-y-4">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-[#231a38] pb-3">
          {/* Year Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={prevYear}
              className="p-1.5 rounded-lg bg-[#191428] border border-[#2f204d] text-[#9490a6] hover:text-white hover:bg-[#261942] transition-colors"
              title="سال قبل"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono font-bold text-[#c084fc] px-1.5">
              {jYear}
            </span>
            <button
              onClick={nextYear}
              className="p-1.5 rounded-lg bg-[#191428] border border-[#2f204d] text-[#9490a6] hover:text-white hover:bg-[#261942] transition-colors"
              title="سال بعد"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            {isLeap && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-mono">
                کبیسه
              </span>
            )}
          </div>

          {/* Month Title & Selector */}
          <div className="flex items-center gap-2">
            <select
              value={jMonth}
              onChange={(e) => setJMonth(parseInt(e.target.value, 10))}
              aria-label="انتخاب ماه"
              className="bg-[#1b152d] border border-[#3c2a63] text-white text-xs font-bold rounded-lg px-2.5 py-1 outline-none cursor-pointer focus:border-[#a855f7]"
            >
              {JALALI_MONTHS_FA.map((m, idx) => (
                <option key={idx} value={idx + 1} className="bg-[#12101a] text-white">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Month Step Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg bg-[#191428] border border-[#2f204d] text-[#9490a6] hover:text-white hover:bg-[#261942] transition-colors"
              title="ماه قبل"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg bg-[#191428] border border-[#2f204d] text-[#9490a6] hover:text-white hover:bg-[#261942] transition-colors"
              title="ماه بعد"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days grid */}
        <div className="space-y-1">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {JALALI_WEEKDAYS_SHORT_FA.map((w, idx) => {
              const isFriday = idx === 6;
              return (
                <div
                  key={idx}
                  title={JALALI_WEEKDAYS_FA[idx]}
                  className={`text-[11px] py-1 font-semibold rounded-lg ${
                    isFriday
                      ? 'text-rose-400 bg-rose-950/20'
                      : 'text-[#857f9f]'
                  }`}
                >
                  {w}
                </div>
              );
            })}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 pt-1">
            {/* Empty padding slots before 1st day of month */}
            {emptyPaddingSlots.map((slotIndex) => {
              const prevDayNum = prevMonthDaysCount - (firstDayWeekday - slotIndex - 1);
              return (
                <div
                  key={`empty-${slotIndex}`}
                  className="flex flex-col items-center justify-center h-10 rounded-xl text-[11px] font-mono text-[#38314a] select-none"
                >
                  <span>{prevDayNum}</span>
                </div>
              );
            })}

            {/* Actual Month Days */}
            {daysArray.map((day) => {
              const isToday =
                currentJalali.jy === jYear &&
                currentJalali.jm === jMonth &&
                currentJalali.jd === day;
              const isSelected = effectiveSelectedDay === day;
              const hasReminders = !!remindersByDay[day];
              const dayWeekday = getJalaliWeekday(jYear, jMonth, day);
              const isFriday = dayWeekday === 6;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`relative flex flex-col items-center justify-center h-10 rounded-xl text-xs font-mono transition-all ${
                    isSelected
                      ? 'bg-gradient-to-tr from-[#9333ea] to-[#a855f7] text-white font-bold shadow-lg shadow-purple-900/40 ring-2 ring-purple-400 scale-[1.02]'
                      : isToday
                      ? 'bg-[#291b47] border border-[#a855f7] text-[#e9d5ff] font-bold'
                      : isFriday
                      ? 'bg-[#181224] text-rose-300 hover:bg-[#251733] border border-rose-950/30'
                      : 'bg-[#161224] text-[#d1cedd] hover:bg-[#23193a] border border-[#231b36]'
                  }`}
                >
                  <span className="leading-none">{day}</span>
                  {hasReminders && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-1 ${
                        isSelected ? 'bg-white' : 'bg-[#c084fc] shadow-sm shadow-purple-500 animate-pulse'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Day Reminders */}
      <div className="rounded-2xl p-4 bg-[#12101a] border border-[#292040] shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#231a38] pb-2.5 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#a855f7]" />
              <h4 className="text-xs font-bold text-white">
                {selectedDayWeekdayName} {effectiveSelectedDay} {JALALI_MONTHS_FA[jMonth - 1]} {jYear}
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1c152d] border border-[#372856] text-[#c084fc] font-mono">
                {selectedDayReminders.length} یادآور
              </span>
            </div>
            <p className="text-[10px] text-[#716a8c] mt-0.5 font-mono">
              {gregorianFormatted}
            </p>
          </div>

          <button
            onClick={() => onOpenNewModal({ jy: jYear, jm: jMonth, jd: effectiveSelectedDay })}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#9333ea] to-[#a855f7] hover:from-[#7e22ce] hover:to-[#9333ea] text-white text-xs font-medium shadow-md shadow-purple-950/40 active:scale-95 transition-all self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ثبت یادآور برای این روز</span>
          </button>
        </div>

        {selectedDayReminders.length === 0 ? (
          <div className="text-center py-7 text-xs text-[#807b96] space-y-2.5 bg-[#161224]/50 rounded-xl border border-dashed border-[#2b2144]">
            <p>در تاریخ {selectedDayWeekdayName} {effectiveSelectedDay} {JALALI_MONTHS_FA[jMonth - 1]} هیچ یادآوری تنظیم نشده است.</p>
            <button
              onClick={() => onOpenNewModal({ jy: jYear, jm: jMonth, jd: effectiveSelectedDay })}
              className="text-xs text-[#c084fc] hover:text-[#d8b4fe] underline underline-offset-4"
            >
              + ثبت اولین یادآور برای این روز
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayReminders.map((rem) => (
              <div
                key={rem.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#181326] border border-[#2b2047] hover:border-[#42316e] transition-all"
              >
                <div className="space-y-1">
                  <span className={`text-xs font-medium block ${rem.isCompleted ? 'line-through text-[#6b6880]' : 'text-white'}`}>
                    {rem.title}
                  </span>
                  {rem.description && (
                    <p className="text-[11px] text-[#918ba8] line-clamp-1">{rem.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-[#807b96] font-mono">
                    <Clock className="w-3 h-3 text-[#a855f7]" />
                    <span>{rem.targetJalali.split(' ')[1] || ''}</span>
                    <span>• {rem.targetGregorian}</span>
                  </div>
                </div>

                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                  rem.isCompleted
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                    : 'bg-[#291b47] text-[#d8b4fe] border border-[#482c7a]'
                }`}>
                  {rem.isCompleted ? 'تکمیل شده' : 'فعال'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
