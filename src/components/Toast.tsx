import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

const ToastContext = createContext<{
  toast: (message: string, type?: ToastType) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const remove = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex animate-slide-up items-start gap-2.5 rounded-xl border p-3.5 text-sm shadow-float',
              t.type === 'success' && 'border-brand-200 bg-white text-ink-800 dark:border-brand-800 dark:bg-ink-900 dark:text-ink-100',
              t.type === 'error' && 'border-drag-500/30 bg-white text-ink-800 dark:border-drag-500/40 dark:bg-ink-900 dark:text-ink-100',
              t.type === 'info' && 'border-ink-200 bg-white text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100',
            )}
          >
            {t.type === 'success' && <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-600" />}
            {t.type === 'error' && <AlertCircle size={18} className="mt-0.5 shrink-0 text-drag-600" />}
            {t.type === 'info' && <Info size={18} className="mt-0.5 shrink-0 text-ink-500" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="text-ink-400 hover:text-ink-600 dark:hover:text-ink-200">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}
