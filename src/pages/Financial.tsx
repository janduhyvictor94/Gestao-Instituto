import { useEffect, useState } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, CreditCard as Edit, Trash2, Check, AlertTriangle, Search } from 'lucide-react';
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

export default function Financial({ clinic }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [tab, setTab] = useState<'expense' | 'income' | 'paid'>('expense');
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialRecord | null>(null);
  const [form, setForm] = useState<RecordForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [recRes, catRes] = await Promise.all([
      supabase.from('financial_records').select('*, category:financial_categories(id,name,color,type)').eq('clinic_id', clinic.id).order('due_date', { ascending: false }),
      supabase.from('financial_categories').select('*').eq('clinic_id', clinic.id).eq('active', true).order('name'),
    ]);
    setRecords((recRes.data as FinancialRecord[]) || []);
    setCategories((catRes.data as FinancialCategory[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [clinic.id]);

  const filteredRecords = records.filter(r => {
    if (tab === 'expense') return r.type === 'expense' && r.status !== 'paid' && r.status !== 'cancelled';
    if (tab === 'income') return r.type === 'income' && r.status !== 'paid' && r.status !== 'cancelled';
    return r.status === 'paid';
  }).filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.description.toLowerCase().includes(q) ||
      ((r.category as FinancialCategory)?.name || '').toLowerCase().includes(q);
  });

  const totalExpenses = records.filter(r => r.type === 'expense' && r.status !== 'paid' && r.status !== 'cancelled').reduce((s, r) => s + r.amount, 0);
  const totalIncome = records.filter(r => r.type === 'income' && r.status !== 'paid' && r.status !== 'cancelled').reduce((s, r) => s + r.amount, 0);
  const totalPaid = records.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
  const overdueCount = records.filter(r => r.status === 'pending' && new Date(r.due_date) < new Date(today)).length;

  const openCreate = (type: string) => {
    setEditing(null);
    setForm({ ...emptyForm, type, due_date: today });
    setModalOpen(true);
  };

  const openEdit = (r: FinancialRecord) => {
    setEditing(r);
    setForm({
      type: r.type, category_id: r.category_id || '', description: r.description,
      amount: String(r.amount), status: r.status, due_date: r.due_date, notes: r.notes,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    const payload = {
      clinic_id: clinic.id, category_id: form.category_id || null, type: form.type,
      description: form.description, amount: parseFloat(form.amount) || 0,
      status: form.status, due_date: form.due_date || today,
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

  const filteredCategories = categories.filter(c => c.type === form.type);

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
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center"><TrendingDown size={20} className="text-rose-600" /></div>
            <div>
              <p className="text-gray-500 text-xs">Despesas Pendentes</p>
              <p className="text-rose-600 font-bold text-lg">{fmt(totalExpenses)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center"><TrendingUp size={20} className="text-emerald-600" /></div>
            <div>
              <p className="text-gray-500 text-xs">Receitas Pendentes</p>
              <p className="text-emerald-700 font-bold text-lg">{fmt(totalIncome)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center"><DollarSign size={20} className="text-teal-600" /></div>
            <div>
              <p className="text-gray-500 text-xs">Total Concluído</p>
              <p className="text-teal-700 font-bold text-lg">{fmt(totalPaid)}</p>
            </div>
          </div>
        </div>
      </div>

      {overdueCount > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-rose-600" />
          <p className="text-rose-700 text-sm font-medium">{overdueCount} registro(s) vencido(s)</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button onClick={() => setTab('expense')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'expense' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Despesas ({records.filter(r => r.type === 'expense' && r.status !== 'paid' && r.status !== 'cancelled').length})
          </button>
          <button onClick={() => setTab('income')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'income' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Receitas ({records.filter(r => r.type === 'income' && r.status !== 'paid' && r.status !== 'cancelled').length})
          </button>
          <button onClick={() => setTab('paid')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'paid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Concluídos ({records.filter(r => r.status === 'paid').length})
          </button>
        </div>
        <div className="relative w-56">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
            className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-400">
              <DollarSign size={40} className="mb-3 opacity-30" />
              <p>Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredRecords.map(r => {
                const isOverdue = r.status === 'pending' && new Date(r.due_date) < new Date(today);
                const cat = r.category as FinancialCategory | null;
                return (
                  <div key={r.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${isOverdue ? 'bg-rose-50/50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{r.description}</p>
                      <div className="flex gap-2 mt-0.5 flex-wrap">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${r.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {FINANCIAL_TYPES[r.type]}
                        </span>
                        {cat && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: cat.color + '20', color: cat.color }}>
                            {cat.name}
                          </span>
                        )}
                        <span className={`text-xs ${isOverdue ? 'text-rose-600 font-medium' : 'text-gray-400'}`}>
                          Vence: {new Date(r.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        {r.paid_at && (
                          <span className="text-xs text-emerald-600">
                            Pago em: {new Date(r.paid_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusColors[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {FINANCIAL_STATUSES[r.status] || r.status}
                    </span>
                    <p className={`font-semibold text-sm flex-shrink-0 ${r.type === 'income' ? 'text-emerald-700' : 'text-rose-600'}`}>{fmt(r.amount)}</p>
                    <div className="flex gap-1 flex-shrink-0">
                      {r.status === 'pending' && (
                        <button onClick={() => handleMarkPaid(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50" title="Marcar como pago">
                          <Check size={14} />
                        </button>
                      )}
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"><Edit size={14} /></button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 size={14} /></button>
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
              <label className="text-sm font-medium text-gray-700 block mb-1">Tipo</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, category_id: '' })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {Object.entries(FINANCIAL_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Categoria</label>
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Sem categoria</option>
                {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Descrição *</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Valor (R$) *</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Vencimento</label>
                <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {Object.entries(FINANCIAL_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Observações</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setModalOpen(false)} className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.description.trim() || !form.amount}
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
