import React, { useState } from 'react';
import { UserSettings, CalendarType, LangType } from '../types';
import { callServerlessEndpoint } from '../lib/serverlessClient';
import {
  Calendar,
  Globe,
  Clock,
  Check,
  HelpCircle
} from 'lucide-react';

interface UserSettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
}

export const UserSettingsView: React.FC<UserSettingsViewProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [calendarType, setCalendarType] = useState<CalendarType>(settings.calendarType || 'jalali');
  const [lang, setLang] = useState<LangType>(settings.lang || 'fa');
  const [timezone, setTimezone] = useState<string>(settings.timezone || 'Asia/Tehran');
  const [isSaved, setIsSaved] = useState(false);

  const timezones = [
    { key: 'Asia/Tehran', label: 'تهران (UTC +3:30)' },
    { key: 'Asia/Dubai', label: 'دبی (UTC +4:00)' },
    { key: 'Europe/Istanbul', label: 'استانبول (UTC +3:00)' },
    { key: 'Europe/Berlin', label: 'برلین / اروپای مرکزی (UTC +1:00)' },
    { key: 'UTC', label: 'ساعت هماهنگ جهانی (UTC)' },
  ];

  const handleSave = async (newCal: CalendarType, newLang: LangType, newTz: string) => {
    setCalendarType(newCal);
    setLang(newLang);
    setTimezone(newTz);

    const updated = { calendarType: newCal, lang: newLang, timezone: newTz };
    onUpdateSettings(updated);

    try {
      await callServerlessEndpoint('updateUserSettings', updated);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (e) {
      console.error('Failed to persist user settings:', e);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Success banner */}
      {isSaved && (
        <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>تنظیمات شما با موفقیت ذخیره شد.</span>
        </div>
      )}

      {/* Calendar system card */}
      <div className="p-4 rounded-2xl bg-[#0f0c18] border border-[#231838] space-y-3">
        <div className="flex items-center gap-2.5 text-white">
          <span className="p-1.5 rounded-lg bg-[#1c142e] text-[#c084fc]">
            <Calendar className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-xs font-bold">تقویم پیش‌فرض</h4>
            <p className="text-[11px] text-[#807b96]">نمایش تاریخ‌ها در ربات و مینی‌اپ</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => handleSave('jalali', lang, timezone)}
            className={`p-3 rounded-xl border text-right transition-all ${
              calendarType === 'jalali'
                ? 'bg-[#25173f] border-[#a855f7] text-white glow-subtle'
                : 'bg-[#141021] border-[#291e42] text-[#807b96] hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold block">تقویم شمسی</span>
              {calendarType === 'jalali' && <Check className="w-3.5 h-3.5 text-[#c084fc]" />}
            </div>
            <span className="text-[10px] text-[#9490a6] block mt-1">۱۴۰۳ خورشیدی (ایران)</span>
          </button>

          <button
            onClick={() => handleSave('gregorian', lang, timezone)}
            className={`p-3 rounded-xl border text-right transition-all ${
              calendarType === 'gregorian'
                ? 'bg-[#25173f] border-[#a855f7] text-white glow-subtle'
                : 'bg-[#141021] border-[#291e42] text-[#807b96] hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold block">تقویم میلادی</span>
              {calendarType === 'gregorian' && <Check className="w-3.5 h-3.5 text-[#c084fc]" />}
            </div>
            <span className="text-[10px] text-[#9490a6] block mt-1">2026 Gregorian</span>
          </button>
        </div>
      </div>

      {/* Timezone Card */}
      <div className="p-4 rounded-2xl bg-[#0f0c18] border border-[#231838] space-y-3">
        <div className="flex items-center gap-2.5 text-white">
          <span className="p-1.5 rounded-lg bg-[#1c142e] text-[#c084fc]">
            <Clock className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-xs font-bold">منطقه زمانی (Timezone)</h4>
            <p className="text-[11px] text-[#807b96]">تعیین زمان دقیق ارسال اعلان‌های شما</p>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          {timezones.map((tz) => (
            <button
              key={tz.key}
              onClick={() => handleSave(calendarType, lang, tz.key)}
              className={`w-full p-2.5 rounded-xl border text-right flex items-center justify-between transition-all text-xs ${
                timezone === tz.key
                  ? 'bg-[#211538] border-[#a855f7] text-white'
                  : 'bg-[#130f1f] border-[#231938] text-[#807b96] hover:text-white'
              }`}
            >
              <span>{tz.label}</span>
              {timezone === tz.key && <Check className="w-3.5 h-3.5 text-[#a855f7]" />}
            </button>
          ))}
        </div>
      </div>

      {/* Language Card */}
      <div className="p-4 rounded-2xl bg-[#0f0c18] border border-[#231838] space-y-3">
        <div className="flex items-center gap-2.5 text-white">
          <span className="p-1.5 rounded-lg bg-[#1c142e] text-[#c084fc]">
            <Globe className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-xs font-bold">زبان برنامه</h4>
            <p className="text-[11px] text-[#807b96]">Language preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => handleSave(calendarType, 'fa', timezone)}
            className={`p-2.5 rounded-xl border text-center transition-all text-xs ${
              lang === 'fa'
                ? 'bg-[#25173f] border-[#a855f7] text-white font-bold'
                : 'bg-[#141021] border-[#291e42] text-[#807b96]'
            }`}
          >
            فارسی (پیش‌فرض)
          </button>

          <button
            onClick={() => handleSave(calendarType, 'en', timezone)}
            className={`p-2.5 rounded-xl border text-center transition-all text-xs ${
              lang === 'en'
                ? 'bg-[#25173f] border-[#a855f7] text-white font-bold'
                : 'bg-[#141021] border-[#291e42] text-[#807b96]'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Info & About */}
      <div className="p-3.5 rounded-2xl bg-[#0c0a14] border border-[#231838] flex items-center gap-2.5 text-[11px] text-[#807b96]">
        <HelpCircle className="w-4 h-4 text-[#a855f7] shrink-0" />
        <p>
          تمام یادآوری‌های شما به طور دائم ذخیره می‌شوند و حتی در صورت بستن مینی‌اپ، سر موعد به چت تلگرام شما ارسال خواهند شد.
        </p>
      </div>
    </div>
  );
};
