import { useEffect, useState } from 'react';
import { Plus, Target, CreditCard as Edit, Trash2, TrendingUp, Users, DollarSign, CalendarDays } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Clinic, Goal, GOAL_TYPES } from '../types';
import Modal from '../components/Modal';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface GoalForm {
  type: string;
  month: string;
  target: string;
  notes: string;
}

const emptyForm: GoalForm = { type: 'patients', month: '', target: '', notes: '' };

const goalIcons: Record<string, React.ElementType> = {
  patients: Users,
  revenue: DollarSign,
  leads: TrendingUp,
  appointments: CalendarDays,
};

const goalColors: Record<string, string> = {
  patients: '#3B82F6',
  revenue: '#059669',
  leads: '#D97706',
  appointments: '#7C3AED',
};

interface Props {
  clinic: Clinic;
}

export default function Goals({ clinic }: Props) {
  // CORREÇÃO DE FUSO HORÁRIO: Garante o mês correto de São Paulo/Brasília
  const now = new Date();
  const spDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(now);
  const currentMonth = spDate.slice(0, 7); 

  const [month, setMonth] = useState(currentMonth);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('goals').select('*').eq('clinic_id', clinic.id).eq('month', month).order('type');
    setGoals(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [clinic.id, month]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, month });
    setModalOpen(true);
  };

  const openEdit = (g: Goal) => {
    setEditing(g);
    // CORREÇÃO DO ERRO TS2322: Adicionado || '' para garantir que notes nunca seja undefined
    setForm({ 
      type: g.type, 
      month: g.month, 
      target: String(g.target), 
      notes: g.notes || '' 
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.target || !form.month) return;
    setSaving(true);
    const payload = {
      clinic_id: clinic.id,
      type: form.type,
      month: form.month,
      target: parseFloat(form.target) || 0,
      current: editing ? editing.current : 0,
      notes: form.notes,
    };
    if (editing) {
      await supabase.from('goals').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('goals').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta meta?')) return;
    await supabase.from('goals').delete().eq('id', id);
    fetchData();
  };

  const updateCurrent = async (id: string, current: number) => {
    await supabase.from('goals').update({ current: Math.max(0, current) }).eq('id', id);
    fetchData();
  };

  const monthLabel = new Date(month + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const getProgress = (g: Goal) => {
    if (g.target <= 0) return 0;
    return Math.min(100, Math.round((g.current / g.target) * 100));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <button onClick={() => setMonth(currentMonth)} className="text-xs font-bold hover:underline" style={{ color: clinic.color }}>
            Mês atual
          </button>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ backgroundColor: clinic.color }}>
          <Plus size={16} /> Nova Meta
        </button>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Target size={18} style={{ color: clinic.color }} />
            Metas de <span className="capitalize">{monthLabel}</span>
          </h3>
          <p className="text-sm text-gray-500">{goals.length} meta(s)</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : goals.length === 0 ? (
        <div className="bg-white rounded-2xl flex flex-col items-center py-16 text-gray-400 shadow-sm border border-gray-100">
          <Target size={40} className="mb-3 opacity-30" />
          <p>Nenhuma meta cadastrada para este mês</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {goals.map(g => {
            const Icon = goalIcons[g.type] || Target;
            const color = goalColors[g.type] || clinic.color;
            const progress = getProgress(g);
            const isComplete = progress >= 100;
            const isRevenue = g.type === 'revenue';

            return (
              <div key={g.id} className={`bg-white rounded-2xl p-6 shadow-sm border transition-all ${isComplete ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '15' }}>
                      <Icon size={20} style={{ color }} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{GOAL_TYPES[g.type] || g.type}</h4>
                      {g.notes && <p className="text-xs text-gray-500 mt-0.5">{g.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"><Edit size={14} /></button>
                    <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-end justify-between mb-1.5">
                    <div>
                      <p className="text-xs text-gray-500">Atual</p>
                      <p className="text-2xl font-bold" style={{ color }}>{isRevenue ? fmt(g.current) : g.current}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Meta</p>
                      <p className="text-lg font-semibold text-gray-700">{isRevenue ? fmt(g.target) : g.target}</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${progress}%`, backgroundColor: isComplete ? '#059669' : color }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Atualizar progresso:</span>
                  <input
                    type="number"
                    min="0"
                    step={isRevenue ? '0.01' : '1'}
                    value={g.current}
                    onChange={e => updateCurrent(g.id, parseFloat(e.target.value) || 0)}
                    className="w-24 text-center text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <Modal title={editing ? 'Editar Meta' : 'Nova Meta'} onClose={() => setModalOpen(false)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tipo de Meta *</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {Object.entries(GOAL_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Mês *</label>
              <input type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Valor da Meta {form.type === 'revenue' ? '(R$)' : ''} *
              </label>
              <input type="number" step={form.type === 'revenue' ? '0.01' : '1'} value={form.target}
                onChange={e => setForm({ ...form, target: e.target.value })}
                placeholder={form.type === 'revenue' ? 'Ex: 50000' : 'Ex: 100'}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Observações</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Detalhes sobre a meta..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setModalOpen(false)} className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.target || !form.month}
                className="flex-1 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: clinic.color }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}