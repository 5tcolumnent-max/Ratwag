import { useState } from 'react';
import { DollarSign, Users, Cpu, TrendingUp, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { BudgetItem } from '../../lib/database.types';
import { useAuth } from '../../lib/authContext';

interface Props {
  items: BudgetItem[];
  onRefresh: () => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof DollarSign; color: string }> = {
  personnel: { label: 'Personnel', icon: Users, color: 'text-sky-400' },
  hardware: { label: 'Hardware', icon: Cpu, color: 'text-violet-400' },
  overhead: { label: 'Overhead', icon: TrendingUp, color: 'text-amber-400' },
  indirect: { label: 'Indirect', icon: DollarSign, color: 'text-slate-400' },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function UtilizationBar({ allocated, spent }: { allocated: number; spent: number }) {
  const pct = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
  const isOverBudget = spent > allocated;
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
        <span>{formatCurrency(spent)} spent</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CategorySummary({ category, items }: { category: string; items: BudgetItem[] }) {
  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['indirect'];
  const Icon = cfg.icon;
  const totalAllocated = items.reduce((s, i) => s + Number(i.allocated_amount), 0);
  const totalSpent = items.reduce((s, i) => s + Number(i.spent_amount), 0);

  return (
    <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${cfg.color}`} />
        <span className="text-sm font-semibold text-slate-200">{cfg.label}</span>
        <span className="ml-auto text-xs text-slate-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="text-xl font-bold text-white">{formatCurrency(totalAllocated)}</div>
      <UtilizationBar allocated={totalAllocated} spent={totalSpent} />
    </div>
  );
}

interface NewItemForm {
  category: string;
  item_name: string;
  description: string;
  allocated_amount: string;
  spent_amount: string;
}

export default function BudgetModule({ items, onRefresh }: Props) {
  const { session } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NewItemForm>({
    category: 'personnel',
    item_name: '',
    description: '',
    allocated_amount: '',
    spent_amount: '0',
  });

  const categories = Object.keys(CATEGORY_CONFIG);
  const totalAllocated = items.reduce((s, i) => s + Number(i.allocated_amount), 0);
  const totalSpent = items.reduce((s, i) => s + Number(i.spent_amount), 0);
  const utilizationPct = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  const handleSave = async () => {
    if (!session || !form.item_name.trim()) return;
    setSaving(true);
    try {
      await supabase.from('budget_items').insert({
        user_id: session.user.id,
        category: form.category,
        item_name: form.item_name.trim(),
        description: form.description.trim(),
        allocated_amount: parseFloat(form.allocated_amount) || 0,
        spent_amount: parseFloat(form.spent_amount) || 0,
      });
      setForm({ category: 'personnel', item_name: '', description: '', allocated_amount: '', spent_amount: '0' });
      setShowForm(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const groupedItems = categories.reduce<Record<string, BudgetItem[]>>((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map(cat => (
          <CategorySummary key={cat} category={cat} items={groupedItems[cat]} />
        ))}
      </div>

      <div className="bg-slate-800/20 border border-slate-700/40 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Total Budget Utilization</h3>
            <p className="text-xs text-slate-500 mt-0.5">DOE Genesis Mission Phase I</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-white">{formatCurrency(totalAllocated)}</p>
            <p className="text-xs text-slate-500">total allocated</p>
          </div>
        </div>
        <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              utilizationPct > 90 ? 'bg-red-500' : utilizationPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${utilizationPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>{formatCurrency(totalSpent)} spent ({utilizationPct.toFixed(1)}%)</span>
          <span>{formatCurrency(totalAllocated - totalSpent)} remaining</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300">Line Items</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 bg-sky-900/20 hover:bg-sky-900/30 border border-sky-800/40 hover:border-sky-700/50 px-3 py-1.5 rounded-lg transition-all"
          >
            <Plus className="w-3 h-3" />
            Add Item
          </button>
        </div>

        {showForm && (
          <div className="mb-4 p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-slate-900/60 border border-slate-600/50 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500/60"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Item Name</label>
                <input
                  type="text"
                  value={form.item_name}
                  onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))}
                  placeholder="e.g. PI Salary (0.5 FTE)"
                  className="w-full bg-slate-900/60 border border-slate-600/50 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500/60 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Allocated ($)</label>
                <input
                  type="number"
                  value={form.allocated_amount}
                  onChange={e => setForm(f => ({ ...f, allocated_amount: e.target.value }))}
                  placeholder="0"
                  className="w-full bg-slate-900/60 border border-slate-600/50 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500/60 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Spent ($)</label>
                <input
                  type="number"
                  value={form.spent_amount}
                  onChange={e => setForm(f => ({ ...f, spent_amount: e.target.value }))}
                  placeholder="0"
                  className="w-full bg-slate-900/60 border border-slate-600/50 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500/60 placeholder:text-slate-600"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description"
                className="w-full bg-slate-900/60 border border-slate-600/50 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500/60 placeholder:text-slate-600"
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setShowForm(false)}
                className="text-xs text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.item_name.trim()}
                className="text-xs text-white bg-sky-700 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-all font-medium"
              >
                {saving ? 'Saving...' : 'Save Item'}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/40">
                <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">Item</th>
                <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">Category</th>
                <th className="text-right text-xs font-medium text-slate-500 py-2 pr-4">Allocated</th>
                <th className="text-right text-xs font-medium text-slate-500 py-2 pr-4">Spent</th>
                <th className="text-right text-xs font-medium text-slate-500 py-2">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.map(item => {
                const variance = Number(item.allocated_amount) - Number(item.spent_amount);
                const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG['indirect'];
                return (
                  <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-2.5 pr-4">
                      <p className="text-slate-200 font-medium">{item.item_name}</p>
                      {item.description && <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-right text-slate-300 font-mono text-xs">
                      {formatCurrency(Number(item.allocated_amount))}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-slate-300 font-mono text-xs">
                      {formatCurrency(Number(item.spent_amount))}
                    </td>
                    <td className={`py-2.5 text-right font-mono text-xs ${variance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500 text-sm">
                    No budget items. Add the first item above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
