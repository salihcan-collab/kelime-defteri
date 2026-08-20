'use client';

import { useSettingsStore } from '@/store/settingsStore';

export function PreferenceSliders() {
  const ttsRate = useSettingsStore((s) => s.ttsRate);
  const setTtsRate = useSettingsStore((s) => s.setTtsRate);
  const dailyGoal = useSettingsStore((s) => s.dailyGoal);
  const setDailyGoal = useSettingsStore((s) => s.setDailyGoal);

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-ink">
          <span>Speech rate</span>
          <span className="text-ink-soft">{ttsRate.toFixed(2)}x</span>
        </label>
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.05}
          value={ttsRate}
          onChange={(e) => setTtsRate(Number(e.target.value))}
          className="w-full accent-[rgb(var(--color-accent))]"
        />
      </div>
      <div>
        <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-ink">
          <span>Daily review goal</span>
          <span className="text-ink-soft">{dailyGoal} cards</span>
        </label>
        <input
          type="range"
          min={5}
          max={50}
          step={5}
          value={dailyGoal}
          onChange={(e) => setDailyGoal(Number(e.target.value))}
          className="w-full accent-[rgb(var(--color-accent))]"
        />
      </div>
    </div>
  );
}
