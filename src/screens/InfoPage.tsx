import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function InfoPage({ slug, navigate }: { slug: string; navigate: (to: string) => void }) {
  const [page, setPage] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('informational_pages').select('title, content').eq('slug', slug).maybeSingle();
      setPage((data as { title: string; content: string }) ?? null);
      setLoading(false);
    })();
  }, [slug]);

  const titleMap: Record<string, string> = {
    'about': 'About', 'community-guidelines': 'Community Guidelines', 'privacy-policy': 'Privacy Policy',
    'terms-of-service': 'Terms of Service', 'contact': 'Contact', 'faq': 'FAQ',
  };

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => navigate('/')} className="btn-ghost mb-4 -ml-2"><ArrowLeft size={16} /> Back</button>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-ink-400" size={24} /></div>
      ) : !page ? (
        <div className="card p-8 text-center text-sm text-ink-400">Page not found.</div>
      ) : (
        <article className="card p-8">
          <h1 className="mb-4 text-2xl font-bold tracking-tight text-ink-900 dark:text-white">{page.title || titleMap[slug] || 'Page'}</h1>
          <div className="prose prose-sm max-w-none text-sm leading-relaxed text-ink-600 dark:text-ink-300">
            {page.content.split('\n').map((p, i) => (
              <p key={i} className="mb-3">{p}</p>
            ))}
          </div>
        </article>
      )}
    </div>
  );
}
