import { useState } from 'react';
import { FileText, Download, BarChart3, Users, CalendarDays, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Clinic, DailyAttendance, Appointment, FinancialRecord, LeadsDaily, PatientClassification, FinancialCategory, LEAD_SOURCES, FINANCIAL_TYPES, FINANCIAL_STATUSES, APPOINTMENT_STATUSES } from '../types';
import { exportToPDF, exportAttendanceCSV, exportFinancialCSV, exportLeadsCSV } from '../lib/export';

type Period = 'day' | 'week' | 'month' | 'custom';

interface Props {
  clinic: Clinic;
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function Reports({ clinic }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [period, setPeriod] = useState<Period>('month');
  const [selectedDate, setSelectedDate] = useState(today); // Data base para os filtros
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    attendance: Array<{ classification: string; count: number; date: string }>;
    appointments: Array<{ title: string; contact_name: string; scheduled_at: string; status: string }>;
    financial: Array<{ description: string; type: string; category: string; amount: number; status: string; due_date: string }>;
    leads: Array<{ source: string; count: number; date: string }>;
    totalIncome: number;
    totalExpense: number;
    balance: number;
    loaded: boolean;
  }>({ attendance: [], appointments: [], financial: [], leads: [], totalIncome: 0, totalExpense: 0, balance: 0, loaded: false });

  const getRange = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    
    if (period === 'day') {
      return { start: `${selectedDate}T00:00:00`, end: `${selectedDate}T23:59:59`, startDate: selectedDate, endDate: selectedDate };
    }
    
