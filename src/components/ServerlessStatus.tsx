import React, { useState } from 'react';
import { callServerlessEndpoint } from '../lib/serverlessClient';
import {
  Server,
  Database,
  Cpu,
  Play,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';

interface TickResult {
  ok: boolean;
  totalChecked: number;
  delivered: number;
  failed: number;
  skipped: number;
  durationMs: number;
}

export const ServerlessStatus: React.FC = () => {
  const [isRunningTick, setIsRunningTick] = useState(false);
  const [tickResult, setTickResult] = useState<TickResult | null>(null);

  const handleRunTick = async () => {
    setIsRunningTick(true);
    try {
      const res = await callServerlessEndpoint<TickResult>('tick', { limit: 25 });
      setTickResult(res);
    } catch (e) {
      console.error('Tick failed', e);
    } finally {
      setIsRunningTick(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Platform & Health Overview Card */}
      <div className="rounded-2xl p-4 bg-[#12101a] border border-[#292040] space-y-3">
        <div className="flex items-center justify-between border-b border-[#231a38] pb-2.5">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#a855f7]" />
            <h3 className="text-sm font-bold text-white">زیرساخت سرورلس TGCloud</h3>
          </div>
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            OPERATIONAL
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-[#181326] border border-[#2c1f47] space-y-1">
            <div className="flex items-center gap-1.5 text-[#9490a6]">
              <Cpu className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>محیط اجرا</span>
            </div>
            <p className="text-white font-mono text-[11px] font-semibold">V8 Isolates (Sandboxed)</p>
          </div>

          <div className="p-2.5 rounded-xl bg-[#181326] border border-[#2c1f47] space-y-1">
            <div className="flex items-center gap-1.5 text-[#9490a6]">
              <Database className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>پایگاه‌داده</span>
            </div>
            <p className="text-white font-mono text-[11px] font-semibold">SQLite (Built-in Persistent)</p>
          </div>

          <div className="p-2.5 rounded-xl bg-[#181326] border border-[#2c1f47] space-y-1">
            <div className="flex items-center gap-1.5 text-[#9490a6]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>مکانیزم قفل صف</span>
            </div>
            <p className="text-white font-mono text-[11px]">Lease Lock (120s) + Dedup</p>
          </div>

          <div className="p-2.5 rounded-xl bg-[#181326] border border-[#2c1f47] space-y-1">
            <div className="flex items-center gap-1.5 text-[#9490a6]">
              <Zap className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>محرک‌های اجرا</span>
            </div>
            <p className="text-white font-mono text-[11px]">Cron + Chat Opportunistic</p>
          </div>
        </div>
      </div>

      {/* Manual Queue Trigger / Diagnostic */}
      <div className="rounded-2xl p-4 bg-[#12101a] border border-[#292040] space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>تست و اجرای دستی پردازش صف</span>
            </h4>
            <p className="text-[11px] text-[#9490a6]">
              فراخوانی اندپوینت <code className="text-[#c084fc]">endpoints/tick.js</code> برای بررسی و تحویل یادآورهای سررسید شده.
            </p>
          </div>

          <button
            onClick={handleRunTick}
            disabled={isRunningTick}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-medium transition-all shadow-md glow-purple disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${isRunningTick ? 'animate-spin' : ''}`} />
            <span>{isRunningTick ? 'در حال بررسی...' : 'اجرای صف (Tick)'}</span>
          </button>
        </div>

        {tickResult && (
          <div className="p-3 rounded-xl bg-[#181326] border border-[#3b2a5c] text-xs space-y-1.5 font-mono animate-in fade-in">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>بررسی با موفقیت انجام شد</span>
              </span>
              <span className="text-[10px] text-[#9490a6]">{tickResult.durationMs}ms</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-center pt-1 text-[11px]">
              <div className="bg-[#12101b] p-1.5 rounded border border-[#281d3f]">
                <span className="text-[#807b96] block text-[10px]">بررسی شده</span>
                <span className="text-white font-bold">{tickResult.totalChecked}</span>
              </div>
              <div className="bg-[#12101b] p-1.5 rounded border border-[#281d3f]">
                <span className="text-emerald-400 block text-[10px]">تحویل شده</span>
                <span className="text-emerald-300 font-bold">{tickResult.delivered}</span>
              </div>
              <div className="bg-[#12101b] p-1.5 rounded border border-[#281d3f]">
                <span className="text-rose-400 block text-[10px]">خطا</span>
                <span className="text-rose-300 font-bold">{tickResult.failed}</span>
              </div>
              <div className="bg-[#12101b] p-1.5 rounded border border-[#281d3f]">
                <span className="text-[#807b96] block text-[10px]">رد شده</span>
                <span className="text-[#c084fc] font-bold">{tickResult.skipped}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CLI Reference & Windows PowerShell Guide */}
      <div className="rounded-2xl p-4 bg-[#12101a] border border-[#292040] space-y-2.5">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-[#a855f7]" />
          <span>راهنمای دستورات TGCloud CLI و PowerShell</span>
        </h4>

        <div className="space-y-2 text-[11px] font-mono text-[#d8b4fe]">
          <div className="p-2.5 rounded-lg bg-[#0a0910] border border-[#201833]">
            <span className="text-[#6b6880] block text-[10px] mb-0.5"># اتصال ربات تلگرام:</span>
            <code>npx tgcloud login</code>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0a0910] border border-[#201833]">
            <span className="text-[#6b6880] block text-[10px] mb-0.5"># اعمال تغییرات دیتابیس (Migration):</span>
            <code>npx tgcloud migrate</code>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0a0910] border border-[#201833]">
            <span className="text-[#6b6880] block text-[10px] mb-0.5"># ساخت فرانت و دیپلوی به تلگرام سرورلس:</span>
            <code>npm run deploy:tgcloud</code>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0a0910] border border-[#201833]">
            <span className="text-[#6b6880] block text-[10px] mb-0.5"># اجرای اسکریپت زمان‌بند در ویندوز پاورشل:</span>
            <code>.\scripts\tick.ps1 -IntervalSeconds 60</code>
          </div>
        </div>

        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#181326] border border-[#30214a] text-[11px] text-[#9490a6]">
          <Info className="w-4 h-4 text-[#a855f7] shrink-0 mt-0.5" />
          <p>
            دامنه مینی‌اپ به‌صورت خودکار توسط تلگرام در قالب <code className="text-[#d8b4fe]">https://app&lt;app_id&gt;.tgcloud.ai</code> ارائه می‌شود و پس از اجرای <code className="text-[#d8b4fe]">tgcloud push</code> در ترمینال چاپ می‌شود. نیازی به خرید یا تنظیم دامنه اختصاصی نیست.
          </p>
        </div>
      </div>
    </div>
  );
};
