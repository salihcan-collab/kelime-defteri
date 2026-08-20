import { AuthedShell } from '@/components/layout/AuthedShell';
import { Panel } from '@/components/ui/Card';
import { ThemePicker } from '@/components/settings/ThemePicker';
import { FontPicker } from '@/components/settings/FontPicker';
import { HighlightStylePicker } from '@/components/settings/HighlightStylePicker';
import { PreferenceSliders } from '@/components/settings/PreferenceSliders';
import { isAiConfigured, AI_MODEL_INFO } from '@/lib/openai';

export default function SettingsPage() {
  const aiConfigured = isAiConfigured();

  return (
    <AuthedShell>
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold text-ink">Settings</h1>

        <Panel>
          <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-ink-soft">Theme</h2>
          <ThemePicker />
        </Panel>

        <Panel>
          <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-ink-soft">Font style</h2>
          <FontPicker />
        </Panel>

        <Panel>
          <h2 className="mb-1 font-heading text-sm font-semibold uppercase tracking-wide text-ink-soft">Word highlighting</h2>
          <p className="mb-3 text-sm text-ink-soft">How the target word is emphasized inside example sentences.</p>
          <HighlightStylePicker />
        </Panel>

        <Panel>
          <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-ink-soft">Preferences</h2>
          <PreferenceSliders />
        </Panel>

        <Panel>
          <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-ink-soft">AI status</h2>
          {aiConfigured ? (
            <p className="text-sm text-success">
              ✅ Connected — using <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-ink">{AI_MODEL_INFO.primary}</code> (falls back to{' '}
              <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-ink">{AI_MODEL_INFO.fallback}</code> if unavailable).
            </p>
          ) : (
            <p className="text-sm text-warn">
              ⚠️ Not configured — set <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-ink">OPENAI_API_KEY</code> in your server
              environment to enable AI card-fill, IPA generation, and AI quiz questions. The app works fully as a manual notebook without it.
            </p>
          )}
        </Panel>
      </div>
    </AuthedShell>
  );
}
