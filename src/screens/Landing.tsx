import { ArrowRight, Flame, Zap, Archive, Search, Shield, Vote, EyeOff } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export function Landing({ navigate }: { navigate: (to: string) => void }) {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Logo size={30} />
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="btn-ghost h-9 w-9 p-0" aria-label="Toggle theme">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button onClick={() => navigate('/login')} className="btn-ghost">Sign in</button>
          <button onClick={() => navigate('/signup')} className="btn-primary">Get started</button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        {/* Hero */}
        <section className="flex flex-col items-center py-16 text-center sm:py-24">
          <span className="chip mb-6 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
            <Vote size={13} /> The public decides what deserves discussion
          </span>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-ink-900 dark:text-white sm:text-5xl">
            Ideas must earn attention before they earn discussion.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-500 dark:text-ink-400">
            Every statement enters a public voting phase. Only those that generate enough participation
            reach Turbo — where the reasoning is revealed and debate begins.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => navigate('/signup')} className="btn-primary px-6 py-3 text-base">
              Create your account <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate('/login')} className="btn-secondary px-6 py-3 text-base">
              I already have one
            </button>
          </div>
        </section>

        {/* Lifecycle */}
        <section className="grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Flame, title: 'Live', desc: 'Statements collect votes. The author\'s reasoning stays hidden.', color: 'text-orange-500' },
            { icon: Zap, title: 'Turbo', desc: 'Enough participation unlocks reasoning and opens discussion.', color: 'text-brand-500' },
            { icon: Archive, title: 'Archive', desc: 'After 14 days, every discussion becomes a permanent record.', color: 'text-ink-500' },
            { icon: EyeOff, title: 'Stalled', desc: 'Statements that don\'t earn attention simply fade away.', color: 'text-ink-400' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="card p-5">
                <Icon size={22} className={s.color} />
                <h3 className="mt-3 font-semibold text-ink-900 dark:text-white">{s.title}</h3>
                <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{s.desc}</p>
              </div>
            );
          })}
        </section>

        {/* Principles */}
        <section className="grid gap-4 py-8 lg:grid-cols-3">
          {[
            { icon: Vote, title: 'Vote blind', desc: 'You won\'t see the current percentages until after you cast your vote. Judge on merit, not momentum.' },
            { icon: Shield, title: 'Moderate behaviour, not opinion', desc: 'Controversial views are welcome. Hate speech and harassment are not. Opinions are never removed for being unpopular.' },
            { icon: Search, title: 'A permanent record', desc: 'Every Turbo statement is archived forever — agree %, disagree %, comments and all. A timeline of how public opinion shifts.' },
          ].map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 dark:bg-ink-800">
                  <Icon size={20} className="text-ink-700 dark:text-ink-200" />
                </div>
                <h3 className="mt-4 font-semibold text-ink-900 dark:text-white">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{p.desc}</p>
              </div>
            );
          })}
        </section>

        {/* CTA */}
        <section className="my-12 overflow-hidden rounded-3xl bg-ink-900 px-8 py-12 text-center dark:bg-ink-900">
          <h2 className="text-3xl font-bold tracking-tight text-white">What does the public believe is worth talking about?</h2>
          <p className="mx-auto mt-3 max-w-lg text-ink-300">Only after society answers that question does the conversation begin.</p>
          <button onClick={() => navigate('/signup')} className="btn-accent mt-7 px-6 py-3 text-base">
            Join Yevox <ArrowRight size={18} />
          </button>
        </section>

        <footer className="border-t border-ink-200 py-8 text-center text-sm text-ink-400 dark:border-ink-800">
          <Logo size={22} />
          <p className="mt-2">Statements are judged before they are debated.</p>
        </footer>
      </main>
    </div>
  );
}
