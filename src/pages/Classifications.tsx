import { useEffect, useState } from 'react';
import { Plus, Tag, CreditCard as Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Clinic, PatientClassification } from '../types';
import Modal from '../components/Modal';

interface ClsForm { name: string; color: string; sort_order: string; }
const emptyForm: ClsForm = { name: '', color: '#3B82F6', sort_order: '0' };

interface Props { clinic: Clinic; }

export default function Classifications({ clinic }: Props) {
  const [classifications, setClassifications] = useState<PatientClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PatientClassification | null>(null);
  const [form, setForm] = useState<ClsForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const { data } = await supabase.from('patient_classifications').select('*').eq('clinic_id', clinic.id).order('sort_order');
    setClassifications(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [clinic.id]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, sort_order: String(classifications.length + 1) }); setModalOpen(true); };
  const openEdit = (c: PatientClassification) => {
    setEditing(c);
    setForm({ name: c.name, color: c.color, sort_order: String(c.sort_order) });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { clinic_id: clinic.id, name: form.name, color: form.color, sort_order: parseInt(form.sort_order) || 0 };
    if (editing) {
      await supabase.from('patient_classifications').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('patient_classifications').insert(payload);
    }
    setSaving(false); setModalOpen(false); fetchData();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from('patient_classifications').update({ active: !active }).eq('id', id);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta classificação?')) return;
    await supabase.from('patient_classifications').delete().eq('id', id);
    fetchData();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={openCreate} className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ backgroundColor: clinic.color }}>
          <Plus size={16} /> Nova Classificação
        </button>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500">Classificações de pacientes para controle de atendimentos. Crie novas nomenclaturas conforme a necessidade da clínica.</p>
      </div>

      {classifications.length === 0 ? (
        <div className="bg-white rounded-2xl flex flex-col items-center py-16 text-gray-400 shadow-sm border border-gray-100">
          <Tag size={40} className="mb-3 opacity-30" />
          <p>Nenhuma classificação cadastrada</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classifications.map(c => (
            <div key={c.id} className={`bg-white rounded-2xl p-5 shadow-sm border transition-all ${c.active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color }} />
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleToggle(c.id, c.active)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.active ? 'Ativo' : 'Inativo'}
                  </button>
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"><Edit size={14} /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-xs text-gray-400">Ordem: {c.sort_order}</p>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title={editing ? 'Editar Classificação' : 'Nova Classificação'} onClose={() => setModalOpen(false)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nome *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Retorno, Urgência..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
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
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Ordem</label>
              <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
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
