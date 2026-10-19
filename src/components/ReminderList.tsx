import React, { useState } from 'react';
import { Reminder, CategoryType, PriorityType } from '../types';
import { getRelativeTimeText } from '../lib/dates';
import { downloadIcsFile, getGoogleCalendarUrl } from '../lib/ical';
import {
  Clock,
  Repeat,
  Trash2,
  Moon,
  Search,
  CheckCircle2,
  Circle,
  AlertCircle,
  Tag,
  Plus,
  Flame,
  TrendingUp,
  Calendar,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

interface ReminderListProps {
  reminders: Reminder[];
  onToggleComplete: (id: number, currentStatus: boolean) => void;
  onSnooze: (id: number, minutes: number) => void;
  onDelete: (id: number) => void;
  onOpenNewModal: () => void;
}

export const ReminderList: React.FC<ReminderListProps> = ({
  reminders,
  onToggleComplete,
  onSnooze,
  onDelete,
  onOpenNewModal,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'today' | 'completed'>('active');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<PriorityType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSnoozeMenuId, setActiveSnoozeMenuId] = useState<number | null>(null);
  const [activeCalendarMenuId, setActiveCalendarMenuId] = useState<number | null>(null);

  const nowSec = Math.floor(Date.now() / 1000);

  // Productivity Metrics & Streak calculation
  const totalCount = reminders.length;
  const completedCount = reminders.filter((r) => r.isCompleted).length;
  const activeCount = reminders.filter((r) => !r.isCompleted && !r.isArchived).length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Streak: Count unique days with completed tasks or active engagement
  const streakDays = Math.min(completedCount > 0 ? Math.max(1, Math.floor(completedCount / 2)) : 0, 30);

  // Filter logic
  const filtered = reminders.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }

    if (selectedPriority !== 'all' && (item.priority || 'normal') !== selectedPriority) {
      return false;
    }

    if (filterTab === 'active') return !item.isCompleted;
    if (filterTab === 'completed') return item.isCompleted;
    if (filterTab === 'today') {
      const d = new Date(item.targetTimestamp * 1000);
      const today = new Date();
      return (
        d.getUTCFullYear() === today.getUTCFullYear() &&
        d.getUTCMonth() === today.getUTCMonth() &&
        d.getUTCDate() === today.getUTCDate()
      );
    }
    return true;
  });

  const categories: { key: CategoryType | 'all'; label: string }[] = [
    { key: 'all', label: 'همه موضوعات' },
    { key: 'work', label: '💼 کاری' },
    { key: 'shopping', label: '🛒 خرید' },
    { key: 'education', label: '📚 درسی' },
    { key: 'finance', label: '💳 مالی / قسط' },
    { key: 'health', label: '💊 سلامت' },
    { key: 'personal', label: '👤 شخصی' },
    { key: 'general', label: '📌 عمومی' },
  ];

  const categoryNames: Record<string, { label: string; color: string }> = {
    general: { label: 'عمومی', color: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/50' },
    work: { label: 'کاری', color: 'bg-blue-950/70 text-blue-300 border-blue-800/50' },
    shopping: { label: 'خرید', color: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/50' },
    education: { label: 'درسی', color: 'bg-purple-950/70 text-purple-300 border-purple-800/50' },
    finance: { label: 'مالی', color: 'bg-amber-950/70 text-amber-300 border-amber-800/50' },
    health: { label: 'سلامت', color: 'bg-teal-950/70 text-teal-300 border-teal-800/50' },
    personal: { label: 'شخصی', color: 'bg-pink-950/70 text-pink-300 border-pink-800/50' },
  };

  const recurrenceLabels: Record<string, string> = {
    once: 'یک‌باره',
    daily: 'روزانه',
    weekly: 'هفتگی',
    monthly: 'ماهانه',
    yearly: 'سالانه',
  };

  return (
    <div className="space-y-3.5">
      {/* Productivity Score & Streak Card */}
      <div className="rounded-2xl p-3.5 bg-gradient-to-r from-[#1c1233] via-[#160e29] to-[#100b1e] border border-[#3b255e]/70 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          {/* Streak Indicator */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Flame className="w-5 h-5 fill-amber-500/30" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-white font-mono">{streakDays} روز</span>
                <span className="text-[10px] text-amber-400">🔥 زنجیره نظم</span>
              </div>
              <p className="text-[10px] text-[#8e87a6]">
                {streakDays > 0 ? 'عالی! به زنجیره کارهایت ادامه بده' : 'اولین کار امروزت را انجام بده'}
              </p>
            </div>
          </div>

          {/* Productivity Rate */}
          <div className="text-left flex items-center gap-2.5">
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end text-[11px] text-[#c084fc] font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>بهره‌وری: {completionRate}٪</span>
              </div>
              <div className="text-[10px] text-[#787190] font-mono">
                {completedCount} از {totalCount} کار انجام شد
              </div>
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-[#a855f7] bg-[#23173d] flex items-center justify-center text-[10px] font-bold text-white font-mono shadow-sm">
              {completionRate}٪
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در عنوان یا متن یادآور..."
            className="w-full bg-[#100c1a] border border-[#211836] focus:border-[#a855f7] rounded-xl px-3.5 py-2.5 pr-9 text-xs text-white placeholder-[#605873] outline-none transition-all shadow-inner"
          />
          <Search className="w-4 h-4 text-[#605873] absolute right-3 top-3 pointer-events-none" />
        </div>

        {/* Tab filters (Active, Today, Completed, All) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            onClick={() => setFilterTab('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              filterTab === 'active'
                ? 'bg-[#a855f7] text-white shadow-md glow-purple font-bold'
                : 'bg-[#150f24] text-[#8c869e] hover:text-white border border-[#231838]'
            }`}
          >
            فعال ({activeCount})
          </button>
          <button
            onClick={() => setFilterTab('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              filterTab === 'today'
                ? 'bg-[#a855f7] text-white shadow-md glow-purple font-bold'
                : 'bg-[#150f24] text-[#8c869e] hover:text-white border border-[#231838]'
            }`}
          >
            برنامه امروز
          </button>
          <button
            onClick={() => setFilterTab('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              filterTab === 'completed'
                ? 'bg-[#a855f7] text-white shadow-md glow-purple font-bold'
                : 'bg-[#150f24] text-[#8c869e] hover:text-white border border-[#231838]'
            }`}
          >
            تکمیل شده ({completedCount})
          </button>
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              filterTab === 'all'
                ? 'bg-[#a855f7] text-white shadow-md glow-purple font-bold'
                : 'bg-[#150f24] text-[#8c869e] hover:text-white border border-[#231838]'
            }`}
          >
            همه ({totalCount})
          </button>
        </div>

        {/* Priority Filter Row */}
        <div className="flex items-center gap-1 overflow-x-auto text-[11px] pb-0.5 scrollbar-none">
          <span className="text-[10px] text-[#6a6382] pl-1 font-medium whitespace-nowrap">اولویت:</span>
          {[
            { key: 'all', label: 'همه' },
            { key: 'urgent', label: '🔴 فوری' },
            { key: 'high', label: '🟡 مهم' },
            { key: 'normal', label: '🟢 عادی' },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setSelectedPriority(p.key as PriorityType | 'all')}
              className={`px-2 py-0.5 rounded-lg border text-[10px] whitespace-nowrap transition-all ${
                selectedPriority === p.key
                  ? 'bg-[#291b45] border-[#9333ea] text-white font-bold'
                  : 'bg-[#120d21] border-[#221836] text-[#7e7794] hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setSelectedCategory(c.key)}
              className={`px-2.5 py-1 rounded-lg text-[10px] whitespace-nowrap border transition-all ${
                selectedCategory === c.key
                  ? 'bg-[#2a1b47] border-[#9d4edd] text-purple-200 font-bold shadow-sm'
                  : 'bg-[#120d20] border-[#241a38] text-[#7d7792] hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reminder Cards List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-[#0f0c18] border border-[#211833] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1e1533] border border-[#3b255e] flex items-center justify-center mx-auto text-[#a855f7]">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">یادآوری یافت نشد</h4>
            <p className="text-xs text-[#716a8a] max-w-xs mx-auto">
              هیچ یادآوری با فیلترهای انتخابی شما ثبت نشده است.
            </p>
          </div>
          <button
            onClick={onOpenNewModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#9333ea] to-[#a855f7] hover:from-[#7e22ce] hover:to-[#9333ea] text-white text-xs font-medium shadow-md shadow-purple-950/50 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت اولین یادآور</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((reminder) => {
            const isOverdue = !reminder.isCompleted && reminder.targetTimestamp < nowSec;
            const relativeTime = getRelativeTimeText(reminder.targetTimestamp, 'fa');
            const catInfo = categoryNames[reminder.category] || categoryNames.general;
            const isUrgent = reminder.priority === 'urgent';
            const isHigh = reminder.priority === 'high';

            return (
              <div
                key={reminder.id}
                className={`relative rounded-2xl p-3.5 transition-all border ${
                  reminder.isCompleted
                    ? 'bg-[#0c0a14]/90 border-[#1a1426] opacity-70'
                    : isUrgent
                    ? 'bg-[#180d1e] border-rose-800/70 shadow-md shadow-rose-950/20'
                    : isOverdue
                    ? 'bg-[#160f24] border-[#7e22ce]/70'
                    : 'bg-[#100c1a] border-[#241a38] hover:border-[#3d2761]'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Done toggle checkbox */}
                  <button
                    onClick={() => onToggleComplete(reminder.id, reminder.isCompleted)}
                    className="mt-0.5 text-[#a855f7] hover:scale-110 active:scale-95 transition-transform"
                    title={reminder.isCompleted ? 'بازگردانی' : 'انجام شد'}
                  >
                    {reminder.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#5e4b78] hover:text-[#a855f7]" />
                    )}
                  </button>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isUrgent && (
                          <span
                            className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"
                            title="فوری - تکرار هر ۵ دقیقه"
                          />
                        )}
                        <h4
                          className={`text-xs font-bold truncate ${
                            reminder.isCompleted
                              ? 'line-through text-[#6e6882]'
                              : isUrgent
                              ? 'text-rose-200'
                              : 'text-white'
                          }`}
                        >
                          {reminder.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isUrgent && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-700/60 text-rose-300 font-sans font-medium">
                            فوری (۵ دقیقه‌ای)
                          </span>
                        )}
                        {isHigh && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300 font-sans">
                            مهم
                          </span>
                        )}
                        {isOverdue && (
                          <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-rose-950/70 border border-rose-800/60 text-rose-300 font-sans">
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span>معوق</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {reminder.description && (
                      <p className="text-[11px] text-[#9490a6] line-clamp-2">
                        {reminder.description}
                      </p>
                    )}

                    {/* Metadata & Timestamps */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[#807b96] pt-1">
                      <span className="flex items-center gap-1 font-mono text-[#c084fc] font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{reminder.targetJalali}</span>
                      </span>

                      <span className="text-[#807b96] text-[10px]">
                        ({relativeTime})
                      </span>

                      {reminder.recurrence !== 'once' && (
                        <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#1c132e] border border-[#372354] text-[#d8b4fe] text-[10px]">
                          <Repeat className="w-2.5 h-2.5" />
                          <span>{recurrenceLabels[reminder.recurrence]}</span>
                        </span>
                      )}

                      {reminder.category && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${catInfo.color}`}>
                          {catInfo.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons (Calendar Sync, Snooze, Delete) */}
                <div className="mt-3 pt-2 border-t border-[#1e162e] flex items-center justify-between text-xs text-[#8a83a1]">
                  {/* Calendar Sync Menu */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setActiveCalendarMenuId(activeCalendarMenuId === reminder.id ? null : reminder.id);
                        setActiveSnoozeMenuId(null);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#160f26] border border-[#2f204d] text-[#c084fc] hover:text-white transition-colors text-[10px]"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>افزودن به تقویم</span>
                      <ChevronDown className="w-2.5 h-2.5" />
                    </button>

                    {activeCalendarMenuId === reminder.id && (
                      <div className="absolute right-0 bottom-full mb-1.5 w-44 rounded-xl bg-[#18112b] border border-[#3f2866] shadow-2xl p-1.5 z-20 space-y-1">
                        <button
                          onClick={() => {
                            downloadIcsFile(reminder);
                            setActiveCalendarMenuId(null);
                          }}
                          className="w-full text-right px-2.5 py-1.5 rounded-lg hover:bg-[#251744] text-[11px] text-white flex items-center justify-between"
                        >
                          <span>📱 تقویم گوشی (.ics)</span>
                        </button>
                        <button
                          onClick={() => {
                            window.open(getGoogleCalendarUrl(reminder), '_blank');
                            setActiveCalendarMenuId(null);
                          }}
                          className="w-full text-right px-2.5 py-1.5 rounded-lg hover:bg-[#251744] text-[11px] text-white flex items-center justify-between"
                        >
                          <span>🌐 تقویم گوگل</span>
                          <ExternalLink className="w-3 h-3 text-[#a855f7]" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Snooze & Delete */}
                  <div className="flex items-center gap-1.5">
                    {/* Snooze button with quick menu */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          setActiveSnoozeMenuId(activeSnoozeMenuId === reminder.id ? null : reminder.id);
                          setActiveCalendarMenuId(null);
                        }}
                        className="p-1.5 rounded-lg bg-[#160f26] border border-[#2f204d] text-[#8e87a6] hover:text-white transition-colors"
                        title="تعویق یادآور"
                      >
                        <Moon className="w-3.5 h-3.5" />
                      </button>

                      {activeSnoozeMenuId === reminder.id && (
                        <div className="absolute left-0 bottom-full mb-1.5 w-32 rounded-xl bg-[#18112b] border border-[#3f2866] shadow-2xl p-1 z-20 space-y-0.5 text-[10px]">
                          <button
                            onClick={() => {
                              onSnooze(reminder.id, 15);
                              setActiveSnoozeMenuId(null);
                            }}
                            className="w-full text-right px-2 py-1 rounded hover:bg-[#28184a] text-white"
                          >
                            +۱۵ دقیقه
                          </button>
                          <button
                            onClick={() => {
                              onSnooze(reminder.id, 60);
                              setActiveSnoozeMenuId(null);
                            }}
                            className="w-full text-right px-2 py-1 rounded hover:bg-[#28184a] text-white"
                          >
                            +۱ ساعت
                          </button>
                          <button
                            onClick={() => {
                              onSnooze(reminder.id, 1440);
                              setActiveSnoozeMenuId(null);
                            }}
                            className="w-full text-right px-2 py-1 rounded hover:bg-[#28184a] text-white"
                          >
                            +۱ روز
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => onDelete(reminder.id)}
                      className="p-1.5 rounded-lg bg-[#160f26] border border-[#2f204d] text-[#8e87a6] hover:text-rose-400 hover:border-rose-900/50 transition-colors"
                      title="حذف یادآور"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
