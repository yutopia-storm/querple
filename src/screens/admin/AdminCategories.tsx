import { useEffect, useState } from 'react';
import { Plus, Trash2, GripVertical, Loader2, FolderTree } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { cn } from '@/lib/utils';
import { logAdminAction } from '@/screens/AdminDashboard';
import type { Category } from '@/lib/types';

const ICON_OPTIONS = ['Landmark', 'Scale', 'Leaf', 'GraduationCap', 'HeartPulse', 'Cpu', 'TrendingUp', 'FlaskConical', 'Users', 'Trophy', 'Clapperboard', 'TrainFront', 'Palette'];
const COLOR_OPTIONS = ['#ef4444', '#0ea5e9', '#22c55e', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4', '#a855f7', '#eab308'];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function AdminCategories() {
  const toast = useToast();
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('FolderTree');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('sort_order');
    setCats((data as Category[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addCategory() {
    if (!name.trim()) return;
    const maxOrder = cats.reduce((m, c) => Math.max(m, c.sort_order), 0);
    const { error } = await supabase.from('categories').insert({
      name: name.trim(),
      slug: slugify(name),
      icon,
      color,
      sort_order: maxOrder + 1,
    });
    if (error) { toast(error.message, 'error'); return; }
    await logAdminAction('add_category', 'category', undefined, { name });
    toast('Category added.', 'success');
    setName(''); setAddOpen(false);
    load();
  }

  async function toggleDisable(c: Category) {
    const { error } = await supabase.from('categories').update({ is_disabled: !c.is_disabled }).eq('id', c.id);
    if (error) { toast(error.message, 'error'); return; }
    await logAdminAction(c.is_disabled ? 'enable_category' : 'disable_category', 'category', c.id, { name: c.name });
    toast(c.is_disabled ? 'Category enabled.' : 'Category disabled.', 'success');
    load();
  }

  async function deleteCategory(c: Category) {
    const { error } = await supabase.from('categories').delete().eq('id', c.id);
    if (error) { toast(error.message, 'error'); return; }
    await logAdminAction('delete_category', 'category', c.id, { name: c.name });
    toast('Category deleted.', 'success');
    load();
  }

  async function reorder(c: Category, dir: -1 | 1) {
    const idx = cats.findIndex((x) => x.id === c.id);
    const swap = cats[idx + dir];
    if (!swap) return;
    await supabase.from('categories').update({ sort_order: swap.sort_order }).eq('id', c.id);
    await supabase.from('categories').update({ sort_order: c.sort_order }).eq('id', swap.id);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Categories</h1>
        <button onClick={() => setAddOpen(true)} className="btn-primary"><Plus size={16} /> Add category</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ink-400" size={24} /></div>
      ) : (
        <div className="space-y-2">
          {cats.map((c, i) => (
            <div key={c.id} className="card flex items-center gap-3 p-4">
              <div className="flex flex-col">
                <button onClick={() => reorder(c, -1)} disabled={i === 0} className="text-ink-300 hover:text-ink-600 disabled:opacity-30"><GripVertical size={14} className="rotate-180" /></button>
                <button onClick={() => reorder(c, 1)} disabled={i === cats.length - 1} className="text-ink-300 hover:text-ink-600 disabled:opacity-30"><GripVertical size={14} /></button>
              </div>
              <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: c.color ?? '#64748b' }} />
              <div className="flex-1">
                <p className="font-medium text-ink-900 dark:text-white">{c.name}</p>
                <p className="text-xs text-ink-400">/{c.slug}</p>
              </div>
              {c.is_disabled && <span className="chip bg-ink-100 text-ink-400 dark:bg-ink-800">Disabled</span>}
              <button onClick={() => toggleDisable(c)} className="btn-ghost text-xs">{c.is_disabled ? 'Enable' : 'Disable'}</button>
              <button onClick={() => deleteCategory(c)} className="btn-ghost text-xs text-drag-600"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add category" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Philosophy" />
          </div>
          <div>
            <label className="label">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((ic) => (
                <button key={ic} onClick={() => setIcon(ic)} className={cn('rounded-lg border px-2.5 py-1.5 text-xs', icon === ic ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30' : 'border-ink-200 dark:border-ink-700')}>{ic}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Colour</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((co) => (
                <button key={co} onClick={() => setColor(co)} className={cn('h-8 w-8 rounded-lg border-2', color === co ? 'border-ink-900 dark:border-white' : 'border-transparent')} style={{ backgroundColor: co }} />
              ))}
            </div>
          </div>
          <button onClick={addCategory} disabled={!name.trim()} className="btn-primary w-full">Add category</button>
        </div>
      </Modal>
    </div>
  );
}
