import React, { useEffect, useState } from 'react';
import { Plus, Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, DollarSign, Trash2, CheckCircle2, Tag, X } from 'lucide-react';
import { Clinic } from '../types';
import Modal from '../components/Modal';
import { supabase } from '../lib/supabase'; // Importação do banco de dados

interface Category {
  id: string;
  name: string;
  clinic_id?: string;
}

interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'common' | 'financial';
  amount: number;
  category_id?: string;
  category_name?: string;
  is_recurring: boolean;
  current_installment?: number;
  total_installments?: number;
  completed: boolean;
  description?: string;
}

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface Props { clinic: Clinic; }

export default function Appointments({ clinic }: Props) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [view, setView] = useState<'day' | 'month'>('month');
  const [date, setDate] = useState(todayStr); 
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [editingAppId, setEditingAppId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    date: todayStr,
    time: '09:00',
    type: 'common' as 'common' | 'financial',
    amount: '',
    category_id: '',
    is_recurring: false,
    installments: 1,
    description: ''
  });

  // BUSCA DADOS DO SUPABASE
  const fetchData = async () => {
    setLoading(true);
    
    try {
      // 1. Busca Categorias Financeiras no Banco
      const { data: catsData } = await supabase
        .from('financial_categories')
        .select('*')
        .eq('clinic_id', clinic.id)
        .order('name');
      
      // Se você ainda não tiver categorias cadastradas no Supabase, coloca as de exemplo
      if (catsData && catsData.length > 0) {
        setCategories(catsData);
      } else {
        setCategories([
          { id: 'cat-1', name: 'Custos Fixos (Aluguel/Água/Luz)' },
          { id: 'cat-2', name: 'Pagamento de Funcionários' },
          { id: 'cat-3', name: 'Marketing e Anúncios' },
          { id: 'cat-4', name: 'Insumos e Materiais Clínicos' }
        ]);
      }

      // 2. Busca Compromissos da Agenda no Banco
      let query = supabase.from('appointments').select('*').eq('clinic_id', clinic.id);
      
      if (view === 'day') {
        query = query.eq('date', date);
      } else {
        const currentMonth = date.slice(0, 7);
        query = query.gte('date', `${currentMonth}-01`).lte('date', `${currentMonth}-31`);
      }

      const { data: appsData } = await query.order('time');
      setAppointments(appsData || []);
    } catch (error) {
      console.error("Erro de conexão com Supabase:", error);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [clinic.id, date, view]);

  const openCreate = () => {
    setEditingAppId(null);
    setForm({ title: '', date: todayStr, time: '09:00', type: 'common', amount: '', category_id: '', is_recurring: false, installments: 1, description: '' });
    setModalOpen(true);
  };

  const openEdit = (app: Appointment) => {
    setEditingAppId(app.id);
    setForm({
      title: app.title || '',
      date: app.date || todayStr,
      time: app.time || '09:00',
      type: app.type || 'common',
      amount: app.amount ? app.amount.toString() : '',
      category_id: app.category_id || '',
      is_recurring: app.is_recurring || false,
      installments: app.total_installments || 1,
      description: app.description || ''
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.date) return;
    setSaving(true);
    const selectedCategory = categories.find(c => c.id === form.category_id);

    try {
      if (editingAppId) {
        // ATUALIZA NO SUPABASE
        await supabase.from('appointments').update({
          title: form.title,
          date: form.date,
          time: form.time,
          type: form.type,
          amount: parseFloat(form.amount) || 0,
          category_id: form.category_id || null,
          category_name: selectedCategory?.name || null,
          description: form.description
        }).eq('id', editingAppId);

      } else {
        // CRIA NO SUPABASE (Com suporte a parcelas)
        if (form.is_recurring && form.type === 'financial' && form.installments > 1) {
          const batch = [];
          const baseDate = new Date(form.date + 'T12:00:00');
          for (let i = 0; i < form.installments; i++) {
            const nextDate = new Date(baseDate);
            nextDate.setMonth(baseDate.getMonth() + i);
            batch.push({
              clinic_id: clinic.id,
              title: form.title,
              date: nextDate.toISOString().split('T')[0],
              time: form.time,
              type: form.type,
              amount: parseFloat(form.amount) || 0,
              category_id: form.category_id || null,
              category_name: selectedCategory?.name || null,
              is_recurring: true,
              current_installment: i + 1,
              total_installments: form.installments,
              description: form.description,
              completed: false
            });
          }
          await supabase.from('appointments').insert(batch);
        } else {
          await supabase.from('appointments').insert({
            clinic_id: clinic.id,
            title: form.title,
            date: form.date,
            time: form.time,
            type: form.type,
            amount: parseFloat(form.amount) || 0,
            category_id: form.category_id || null,
            category_name: selectedCategory?.name || null,
            is_recurring: false,
            completed: false,
            description: form.description
          });
        }
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }

    setSaving(false);
    setModalOpen(false);
    setEditingAppId(null);
    fetchData(); // Recarrega os dados fresquinhos do Supabase
  };

  const toggleComplete = async (appId: string, currentStatus: boolean) => {
    await supabase.from('appointments').update({ completed: !currentStatus }).eq('id', appId);
    fetchData();
  };

  const deleteAppointment = async (id: string) => {
    if (confirm('Remover este compromisso?')) {
      await supabase.from('appointments').delete().eq('id', id);
      fetchData();
    }
  };

  const navigate = (dir: 'prev' | 'next') => {
    const d = new Date(date + 'T12:00:00');
    if (view === 'day') d.setDate(d.getDate() + (dir === 'next' ? 1 : -1));
    else d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1));
    setDate(d.toISOString().split('T')[0]);
  };

  const renderMonthView = () => {
    const d = new Date(date + 'T12:00:00');
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
          <div key={day} className="bg-gray-50 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">{day}</div>
        ))}
        {days.map((day, idx) => {
          const dayDate = day ? `${date.slice(0, 8)}${String(day).padStart(2, '0')}` : null;
          const dayApps = appointments.filter(a => a.date === dayDate);
          const isToday = dayDate === todayStr;

          return (
            <div key={idx} onClick={() => day && setDate(dayDate!)}
              className={`bg-white min-h-[110px] p-2 transition-all cursor-pointer hover:bg-gray-50 ${isToday ? 'ring-2 ring-inset ring-emerald-500 bg-emerald-50/10' : ''}`}>
              <span className={`text-sm font-black ${dayDate === date ? 'text-emerald-600' : 'text-gray-400'}`}>{day}</span>
              <div className="mt-1 space-y-1">
                {dayApps.map(app => (
                  <div key={app.id} 
                    onClick={(e: any) => { e.stopPropagation(); openEdit(app); }}
                    className={`group flex items-center justify-between text-[10px] px-1.5 py-1 rounded font-bold transition-all cursor-pointer ${app.completed ? 'opacity-30 grayscale' : ''} ${app.type === 'financial' ? 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200' : 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200'}`}>
                    <span className="truncate flex-1">{app.type === 'financial' && '$ '}{app.title}</span>
                    
                    <div className="flex gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e: any) => { e.stopPropagation(); toggleComplete(app.id, app.completed); }}
                        className={`p-0.5 rounded ${app.completed ? 'text-emerald-600' : 'text-gray-500 hover:text-emerald-600'}`}>
                        <CheckCircle2 size={12} />
                      </button>
                      <button 
                        onClick={(e: any) => { e.stopPropagation(); deleteAppointment(app.id); }}
                        className="p-0.5 rounded text-gray-500 hover:text-rose-600">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <button onClick={() => setView('day')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${view === 'day' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Dia</button>
          <button onClick={() => setView('month')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${view === 'month' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Mês</button>
          <div className="h-4 w-[1px] bg-gray-200 mx-1" />
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('prev')} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><ChevronLeft size={18} /></button>
            <span className="text-sm font-black min-w-[140px] text-center text-gray-700 uppercase tracking-tight">
              {view === 'day' ? new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : `${monthNames[new Date(date + 'T12:00:00').getMonth()]} / ${date.slice(0, 4)}`}
            </span>
            <button onClick={() => navigate('next')} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><ChevronRight size={18} /></button>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95" style={{ backgroundColor: clinic.color }}>
          <Plus size={18} /> Novo Compromisso
        </button>
      </div>

      {view === 'month' ? renderMonthView() : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          {loading ? <div className="p-20 text-center animate-pulse text-gray-400 font-bold uppercase tracking-widest">Carregando Agenda...</div> : 
           appointments.length === 0 ? <div className="p-32 text-center text-gray-300 font-bold uppercase tracking-widest">Nenhum compromisso para este dia</div> :
           appointments.map(app => (
            <div key={app.id} onClick={() => openEdit(app)} className={`flex items-center gap-4 p-5 transition-all cursor-pointer ${app.completed ? 'bg-gray-50/50' : 'hover:bg-gray-50'}`}>
              <button 
                onClick={(e: any) => { e.stopPropagation(); toggleComplete(app.id, app.completed); }} 
                className={`transition-all ${app.completed ? 'text-emerald-500 scale-110' : 'text-gray-300 hover:text-emerald-400'}`}>
                <CheckCircle2 size={28} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className={`font-black text-lg truncate ${app.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{app.title}</h4>
                  {app.type === 'financial' && (
                    <span className="bg-amber-100 text-amber-700 text-[10px] px-2.5 py-1 rounded-lg font-black flex items-center gap-1 border border-amber-200">
                      <DollarSign size={10} /> {fmt(app.amount)}
                    </span>
                  )}
                </div>
                <div className="flex gap-4 mt-1 items-center">
                  <span className="text-xs text-gray-400 font-bold flex items-center gap-1.5 uppercase"><Clock size={14} /> {app.time}</span>
                  {app.is_recurring && <span className="text-[11px] text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">PARCELA {app.current_installment}/{app.total_installments}</span>}
                  {app.category_name && <span className="text-[10px] text-gray-500 font-bold uppercase bg-gray-100 px-2 py-0.5 rounded-md flex items-center gap-1"><Tag size={10} /> {app.category_name}</span>}
                </div>
              </div>
              <button onClick={(e: any) => { e.stopPropagation(); deleteAppointment(app.id); }} className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title={editingAppId ? "Editar Compromisso" : "Novo Compromisso"} onClose={() => setModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black text-gray-400 uppercase mb-1 block">Título do Compromisso</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-2.5 font-medium focus:ring-2 focus:ring-emerald-500" placeholder="Ex: Pagar Aluguel ou Reunião" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase mb-1 block">Data do Compromisso</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-2.5 font-medium" />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase mb-1 block">Horário</label>
                <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-2.5 font-medium" />
              </div>
            </div>
            
            <div>
              <label className="text-xs font-black text-gray-400 uppercase mb-1 block">Tipo de Registro</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value as 'common' | 'financial'})} className="w-full border-gray-200 rounded-xl px-4 py-2.5 font-bold" disabled={!!editingAppId}>
                <option value="common">📅 Compromisso Comum</option>
                <option value="financial">💰 Registro Financeiro</option>
              </select>
            </div>

            {form.type === 'financial' && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-amber-700 uppercase mb-1 block">Valor (R$)</label>
                    <input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full border-amber-200 rounded-xl px-4 py-2 text-sm font-bold" placeholder="0,00" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-amber-700 uppercase mb-1 block">Categoria</label>
                    <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} className="w-full border-amber-200 rounded-xl px-4 py-2 text-sm font-bold">
                      <option value="">Selecionar...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                
                {!editingAppId && (
                  <>
                    <label className="flex items-center gap-3 cursor-pointer group bg-white/50 p-2 rounded-xl border border-amber-200/50">
                      <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({...form, is_recurring: e.target.checked})} className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 border-amber-300" />
                      <span className="text-sm font-black text-amber-900 uppercase tracking-tighter">É um pagamento parcelado mensal?</span>
                    </label>
                    
                    {form.is_recurring && (
                      <div className="animate-in fade-in slide-in-from-top-1">
                        <label className="text-[10px] font-black text-amber-700 uppercase mb-1 block">Total de Parcelas (Meses)</label>
                        <input type="number" min="2" max="120" value={form.installments} onChange={e => setForm({...form, installments: parseInt(e.target.value) || 2})} className="w-full border-amber-200 rounded-xl px-4 py-2 text-sm font-bold" />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 border-2 border-gray-100 py-3 rounded-xl text-sm font-black text-gray-400 uppercase hover:bg-gray-50 transition-all">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.title} className="flex-1 text-white py-3 rounded-xl text-sm font-black uppercase shadow-lg disabled:opacity-50 transition-all active:scale-95" style={{ backgroundColor: clinic.color }}>
                {saving ? 'PROCESSANDO...' : editingAppId ? 'SALVAR ALTERAÇÕES' : 'CRIAR COMPROMISSO'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}