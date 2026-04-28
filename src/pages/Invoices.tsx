import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, FileText, CreditCard as Edit, Trash2, Paperclip, X, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Clinic, Invoice } from '../types';
import Modal from '../components/Modal';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface InvoiceForm { 
  number: string; 
  issuer: string; 
  amount: string; 
  date: string; 
  description: string; 
  category: string; 
  notes: string; 
  file_url: string; 
}

const emptyForm: InvoiceForm = { 
  number: '', 
  issuer: '', 
  amount: '', 
  date: '', 
  description: '', 
  category: '', 
  notes: '', 
  file_url: '' 
};

interface Props { clinic: Clinic; }

export default function Invoices({ clinic }: Props) {
  // CORREÇÃO DE FUSO HORÁRIO: Garante a data correta de São Paulo/Brasília
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filtered, setFiltered] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState<InvoiceForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchInvoices = useCallback(async () => {
    const { data } = await supabase.from('invoices').select('*').eq('clinic_id', clinic.id).order('date', { ascending: false });
    setInvoices(data || []);
    setFiltered(data || []);
    setLoading(false);
  }, [clinic.id]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(invoices.filter(i => 
      (i.number?.toLowerCase() || '').includes(q) || 
      (i.issuer?.toLowerCase() || '').includes(q) || 
      (i.description?.toLowerCase() || '').includes(q)
    ));
  }, [search, invoices]);

  const openCreate = () => { 
    setEditing(null); 
    setForm({ ...emptyForm, date: today }); 
    setSelectedFile(null);
    setModalOpen(true); 
  };
  
  const openEdit = (i: Invoice) => {
    setEditing(i);
    setForm({ 
      number: i.number || '', 
      issuer: i.issuer, 
      amount: String(i.amount), 
      date: i.date, 
      description: i.description || '', 
      category: i.category || '', 
      notes: i.notes || '',
      file_url: i.file_url || '' 
    });
    setSelectedFile(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.issuer.trim() || !form.amount) return;
    setSaving(true);

    let finalFileUrl = form.file_url;

    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, selectedFile);
        
      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('invoices')
          .getPublicUrl(fileName);
        finalFileUrl = publicUrlData.publicUrl;
      }
    }

    const payload = { 
      clinic_id: clinic.id, 
      number: form.number, 
      issuer: form.issuer, 
      amount: parseFloat(form.amount) || 0, 
      date: form.date || today, 
      description: form.description, 
      category: form.category, 
      notes: form.notes,
      file_url: finalFileUrl
    };

    if (editing) {
      await supabase.from('invoices').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('invoices').insert(payload);
    }
    
    setSaving(false); 
    setModalOpen(false); 
    fetchInvoices();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover nota fiscal?')) return;
    await supabase.from('invoices').delete().eq('id', id);
    fetchInvoices();
  };

  const totalAmount = filtered.reduce((s, i) => s + i.amount, 0);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar notas fiscais..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ backgroundColor: clinic.color }}>
          <Plus size={16} /> Nova NF
        </button>
      </div>

      {filtered.length > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex justify-between items-center">
          <p className="text-gray-600 text-sm">{filtered.length} nota(s) fiscal(is)</p>
          <p className="text-teal-700 font-bold">{fmt(totalAmount)}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <FileText size={40} className="mb-3 opacity-30" />
            <p>Nenhuma nota fiscal cadastrada</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(inv => {
              const fileUrl = inv.file_url;
              return (
                <div key={inv.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-teal-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{inv.issuer}</p>
                      {inv.number && <span className="text-xs text-gray-400">NF #{inv.number}</span>}
                    </div>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{new Date(inv.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      {inv.category && <span className="text-xs text-gray-400">{inv.category}</span>}
                      {inv.description && <span className="text-xs text-gray-400 truncate max-w-48">{inv.description}</span>}
                    </div>
                  </div>
                  <p className="text-teal-700 font-semibold">{fmt(inv.amount)}</p>
                  <div className="flex gap-1 ml-2">
                    {fileUrl && (
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 transition-colors" title="Ver Anexo">
                        <ImageIcon size={16} />
                      </a>
                    )}
                    <button onClick={() => openEdit(inv)} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(inv.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Editar Nota Fiscal' : 'Nova Nota Fiscal'} onClose={() => setModalOpen(false)}>
          <div className="space-y-4">
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">Anexo (Foto ou PDF da Nota)</label>
              {form.file_url && !selectedFile ? (
                <div className="flex items-center justify-between p-3 border border-emerald-200 bg-emerald-50 rounded-xl">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <ImageIcon size={16} className="text-emerald-600 flex-shrink-0" />
                    <span className="text-sm text-emerald-700 truncate">Anexo salvo na nuvem</span>
                  </div>
                  <div className="flex gap-2">
                    <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors">
                      <ExternalLink size={16} />
                    </a>
                    <button onClick={() => setForm({ ...form, file_url: '' })} className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors" title="Remover anexo">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : selectedFile ? (
                <div className="flex items-center justify-between p-3 border border-blue-200 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Paperclip size={16} className="text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-blue-700 truncate">{selectedFile.name}</span>
                  </div>
                  <button onClick={() => setSelectedFile(null)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Paperclip size={20} className="mb-2 text-gray-400" />
                      <p className="text-xs text-gray-500"><span className="font-semibold text-emerald-600">Clique para anexar</span> ou arraste o arquivo</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => {
                      if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
                    }} />
                  </label>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Número da NF</label>
                <input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} placeholder="Ex: 000123"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Data *</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Emitente *</label>
              <input value={form.issuer} onChange={e => setForm({ ...form, issuer: e.target.value })} placeholder="Nome da empresa emitente"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Valor (R$) *</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Categoria</label>
                <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ex: Insumos"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Descrição</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Itens ou serviços da nota"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Observações</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setModalOpen(false)} className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.issuer.trim() || !form.amount}
                className="flex-1 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: clinic.color }}>
                {saving ? 'Salvando...' : 'Salvar Nota Fiscal'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}