    if (period === 'week') {
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay()); // Domingo
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Sábado
      const s = startOfWeek.toISOString().split('T')[0];
      const e = endOfWeek.toISOString().split('T')[0];
      return { start: `${s}T00:00:00`, end: `${e}T23:59:59`, startDate: s, endDate: e };
    }
    
    if (period === 'month') {
      const s = `${selectedDate.slice(0, 7)}-01`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const e = `${selectedDate.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
      return { start: `${s}T00:00:00`, end: `${e}T23:59:59`, startDate: s, endDate: e };
    }
    
    return { start: `${customStart}T00:00:00`, end: `${customEnd}T23:59:59`, startDate: customStart, endDate: customEnd };
  };

  const loadData = async () => {
    setLoading(true);
    const { start, end, startDate, endDate } = getRange();

    const [attRes, apptRes, finRes, leadsRes] = await Promise.all([
      supabase.from('daily_attendance').select('*, classification:patient_classifications(name)').eq('clinic_id', clinic.id).gte('date', startDate).lte('date', endDate),
      supabase.from('appointments').select('*').eq('clinic_id', clinic.id).gte('date', startDate).lte('date', endDate).order('time'),
      supabase.from('financial_records').select('*, category:financial_categories(name)').eq('clinic_id', clinic.id).gte('due_date', startDate).lte('due_date', endDate),
      supabase.from('leads_daily').select('*').eq('clinic_id', clinic.id).gte('date', startDate).lte('date', endDate),
    ]);

    const attendance = (attRes.data || []) as (DailyAttendance & { classification: PatientClassification })[];
    const appointments = (apptRes.data || []) as Appointment[];
    const financial = (finRes.data || []) as (FinancialRecord & { category: FinancialCategory })[];
    const leads = (leadsRes.data || []) as LeadsDaily[];

    const totalIncome = financial.filter(f => f.type === 'income' && f.status === 'paid').reduce((s, f) => s + f.amount, 0);
    const totalExpense = financial.filter(f => f.type === 'expense' && f.status === 'paid').reduce((s, f) => s + f.amount, 0);

    setData({
      attendance: attendance.map(a => ({ classification: a.classification?.name || '—', count: a.count, date: a.date })),
      appointments: appointments.map(a => ({ title: a.title, contact_name: (a as any).contact_name || '—', scheduled_at: `${a.date}T${a.time}`, status: (a as any).status || (a.completed ? 'completed' : 'pending') })),
      financial: financial.map(f => ({ description: f.description, type: f.type, category: f.category?.name || '', amount: f.amount, status: f.status, due_date: f.due_date })),
      leads: leads.map(l => ({ source: l.source, count: l.count, date: l.date })),
      totalIncome, totalExpense, balance: totalIncome - totalExpense, loaded: true,
    });
    setLoading(false);
  };

  const { startDate, endDate } = getRange();
  const periodLabel = startDate === endDate
    ? new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')
    : `${new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')}`;
  const periodNames: Record<Period, string> = { day: 'Dia', week: 'Semana', month: 'Mês', custom: 'Período' };

  const handleExportPDF = () => {
    exportToPDF({
      title: `Relatório — ${periodNames[period]}`,
      period: periodLabel,
      clinicName: clinic.name,
      ...data,
    });
  };

  const exportFullExcel = () => {
    const rows: Record<string, unknown>[] = [];

    data.attendance.forEach(a => rows.push({ Seção: 'Atendimentos', Descrição: a.classification, Quantidade: a.count, Data: a.date, Valor: '', Status: '' }));
    data.appointments.forEach(a => rows.push({ Seção: 'Compromissos', Descrição: a.title, Quantidade: '', Data: new Date(a.scheduled_at).toLocaleString('pt-BR'), Valor: '', Status: APPOINTMENT_STATUSES[a.status] || a.status }));
    data.leads.forEach(l => rows.push({ Seção: 'Leads', Descrição: LEAD_SOURCES[l.source] || l.source, Quantidade: l.count, Data: l.date, Valor: '', Status: '' }));
    data.financial.forEach(f => rows.push({ Seção: FINANCIAL_TYPES[f.type] || f.type, Descrição: f.description, Quantidade: '', Data: f.due_date, Valor: f.amount, Status: FINANCIAL_STATUSES[f.status] || f.status }));

    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvRows = rows.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    );
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${clinic.slug}_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPatients = data.attendance.reduce((s, a) => s + a.count, 0);
  const totalLeads = data.leads.reduce((s, l) => s + l.count, 0);

  const attendanceByClass = data.attendance.reduce((acc, a) => {
    acc[a.classification] = (acc[a.classification] || 0) + a.count;
    return acc;
  }, {} as Record<string, number>);

  const leadsBySource = data.leads.reduce((acc, l) => {
    const name = LEAD_SOURCES[l.source] || l.source;
    acc[name] = (acc[name] || 0) + l.count;
    return acc;
  }, {} as Record<string, number>);

  const financialByCategory = data.financial.reduce((acc, f) => {
    const key = f.category || 'Sem categoria';
    if (!acc[key]) acc[key] = { income: 0, expense: 0 };
    if (f.type === 'income') acc[key].income += f.amount;
    else acc[key].expense += f.amount;
    return acc;
  }, {} as Record<string, { income: number; expense: number }>);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4 text-lg">Configurar Relatório</h3>
        
        {/* Seleção do Tipo de Período */}
        <div className="flex gap-2 flex-wrap mb-6">
          {(['day', 'week', 'month', 'custom'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${period === p ? 'text-white shadow-md scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              style={period === p ? { backgroundColor: clinic.color } : {}}>
              {periodNames[p]}
            </button>
          ))}
        </div>

        {/* Seletores de Data Dinâmicos */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
          {period === 'day' && (
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Escolher Dia</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                  className="pl-9 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500 bg-white" />
              </div>
            </div>
          )}

          {period === 'week' && (
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Escolher Semana (Selecione qualquer dia dela)</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                  className="pl-9 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500 bg-white" />
              </div>
            </div>
          )}

          {period === 'month' && (
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Escolher Mês e Ano</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="month" value={selectedDate.slice(0, 7)} onChange={e => setSelectedDate(e.target.value + '-01')}
                  className="pl-9 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500 bg-white" />
              </div>
            </div>
          )}

          {period === 'custom' && (
            <>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">De</label>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500 bg-white" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Até</label>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500 bg-white" />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Período Selecionado:</p>
            <p className="text-lg font-black text-gray-900">{periodLabel}</p>
          </div>
          <button onClick={loadData} disabled={loading}
            className="flex items-center gap-2 text-white px-6 py-3 rounded-xl text-sm font-black uppercase shadow-lg disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95"
            style={{ backgroundColor: clinic.color }}>
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <BarChart3 size={18} />
            )}
            Gerar Relatório
          </button>
        </div>
      </div>

      {data.loaded && (
        <>
          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <p className="text-emerald-600 text-xs font-black uppercase tracking-wider">Receita Recebida</p>
              <p className="text-emerald-700 text-2xl font-black mt-1">{fmt(data.totalIncome)}</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
              <p className="text-rose-600 text-xs font-black uppercase tracking-wider">Despesas Pagas</p>
              <p className="text-rose-600 text-2xl font-black mt-1">{fmt(data.totalExpense)}</p>
            </div>
            <div className={`rounded-2xl p-5 border-2 ${data.balance >= 0 ? 'bg-teal-50 border-teal-200' : 'bg-rose-50 border-rose-200'}`}>
              <p className={`${data.balance >= 0 ? 'text-teal-600' : 'text-rose-600'} text-xs font-black uppercase tracking-wider`}>Saldo Líquido</p>
              <p className={`text-2xl font-black mt-1 ${data.balance >= 0 ? 'text-teal-700' : 'text-rose-700'}`}>{fmt(data.balance)}</p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <Users size={20} className="text-blue-600 mx-auto mb-1" />
              <p className="text-3xl font-black text-blue-600">{totalPatients}</p>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Atendimentos</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <CalendarDays size={20} className="mx-auto mb-1" style={{ color: clinic.color }} />
              <p className="text-3xl font-black" style={{ color: clinic.color }}>{data.appointments.length}</p>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Compromissos</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <TrendingUp size={20} className="text-amber-600 mx-auto mb-1" />
              <p className="text-3xl font-black text-amber-600">{totalLeads}</p>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Leads</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <DollarSign size={20} className="text-gray-600 mx-auto mb-1" />
              <p className="text-3xl font-black text-gray-700">{data.financial.length}</p>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Lançamentos</p>
            </div>
          </div>

          {/* Detailed Sections */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Attendance Breakdown */}
            {Object.keys(attendanceByClass).length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2 uppercase text-sm">
                  <Users size={17} className="text-blue-600" />
                  Atendimentos por Classificação
                </h3>
                <div className="space-y-3">
                  {Object.entries(attendanceByClass).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-600 uppercase tracking-tighter">{name}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-blue-500" style={{ width: `${totalPatients > 0 ? (count / totalPatients) * 100 : 0}%` }} />
                        </div>
                        <span className="text-sm font-black text-blue-600 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leads Breakdown */}
            {Object.keys(leadsBySource).length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2 uppercase text-sm">
                  <TrendingUp size={17} className="text-amber-600" />
                  Leads por Origem
                </h3>
                <div className="space-y-3">
                  {Object.entries(leadsBySource).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-600 uppercase tracking-tighter">{name}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-amber-500" style={{ width: `${totalLeads > 0 ? (count / totalLeads) * 100 : 0}%` }} />
                        </div>
                        <span className="text-sm font-black text-amber-600 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Financial by Category */}
            {Object.keys(financialByCategory).length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 lg:col-span-2">
                <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2 uppercase text-sm">
                  <DollarSign size={17} className="text-teal-600" />
                  Financeiro por Categoria
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-3 text-gray-400 font-black uppercase tracking-tighter">Categoria</th>
                        <th className="text-right py-3 px-3 text-emerald-600 font-black uppercase tracking-tighter">Receita</th>
                        <th className="text-right py-3 px-3 text-rose-600 font-black uppercase tracking-tighter">Despesa</th>
                        <th className="text-right py-3 px-3 text-gray-700 font-black uppercase tracking-tighter">Líquido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(financialByCategory).map(([name, vals]) => (
                        <tr key={name} className="border-b border-gray-50">
                          <td className="py-3 px-3 text-gray-900 font-bold uppercase text-xs">{name}</td>
                          <td className="py-3 px-3 text-right text-emerald-700 font-bold">{vals.income > 0 ? fmt(vals.income) : '—'}</td>
                          <td className="py-3 px-3 text-right text-rose-600 font-bold">{vals.expense > 0 ? fmt(vals.expense) : '—'}</td>
                          <td className={`py-3 px-3 text-right font-black ${vals.income - vals.expense >= 0 ? 'text-teal-700' : 'text-rose-700'}`}>
                            {fmt(vals.income - vals.expense)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Export Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-black text-gray-900 mb-4 text-lg flex items-center gap-2 uppercase">
              <Download size={18} style={{ color: clinic.color }} />
              Exportar Relatório
            </h3>
            <p className="text-sm text-gray-500 mb-4 font-medium">Exporte os dados do período <strong>{periodLabel}</strong> para análise externa.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button onClick={handleExportPDF}
                className="flex items-center justify-center gap-2 bg-rose-600 text-white px-4 py-3 rounded-xl text-xs font-black uppercase shadow-md hover:bg-rose-700 transition-all">
                <FileText size={16} /> Exportar PDF
              </button>
              <button onClick={exportFullExcel}
                className="flex items-center justify-center gap-2 bg-teal-600 text-white px-4 py-3 rounded-xl text-xs font-black uppercase shadow-md hover:bg-teal-700 transition-all">
                <Download size={16} /> Excel Completo
              </button>
              <button onClick={() => exportAttendanceCSV(data.attendance)}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl text-xs font-black uppercase shadow-md hover:bg-blue-700 transition-all">
                <Download size={16} /> Atendimentos
              </button>
              <button onClick={() => exportFinancialCSV(data.financial)}
                className="flex items-center justify-center gap-2 bg-gray-700 text-white px-4 py-3 rounded-xl text-xs font-black uppercase shadow-md hover:bg-gray-800 transition-all">
                <Download size={16} /> Financeiro
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}