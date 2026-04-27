import { useEffect, useState, useCallback } from 'react';
import {
  CalendarDays,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  Star,
  FileText,
  Target,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Clinic, DailyAttendance, Appointment, FinancialRecord, Alert, LeadsDaily, DailyReport, PatientClassification, Goal, GOAL_TYPES, APPOINTMENT_STATUSES } from '../types';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface Props {
  clinic: Clinic;
  onNavigate: (page: string) => void;
}

export default function Dashboard({ clinic, onNavigate }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = `${today.slice(0, 7)}`;
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<DailyAttendance[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [expenses, setExpenses] = useState<FinancialRecord[]>([]);
  const [incomes, setIncomes] = useState<FinancialRecord[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [leads, setLeads] = useState<LeadsDaily[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [totalPatients, setTotalPatients] = useState(0);
  const [goals, setGoals] = useState<Goal[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const startOfMonth = `${today.slice(0, 7)}-01`;

    // 1. BUSCA DADOS LOCAIS (Enquanto não há Supabase)
    const savedApps = localStorage.getItem(`appointments_${clinic.id}`);
    const allLocalApps = savedApps ? JSON.parse(savedApps) : [];
    
    // Filtra agendamentos de hoje para a lista de Agenda
    const todayApps = allLocalApps.filter((a: any) => a.date === today);
    
    // Transforma agendamentos pendentes de hoje em Alertas (como você pediu)
    const pendingAsAlerts = todayApps
      .filter((a: any) => !a.completed)
      .map((a: any) => ({
        id: a.id,
        title: `Compromisso: ${a.title}`,
        due_at: `${a.date}T${a.time}:00`,
        status: 'pending',
        clinic_id: clinic.id
      }));

    // 2. BUSCA NO SUPABASE (Para quando você ativar)
    const [attRes, expRes, incRes, leadsRes, reportRes, monthAttRes, goalsRes] = await Promise.all([
      supabase.from('daily_attendance').select('*, classification:patient_classifications(name,color)').eq('clinic_id', clinic.id).eq('date', today),
      supabase.from('financial_records').select('*, category:financial_categories(name)').eq('clinic_id', clinic.id).eq('type', 'expense').eq('status', 'pending').order('due_date'),
      supabase.from('financial_records').select('*, category:financial_categories(name)').eq('clinic_id', clinic.id).eq('type', 'income').eq('status', 'pending').order('due_date'),
      supabase.from('leads_daily').select('*').eq('clinic_id', clinic.id).eq('date', today),
      supabase.from('daily_reports').select('*').eq('clinic_id', clinic.id).eq('date', today).maybeSingle(),
      supabase.from('daily_attendance').select('count').eq('clinic_id', clinic.id).gte('date', startOfMonth),
      supabase.from('goals').select('*').eq('clinic_id', clinic.id).eq('month', currentMonth),
    ]);

    setAttendance((attRes.data as DailyAttendance[]) || []);
    setAppointments(todayApps); // Usa dados locais
    setAlerts(pendingAsAlerts); // Usa agendamentos pendentes como alertas
    setExpenses((expRes.data as FinancialRecord[]) || []);
    setIncomes((incRes.data as FinancialRecord[]) || []);
    setLeads((leadsRes.data as LeadsDaily[]) || []);
    setReport((reportRes.data as DailyReport) || null);
    setTotalPatients((monthAttRes.data || []).reduce((s: number, r: { count: number }) => s + r.count, 0));
    setGoals((goalsRes.data as Goal[]) || []);
    setLoading(false);
  }, [clinic.id, today, currentMonth]);

  useEffect(() => {
    load();
    // Sincroniza se você mudar algo na página de Agenda e voltar
    window.addEventListener('storage', load);
    window.addEventListener('focus', load);
    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener('focus', load);
    };
  }, [load]);

  // Função para concluir alertas/agendamentos e retirá-los da lista
  const handleCompleteAppointment = async (id: string) => {
    const savedApps = localStorage.getItem(`appointments_${clinic.id}`);
    if (savedApps) {
      const allApps = JSON.parse(savedApps);
      const updated = allApps.map((a: any) => a.id === id ? { ...a, completed: true } : a);
      localStorage.setItem(`appointments_${clinic.id}`, JSON.stringify(updated));
      
      // Notifica o sistema da mudança e recarrega
      window.dispatchEvent(new Event('storage'));
      load();
    }
  };

  const todayPatients = attendance.reduce((s, a) => s + a.count, 0);
  const todayLeads = leads.reduce((s, l) => s + l.count, 0);
  const overdueExpenses = expenses.filter(p => new Date(p.due_date) < new Date(today));
  const overdueIncomes = incomes.filter(r => new Date(r.due_date) < new Date(today));

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-[3px] border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-slate-400 text-sm">
          {new Date(today + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </h2>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Atendimentos Hoje', value: todayPatients, icon: Users, color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Leads Hoje', value: todayLeads, icon: TrendingUp, color: '#D97706', bg: '#FFFBEB' },
          { label: 'Compromissos', value: appointments.length, icon: CalendarDays, color: clinic.color, bg: clinic.color + '10' },
          { label: 'Pacientes no Mês', value: totalPatients, icon: Users, color: '#0F766E', bg: '#F0FDFA' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/80 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-medium">{m.label}</p>
                <p className="text-2xl font-bold mt-1.5 tracking-tight" style={{ color: m.color }}>{m.value}</p>
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: m.bg }}>
                <m.icon size={20} style={{ color: m.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Goals Progress */}
      {goals.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Target size={17} style={{ color: clinic.color }} />
              Metas do Mês
            </h3>
            <button onClick={() => onNavigate('goals')} className="text-xs font-medium hover:underline" style={{ color: clinic.color }}>Ver todas</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {goals.map(g => {
              const progress = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
              const isComplete = progress >= 100;
              const isRevenue = g.type === 'revenue';
              return (
                <div key={g.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-600">{GOAL_TYPES[g.type] || g.type}</span>
                      <span className={`text-xs font-bold ${isComplete ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {isRevenue ? fmt(g.current) : g.current} / {isRevenue ? fmt(g.target) : g.target}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: isComplete ? '#059669' : clinic.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attendance by Classification */}
      {attendance.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/80">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Users size={17} className="text-blue-500" />
            Atendimentos de Hoje
          </h3>
          <div className="flex gap-3 flex-wrap">
            {attendance.map(a => {
              const cls = a.classification as PatientClassification;
              return (
                <div key={a.id} className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cls?.color || '#94a3b8' }} />
                  <span className="text-sm text-slate-600">{cls?.name || '—'}</span>
                  <span className="text-lg font-bold tracking-tight" style={{ color: cls?.color || '#475569' }}>{a.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Appointments */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays size={17} style={{ color: clinic.color }} />
              Agenda de Hoje
            </h3>
            <button onClick={() => onNavigate('appointments')} className="text-xs font-medium hover:underline" style={{ color: clinic.color }}>Ver tudo</button>
          </div>
          {appointments.length === 0 ? (
            <p className="text-slate-300 text-sm text-center py-8">Nenhum compromisso hoje</p>
          ) : (
            <div className="space-y-2">
              {appointments.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100 group">
                  <div className="w-12 text-center flex-shrink-0">
                    <p className="text-xs font-bold text-slate-700">
                      {(a as any).time || new Date(a.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${(a as any).completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{a.title}</p>
                  </div>
                  <button 
                    onClick={() => handleCompleteAppointment(a.id)}
                    className={`p-1 rounded-lg transition-all ${(a as any).completed ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500 opacity-0 group-hover:opacity-100'}`}
                  >
                    <CheckCircle2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle size={17} className="text-amber-500" />
              Alertas
            </h3>
          </div>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
               <CheckCircle2 size={32} className="text-emerald-100 mb-2" />
               <p className="text-slate-300 text-sm">Tudo em dia por aqui!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => {
                const isPast = new Date(alert.due_at) < new Date();
                return (
                  <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-xl border group ${isPast ? 'bg-rose-50/50 border-rose-100' : 'bg-amber-50/50 border-amber-100'}`}>
                    <AlertTriangle size={15} className={isPast ? 'text-rose-400 mt-0.5' : 'text-amber-400 mt-0.5'} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                      <p className={`text-[11px] mt-0.5 font-medium ${isPast ? 'text-rose-500' : 'text-amber-600'}`}>
                        {alert.due_at.includes('T') ? new Date(alert.due_at).toLocaleString('pt-BR') : alert.due_at}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleCompleteAppointment(alert.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-emerald-600 shadow-sm transition-all"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Financial Overview - (Apenas layout mantido conforme pedido) */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <DollarSign size={17} className="text-emerald-600" />
              Receitas Pendentes
            </h3>
            <button onClick={() => onNavigate('financial')} className="text-xs font-medium text-emerald-600 hover:underline">Ver tudo</button>
          </div>
          {incomes.length === 0 ? (
            <p className="text-slate-300 text-sm text-center py-6">Nenhuma receita pendente</p>
          ) : (
            <div className="space-y-2">
              {incomes.slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{r.description}</p>
                    <p className="text-xs text-slate-400">Vence: {new Date(r.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                  <p className="text-emerald-700 font-bold text-sm">{fmt(r.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Clock size={17} className="text-rose-500" />
              Despesas Pendentes
            </h3>
            <button onClick={() => onNavigate('financial')} className="text-xs font-medium text-rose-500 hover:underline">Ver tudo</button>
          </div>
          {expenses.length === 0 ? (
            <p className="text-slate-300 text-sm text-center py-6">Nenhuma despesa pendente</p>
          ) : (
            <div className="space-y-2">
              {expenses.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.description}</p>
                    <p className="text-xs text-slate-400">Vence: {new Date(p.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                  <p className="text-rose-600 font-bold text-sm">{fmt(p.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {report && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/80">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
            <FileText size={17} style={{ color: clinic.color }} />
            Relatório do Dia
          </h3>
          <div className="flex items-center gap-1.5 mb-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} size={15} className={i <= (report.rating || 3) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
            ))}
          </div>
          <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">{report.content}</p>
        </div>
      )}
    </div>
  );
}