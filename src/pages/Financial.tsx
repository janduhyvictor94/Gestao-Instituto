import { useEffect, useState, useCallback } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, CreditCard as Edit, Trash2, Check, AlertTriangle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Clinic, FinancialRecord, FinancialCategory, FINANCIAL_TYPES, FINANCIAL_STATUSES } from '../types';
import Modal from '../components/Modal';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface RecordForm {
  type: string;
  category_id: string;
  description: string;
  amount: string;
  status: string;
  due_date: string;
  notes: string;
}

const emptyForm: RecordForm = { type: 'expense', category_id: '', description: '', amount: '', status: 'pending', due_date: '', notes: '' };

interface Props {
  clinic: Clinic;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-rose-100 text-rose-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

type ViewMode = 'day' | 'month' | 'year';

export default function Financial({ clinic }: Props) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [date, setDate] = useState(todayStr);
  const [tab, setTab] = useState<'expense' | 'income' | 'paid'>('expense');
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialRecord | null>(null);
  const [form, setForm] = useState<RecordForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [recRes, catRes] = await Promise.all([
      supabase.from('financial_records').select('*, category:financial_categories(id,name,color,type)').eq('clinic_id', clinic.id).order('due_date', { ascending: false }),
      supabase.from('financial_categories').select('*').eq('clinic_id', clinic.id).eq('active', true).order('name'),
    ]);
    setRecords((recRes.data as FinancialRecord[]) || []);
    setCategories((catRes.data as FinancialCategory[]) || []);
    setLoading(false);
  }, [clinic.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const navigate = (dir: 'prev' | 'next') => {
    const d = new Date(date + 'T12:00:00');
    if (viewMode === 'day') d.setDate(d.getDate() + (dir === 'next' ? 1 : -1));
    else if (viewMode === 'month') d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1));
    else if (viewMode === 'year') d.setFullYear(d.getFullYear() + (dir === 'next' ? 1 : -1));
    setDate(d.toISOString().split('T')[0]);
  };

  const filteredByPeriod = records.filter(r => {
    if (viewMode === 'day') return r.due_date === date;
    if (viewMode === 'month') return r.due_date.startsWith(date.slice(0, 7));
    return r.due_date.startsWith(date.slice(0, 4));
  });

  const filteredRecords = filteredByPeriod.filter(r => {
    if (tab === 'expense') return r.type === 'expense' && r.status !== 'cancelled';
    if (tab === 'income') return r.type === 'income' && r.status !== 'cancelled';
    return r.status === 'paid';
  }).filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.description.toLowerCase().includes(q) ||
      ((r.category as FinancialCategory)?.name || '').toLowerCase().includes(q);
  });

  const totalExpensesPending = filteredByPeriod
    .filter(r => r.type === 'expense' && r.status !== 'paid' && r.status !== 'cancelled')
    .reduce((s, r) => s + r.amount, 0);

  const totalIncomePending = filteredByPeriod
    .filter(r => r.type === 'income' && r.status !== 'paid' && r.status !== 'cancelled')
    .reduce((s, r) => s + r.amount, 0);

  const totalIncomePaid = filteredByPeriod
    .filter(r => r.type === 'income' && r.status === 'paid')
    .reduce((s, r) => s + r.amount, 0);

  const totalExpensePaid = filteredByPeriod
    .filter(r => r.type === 'expense' && r.status === 'paid')
    .reduce((s, r) => s + r.amount, 0);

  const netBalance = totalIncomePaid - totalExpensePaid;
  const overdueCount = filteredByPeriod.filter(r => r.status === 'pending' && new Date(r.due_date) < new Date(todayStr)).length;

  const openCreate = (type: string) => {
    setEditing(null);
    setForm({ ...emptyForm, type, due_date: todayStr });
    setModalOpen(true);
  };

  const openEdit = (r: FinancialRecord) => {
    setEditing(r);
    setForm({
      type: r.type,
      category_id: r.category_id || '',
      description: r.description,
      amount: String(r.amount),
      status: r.status,
      due_date: r.due_date,
      notes: r.notes || '', // Garantia de string para evitar erro
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    const payload = {
      clinic_id: clinic.id, category_id: form.category_id || null, type: form.type,
      description: form.description, amount: parseFloat(form.amount) || 0,
      status: form.status, due_date: form.due_date || todayStr,
      paid_at: form.status === 'paid' ? new Date().toISOString() : null, notes: form.notes,
    };
    if (editing) {
      await supabase.from('financial_records').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('financial_records').insert(payload);
    }
    setSaving(false); setModalOpen(false); fetchData();
  };

  const handleMarkPaid = async (r: FinancialRecord) => {
    await supabase.from('financial_records').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', r.id);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este registro?')) return;
    await supabase.from('financial_records').delete().eq('id', id);
    fetchData();
  };

  const periodLabel = () => {
    const d = new Date(date + 'T12:00:00');
    if (viewMode === 'day') return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    if (viewMode === 'month') return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return String(d.getFullYear());
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <button onClick={() => openCreate('expense')}
            className="flex items-center gap-2 bg-rose-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-rose-600 transition-colors">
            <Plus size={16} /> Despesa
          </button>
          <button onClick={() => openCreate('income')}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus size={16} /> Receita
          </button>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mr-2">
            {(['day', 'month', 'year'] as ViewMode[]).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter transition-all ${viewMode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                {m === 'day' ? 'Dia' : m === 'month' ? 'Mês' : 'Ano'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('prev')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><ChevronLeft size={18} /></button>
            <span className="text-sm font-black text-gray-700 min-w-[120px] text-center uppercase">
              {periodLabel()}
            </span>
            <button onClick={() => navigate('next')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center"><TrendingDown size={20} className="text-rose-600" /></div>
            <div>
              <p className="text-gray-500 text-xs">A Pagar no Período</p>
              <p className="text-rose-600 font-bold text-lg">{fmt(totalExpensesPending)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center"><TrendingUp size={20} className="text-emerald-600" /></div>
            <div>
              <p className="text-gray-500 text-xs">A Receber no Período</p>
              <p className="text-emerald-700 font-bold text-lg">{fmt(totalIncomePending)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${netBalance >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <DollarSign size={20} className={netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
            </div>
            <div>
              <p className="text-gray-500 text-xs">Saldo (Pago)</p>
              <p className={`font-bold text-lg ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {netBalance < 0 && '- '}{fmt(Math.abs(netBalance))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {overdueCount > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-rose-600" />
          <p className="text-rose-700 text-sm font-medium">{overdueCount} registro(s) vencido(s) neste período</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl shadow-sm">
          <button onClick={() => setTab('expense')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${tab === 'expense' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>
            Despesas ({filteredByPeriod.filter(r => r.type === 'expense' && r.status !== 'cancelled').length})
          </button>
          <button onClick={() => setTab('income')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${tab === 'income' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>
            Receitas ({filteredByPeriod.filter(r => r.type === 'income' && r.status !== 'cancelled').length})
          </button>
          <button onClick={() => setTab('paid')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${tab === 'paid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>
            Concluídos ({filteredByPeriod.filter(r => r.status === 'paid').length})
          </button>
        </div>
        <div className="relative w-56">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
            className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-[3px] border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center py-24 text-gray-300">
              <DollarSign size={48} className="mb-3 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-xs">Vazio neste período</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredRecords.map(r => {
                const isOverdue = r.status === 'pending' && new Date(r.due_date) < new Date(todayStr);
                const cat = r.category as FinancialCategory | null;
                return (
                  <div key={r.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${isOverdue ? 'bg-rose-50/30' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{r.description}</p>
                      <div className="flex gap-3 mt-1 flex-wrap items-center">
                        <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${r.type === 'income' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                          {FINANCIAL_TYPES[r.type]}
                        </span>
                        {cat && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1" style={{ backgroundColor: cat.color + '15', color: cat.color }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} /> {cat.name}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold uppercase ${isOverdue ? 'text-rose-600' : 'text-gray-400'}`}>
                          Vence: {new Date(r.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        {r.paid_at && (
                          <span className="text-[10px] font-bold text-emerald-600 uppercase">
                            Pago em: {new Date(r.paid_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 border ${statusColors[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {FINANCIAL_STATUSES[r.status] || r.status}
                    </span>
                    <p className={`font-black text-sm flex-shrink-0 ${r.type === 'income' ? 'text-emerald-700' : 'text-rose-600'}`}>{fmt(r.amount)}</p>
                    <div className="flex gap-1 flex-shrink-0 ml-2">
                      {r.status === 'pending' && (
                        <button onClick={() => handleMarkPaid(r)} className="p-2 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all" title="Marcar como pago">
                          <Check size={16} />
                        </button>
                      )}
                      <button onClick={() => openEdit(r)} className="p-2 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(r.id)} className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <Modal title={editing ? 'Editar Registro' : `Nova ${form.type === 'expense' ? 'Despesa' : 'Receita'}`} onClose={() => setModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Tipo</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, category_id: '' })}
                className="w-full border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500">
                {Object.entries(FINANCIAL_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Categoria</label>
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}
                className="w-full border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500">
                <option value="">Sem categoria</option>
                {categories.filter(c => c.type === form.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Descrição *</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Valor (R$) *</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full border-gray-200 rounded-xl px-4 py-2.5 text-sm font-black focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Vencimento</label>
                <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                  className="w-full border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500">
                {Object.entries(FINANCIAL_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 border-2 border-gray-100 py-3 rounded-xl text-[10px] font-black uppercase text-gray-400 hover:bg-gray-50 transition-all">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.description.trim() || !form.amount}
                className="flex-1 text-white rounded-xl py-3 text-[10px] font-black uppercase shadow-lg disabled:opacity-50 transition-all active:scale-95"
                style={{ backgroundColor: clinic.color }}>
                {saving ? 'Processando...' : 'Salvar Registro'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}