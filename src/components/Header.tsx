import React from 'react';
import { Calendar, Plus, RefreshCw, SlidersHorizontal, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onOpenNewModal: () => void;
  onRefresh: () => void;
  activeView: 'list' | 'calendar' | 'settings' | 'admin';
  setActiveView: (view: 'list' | 'calendar' | 'settings' | 'admin') => void;
  activeCount: number;
  isAdmin: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewModal,
  onRefresh,
  activeView,
  setActiveView,
  activeCount,
  isAdmin,
}) => {
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user;

  return (
    <header className="sticky top-0 z-30 bg-[#07060c]/90 backdrop-blur-xl border-b border-[#1f1733] px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#1a122e] to-[#0d0a17] border border-[#3d2761] text-[#c084fc] shadow-md glow-subtle">
            <span className="font-mono text-xs font-bold tracking-widest">VM</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#a855f7] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans text-sm font-bold text-white tracking-wide">
                The Void Markt
              </h1>
              {isAdmin && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2b1747] border border-[#522987] text-[#d8b4fe] font-sans font-medium">
                  مدیر
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#807b96]">
              {user?.first_name ? `سلام ${user.first_name}، روز خوبی داشته باشید` : 'دستیار هوشمند مدیریت یادآورها'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            title="بروزرسانی داده‌ها"
            className="p-2 rounded-xl bg-[#110e1c] border border-[#261c3b] text-[#807b96] hover:text-white hover:border-[#a855f7]/50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-medium transition-all shadow-md glow-purple active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ثبت یادآور</span>
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="max-w-2xl mx-auto mt-3 flex items-center gap-1 bg-[#100c1a] p-1 rounded-xl border border-[#211836]">
        <button
          onClick={() => setActiveView('list')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeView === 'list'
              ? 'bg-[#1e1533] text-white border border-[#3f2963] shadow-sm'
              : 'text-[#807b96] hover:text-white'
          }`}
        >
          <span>یادآورها</span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#a855f7]/25 text-[#d8b4fe] text-[10px] font-mono">
              {activeCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveView('calendar')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeView === 'calendar'
              ? 'bg-[#1e1533] text-white border border-[#3f2963] shadow-sm'
              : 'text-[#807b96] hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>تقویم</span>
        </button>

        <button
          onClick={() => setActiveView('settings')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeView === 'settings'
              ? 'bg-[#1e1533] text-white border border-[#3f2963] shadow-sm'
              : 'text-[#807b96] hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>تنظیمات</span>
        </button>

        {/* Exclusive Admin tab */}
        {isAdmin && (
          <button
            onClick={() => setActiveView('admin')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeView === 'admin'
                ? 'bg-[#291745] text-[#e9d5ff] border border-[#6b21a8] shadow-sm glow-subtle'
                : 'text-[#a855f7] hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>مدیریت</span>
          </button>
        )}
      </div>
    </header>
  );
};
