import { useState } from 'react';
import { FileText, Download, BarChart3, Users, CalendarDays, TrendingUp, DollarSign } from 'lucide-react';
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
    const now = new Date();
    if (period === 'day') return { start: `${today}T00:00:00`, end: `${today}T23:59:59`, startDate: today, endDate: today };
    if (period === 'week') {
      const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6);
      const s = startOfWeek.toISOString().split('T')[0]; const e = endOfWeek.toISOString().split('T')[0];
      return { start: `${s}T00:00:00`, end: `${e}T23:59:59`, startDate: s, endDate: e };
    }
    if (period === 'month') {
      const s = `${today.slice(0, 7)}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const e = `${today.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
      return { start: `${s}T00:00:00`, end: `${e}T23:59:59`, startDate: s, endDate: e };
    }
    return { start: `${customStart}T00:00:00`, end: `${customEnd}T23:59:59`, startDate: customStart, endDate: customEnd };
  };

  const loadData = async () => {
    setLoading(true);
    const { start, end, startDate, endDate } = getRange();

    const [attRes, apptRes, finRes, leadsRes] = await Promise.all([
      supabase.from('daily_attendance').select('*, classification:patient_classifications(name)').eq('clinic_id', clinic.id).gte('date', startDate).lte('date', endDate),
      supabase.from('appointments').select('*').eq('clinic_id', clinic.id).gte('scheduled_at', start).lte('scheduled_at', end).order('scheduled_at'),
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
      appointments: appointments.map(a => ({ title: a.title, contact_name: a.contact_name, scheduled_at: a.scheduled_at, status: a.status })),
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
        <div className="flex gap-2 flex-wrap mb-4">
          {(['day', 'week', 'month', 'custom'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${period === p ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              style={period === p ? { backgroundColor: clinic.color } : {}}>
              {periodNames[p]}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">De</label>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Até</label>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-gray-500">Período: <strong className="text-gray-900">{periodLabel}</strong></p>
          <button onClick={loadData} disabled={loading}
            className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
            style={{ backgroundColor: clinic.color }}>
            <BarChart3 size={16} />
            {loading ? 'Carregando...' : 'Gerar Relatório'}
          </button>
        </div>
      </div>

      {data.loaded && (
        <>
          {/* Financial Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <p className="text-gray-500 text-sm">Receita Recebida</p>
              <p className="text-emerald-700 text-2xl font-bold mt-1">{fmt(data.totalIncome)}</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
              <p className="text-gray-500 text-sm">Despesas Pagas</p>
              <p className="text-rose-600 text-2xl font-bold mt-1">{fmt(data.totalExpense)}</p>
            </div>
            <div className={`rounded-2xl p-5 border-2 ${data.balance >= 0 ? 'bg-teal-50 border-teal-200' : 'bg-rose-50 border-rose-200'}`}>
              <p className="text-gray-500 text-sm">Saldo Líquido</p>
              <p className={`text-2xl font-bold mt-1 ${data.balance >= 0 ? 'text-teal-700' : 'text-rose-700'}`}>{fmt(data.balance)}</p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <Users size={20} className="text-blue-600 mx-auto mb-1" />
              <p className="text-3xl font-bold text-blue-600">{totalPatients}</p>
              <p className="text-gray-500 text-xs mt-1">Atendimentos</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <CalendarDays size={20} className="mx-auto mb-1" style={{ color: clinic.color }} />
              <p className="text-3xl font-bold" style={{ color: clinic.color }}>{data.appointments.length}</p>
              <p className="text-gray-500 text-xs mt-1">Compromissos</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <TrendingUp size={20} className="text-amber-600 mx-auto mb-1" />
              <p className="text-3xl font-bold text-amber-600">{totalLeads}</p>
              <p className="text-gray-500 text-xs mt-1">Leads</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <DollarSign size={20} className="text-gray-600 mx-auto mb-1" />
              <p className="text-3xl font-bold text-gray-700">{data.financial.length}</p>
              <p className="text-gray-500 text-xs mt-1">Lançamentos</p>
            </div>
          </div>

          {/* Detailed Sections */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Attendance Breakdown */}
            {Object.keys(attendanceByClass).length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users size={17} className="text-blue-600" />
                  Atendimentos por Classificação
                </h3>
                <div className="space-y-3">
                  {Object.entries(attendanceByClass).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{name}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-blue-500" style={{ width: `${totalPatients > 0 ? (count / totalPatients) * 100 : 0}%` }} />
                        </div>
                        <span className="text-sm font-bold text-blue-600 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leads Breakdown */}
            {Object.keys(leadsBySource).length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp size={17} className="text-amber-600" />
                  Leads por Origem
                </h3>
                <div className="space-y-3">
                  {Object.entries(leadsBySource).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{name}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-amber-500" style={{ width: `${totalLeads > 0 ? (count / totalLeads) * 100 : 0}%` }} />
                        </div>
                        <span className="text-sm font-bold text-amber-600 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Financial by Category */}
            {Object.keys(financialByCategory).length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 lg:col-span-2">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign size={17} className="text-teal-600" />
                  Financeiro por Categoria
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Categoria</th>
                        <th className="text-right py-2 px-3 text-emerald-600 font-medium">Receita</th>
                        <th className="text-right py-2 px-3 text-rose-600 font-medium">Despesa</th>
                        <th className="text-right py-2 px-3 text-gray-700 font-medium">Líquido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(financialByCategory).map(([name, vals]) => (
                        <tr key={name} className="border-b border-gray-50">
                          <td className="py-2 px-3 text-gray-900">{name}</td>
                          <td className="py-2 px-3 text-right text-emerald-700 font-medium">{vals.income > 0 ? fmt(vals.income) : '—'}</td>
                          <td className="py-2 px-3 text-right text-rose-600 font-medium">{vals.expense > 0 ? fmt(vals.expense) : '—'}</td>
                          <td className={`py-2 px-3 text-right font-bold ${vals.income - vals.expense >= 0 ? 'text-teal-700' : 'text-rose-700'}`}>
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
            <h3 className="font-semibold text-gray-900 mb-4 text-lg flex items-center gap-2">
              <Download size={18} style={{ color: clinic.color }} />
              Exportar Relatório
            </h3>
            <p className="text-sm text-gray-500 mb-4">Exporte os dados do período <strong>{periodLabel}</strong> para análise externa.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button onClick={handleExportPDF}
                className="flex items-center justify-center gap-2 bg-rose-600 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors">
                <FileText size={16} /> Exportar PDF
              </button>
              <button onClick={exportFullExcel}
                className="flex items-center justify-center gap-2 bg-teal-600 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors">
                <Download size={16} /> Excel Completo
              </button>
              <button onClick={() => exportAttendanceCSV(data.attendance)}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                <Download size={16} /> Atendimentos
              </button>
              <button onClick={() => exportFinancialCSV(data.financial)}
                className="flex items-center justify-center gap-2 bg-gray-700 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
                <Download size={16} /> Financeiro
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">PDF abre para impressão. CSV/Excel pode ser aberto no Excel, Google Sheets ou LibreOffice.</p>
          </div>
        </>
      )}
    </div>
  );
}
