import { useEffect, useState } from 'react';
import { Plus, Tag, CreditCard as Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Clinic, FinancialCategory } from '../types';
import Modal from '../components/Modal';

interface CatForm { name: string; type: string; color: string; }
const emptyForm: CatForm = { name: '', type: 'expense', color: '#6B7280' };

interface Props { clinic: Clinic; }

export default function Categories({ clinic }: Props) {
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialCategory | null>(null);
  const [form, setForm] = useState<CatForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const { data } = await supabase.from('financial_categories').select('*').eq('clinic_id', clinic.id).order('type').order('name');
    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [clinic.id]);

  const openCreate = (type: string) => { setEditing(null); setForm({ ...emptyForm, type }); setModalOpen(true); };
  const openEdit = (c: FinancialCategory) => {
    setEditing(c);
    setForm({ name: c.name, type: c.type, color: c.color });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { clinic_id: clinic.id, name: form.name, type: form.type, color: form.color };
    if (editing) {
      await supabase.from('financial_categories').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('financial_categories').insert(payload);
    }
    setSaving(false); setModalOpen(false); fetchData();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from('financial_categories').update({ active: !active }).eq('id', id);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta categoria?')) return;
    await supabase.from('financial_categories').delete().eq('id', id);
    fetchData();
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 justify-end">
        <button onClick={() => openCreate('expense')} className="flex items-center gap-2 bg-rose-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-rose-600 transition-colors">
          <Plus size={16} /> Cat. Despesa
        </button>
        <button onClick={() => openCreate('income')} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
          <Plus size={16} /> Cat. Receita
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Tag size={16} className="text-rose-500" />
            Categorias de Despesa
          </h3>
          {expenseCategories.length === 0 ? (
            <div className="bg-white rounded-2xl flex flex-col items-center py-12 text-gray-400 shadow-sm border border-gray-100">
              <p className="text-sm">Nenhuma categoria de despesa</p>
            </div>
          ) : (
            <div className="space-y-2">
              {expenseCategories.map(c => (
                <div key={c.id} className={`bg-white rounded-xl p-4 shadow-sm border flex items-center justify-between ${!c.active ? 'opacity-50' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="font-medium text-gray-900 text-sm">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggle(c.id, c.active)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.active ? 'Ativo' : 'Inativo'}
                    </button>
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"><Edit size={13} /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Tag size={16} className="text-emerald-600" />
            Categorias de Receita
          </h3>
          {incomeCategories.length === 0 ? (
            <div className="bg-white rounded-2xl flex flex-col items-center py-12 text-gray-400 shadow-sm border border-gray-100">
              <p className="text-sm">Nenhuma categoria de receita</p>
            </div>
          ) : (
            <div className="space-y-2">
              {incomeCategories.map(c => (
                <div key={c.id} className={`bg-white rounded-xl p-4 shadow-sm border flex items-center justify-between ${!c.active ? 'opacity-50' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="font-medium text-gray-900 text-sm">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggle(c.id, c.active)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.active ? 'Ativo' : 'Inativo'}
                    </button>
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"><Edit size={13} /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Editar Categoria' : 'Nova Categoria'} onClose={() => setModalOpen(false)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nome *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tipo</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Cor</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                <input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setModalOpen(false)} className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
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
