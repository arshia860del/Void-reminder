export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type CalendarType = 'jalali' | 'gregorian';
export type LangType = 'fa' | 'en';
export type CategoryType = 'general' | 'work' | 'personal' | 'health' | 'finance' | 'shopping' | 'education';
export type PriorityType = 'urgent' | 'high' | 'normal';

export interface Reminder {
  id: number;
  userId: number;
  chatId: number;
  title: string;
  description: string | null;
  category: CategoryType;
  priority?: PriorityType;
  targetTimestamp: number;
  targetJalali: string;
  targetGregorian: string;
  recurrence: RecurrenceType;
  advanceNoticeMinutes: number;
  isCompleted: boolean;
  isArchived: boolean;
  snoozeCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface UserSettings {
  lang: LangType;
  calendarType: CalendarType;
  timezone: string;
  streakDays?: number;
  productivityScore?: number;
}

export interface RemindersStats {
  total: number;
  active: number;
  completed: number;
}
