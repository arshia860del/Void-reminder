/**
 * The Void Markt — Telegram Serverless Reminder System
 * Production-ready Mini App Frontend
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Reminder, CategoryType, RecurrenceType, PriorityType, UserSettings } from './types';
import { callServerlessEndpoint } from './lib/serverlessClient';
import { Header } from './components/Header';
import { ReminderList } from './components/ReminderList';
import { CalendarView } from './components/CalendarView';
import { UserSettingsView } from './components/UserSettingsView';
import { AdminPortal } from './components/AdminPortal';
import { NewReminderModal } from './components/NewReminderModal';
import { Loader2, Download } from 'lucide-react';

export default function App() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    lang: 'fa',
    calendarType: 'jalali',
    timezone: 'Asia/Tehran',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'calendar' | 'settings' | 'admin'>('list');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<{ jy: number; jm: number; jd: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isInsideTelegram = Boolean(
    typeof window !== 'undefined' &&
    window.Telegram?.WebApp?.initData &&
    window.Telegram.WebApp.initData.length > 0
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchReminders = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await callServerlessEndpoint<{
        reminders: Reminder[];
        isAdmin?: boolean;
        stats: { total: number; active: number; completed: number };
        userPreferences?: UserSettings;
      }>('getReminders');

      if (data && Array.isArray(data.reminders)) {
        setReminders(data.reminders);
      }
      if (typeof data?.isAdmin === 'boolean') {
        setIsAdmin(data.isAdmin);
      }
      if (data?.userPreferences) {
        setUserSettings(data.userPreferences);
      }
    } catch (err) {
      console.warn('Notice loading reminders:', err);
      // Graceful offline/preview fallback; no disruptive error toast
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    fetchReminders();
  }, [fetchReminders]);

  const handleToggleComplete = async (id: number, currentStatus: boolean) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isCompleted: !currentStatus } : r))
    );

    try {
      await callServerlessEndpoint('updateReminder', {
        id,
        isCompleted: !currentStatus,
      });
      showToast(!currentStatus ? '✅ به عنوان انجام شده ثبت شد' : 'یادآور فعال شد');
    } catch {
      fetchReminders();
    }
  };

  const handleSnooze = async (id: number, minutes: number) => {
    try {
      await callServerlessEndpoint('updateReminder', {
        id,
        snoozeMinutes: minutes,
      });
      showToast(`💤 برای ${minutes} دقیقه به تعویق افتاد`);
      fetchReminders();
    } catch {
      showToast('خطا در اعمال تعویق');
    }
  };

  const handleDelete = async (id: number) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    try {
      await callServerlessEndpoint('deleteReminder', { id });
      showToast('🗑 یادآور با موفقیت حذف شد');
    } catch {
      fetchReminders();
    }
  };

  const handleCreateReminder = async (data: {
    title: string;
    description: string;
    category: CategoryType;
    priority: PriorityType;
    targetTimestamp: number;
    recurrence: RecurrenceType;
  }) => {
    try {
      await callServerlessEndpoint('createReminder', data);
      showToast('✅ یادآور با موفقیت ثبت و زمان‌بندی شد');
      fetchReminders();
    } catch {
      showToast('خطا در ثبت یادآور');
    }
  };

  const activeCount = reminders.filter((r) => !r.isCompleted && !r.isArchived).length;

  return (
    <div className="min-h-screen bg-[#07060c] text-[#f9f9fb] flex flex-col font-sans pb-10 selection:bg-[#a855f7]/30">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#1c122e]/95 backdrop-blur-md border border-[#a855f7]/50 text-white text-xs font-medium shadow-2xl glow-subtle animate-in fade-in duration-200">
          {toastMessage}
        </div>
      )}

      {/* Dev / Browser Direct Download Banner (Visible only in web browser / AI Studio, completely hidden in Telegram) */}
      {!isInsideTelegram && (
        <div className="bg-gradient-to-r from-[#1e1338] via-[#150e26] to-[#0c0917] border-b border-[#a855f7]/50 px-4 py-2.5 shadow-lg">
          <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-semibold text-white">فایل سورس کامل پروژه (آماده دیپلوی):</span>
            </div>
            <a
              href="/void-reminder-bot.zip"
              download="void-reminder-bot.zip"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white font-medium shadow-md glow-purple transition-all active:scale-95 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>دانلود مستقیم فایل زیپ (.ZIP)</span>
            </a>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header
        onOpenNewModal={() => setIsNewModalOpen(true)}
        onRefresh={fetchReminders}
        activeView={activeView}
        setActiveView={setActiveView}
        activeCount={activeCount}
        isAdmin={isAdmin}
      />

      {/* Content Area */}
      <main className="max-w-2xl w-full mx-auto px-4 pt-4 flex-1 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <Loader2 className="w-8 h-8 text-[#a855f7] animate-spin" />
            <p className="text-xs text-[#807b96] font-sans">در حال بارگذاری یادآورها...</p>
          </div>
        ) : (
          <>
            {activeView === 'list' && (
              <ReminderList
                reminders={reminders}
                onToggleComplete={handleToggleComplete}
                onSnooze={handleSnooze}
                onDelete={handleDelete}
                onOpenNewModal={() => setIsNewModalOpen(true)}
              />
            )}

            {activeView === 'calendar' && (
              <CalendarView
                reminders={reminders}
                timezone={userSettings.timezone}
                onOpenNewModal={(presetDate) => {
                  setModalInitialDate(presetDate || null);
                  setIsNewModalOpen(true);
                }}
              />
            )}

            {activeView === 'settings' && (
              <UserSettingsView
                settings={userSettings}
                onUpdateSettings={(newSettings) => setUserSettings(newSettings)}
              />
            )}

            {activeView === 'admin' && isAdmin && (
              <AdminPortal />
            )}
          </>
        )}
      </main>

      {/* Modal Dialog */}
      <NewReminderModal
        isOpen={isNewModalOpen}
        onClose={() => {
          setIsNewModalOpen(false);
          setModalInitialDate(null);
        }}
        timezone={userSettings.timezone}
        initialDate={modalInitialDate}
        onSubmit={handleCreateReminder}
      />
    </div>
  );
}
