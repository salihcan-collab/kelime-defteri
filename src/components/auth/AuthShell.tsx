export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-3xl" aria-hidden>
            📖
          </div>
          <h1 className="mt-2 font-heading text-xl font-semibold text-ink">Kelime Defteri</h1>
          <p className="text-sm text-ink-soft">Your digital vocabulary notebook</p>
        </div>
        <div className="rounded-notebook border border-line bg-card p-6 shadow-notebook">
          <h2 className="mb-1 font-heading text-lg font-semibold text-ink">{title}</h2>
          <p className="mb-5 text-sm text-ink-soft">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
