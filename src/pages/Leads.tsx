import { useEffect, useState } from 'react';
import { Plus, TrendingUp, Minus, CalendarDays, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Clinic, LeadsDaily, LEAD_SOURCES } from '../types';

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const getWeekDetails = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00');
  const month = d.getMonth();
  const year = d.getFullYear();
  const dayOfMonth = d.getDate();

  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const weeks = [];
  
  let firstDay = 1;
  if (new Date(year, month, 1, 12, 0, 0).getDay() === 0) {
    firstDay = 2;
  }

  let currentStart = firstDay;
  while (currentStart <= lastDayOfMonth) {
    let currentEnd = 0;
    for (let i = currentStart; i <= lastDayOfMonth; i++) {
      const checkDate = new Date(year, month, i, 12, 0, 0);
      if (checkDate.getDay() === 6 || i === lastDayOfMonth) {
        currentEnd = i;
        break;
      }
    }
    weeks.push({ start: currentStart, end: currentEnd });
    let nextStart = currentEnd + 2; 
    currentStart = nextStart;
  }

  const weekIndex = weeks.findIndex(w => dayOfMonth >= w.start && dayOfMonth <= w.end) + 1;
  const currentWeek = weeks[weekIndex - 1];

  return {
    label: weekIndex === 0 ? `Domingo` : `Semana ${weekIndex} - ${monthNames[month]}/${year}`,
    interval: currentWeek ? `${String(currentWeek.start).padStart(2, '0')} a ${String(currentWeek.end).padStart(2, '0')}` : 'Dia de descanso',
    isValid: weekIndex !== 0,
    weeks,
    currentIndex: weekIndex - 1
  };
};

interface Props {
  clinic: Clinic;
}

type ViewMode = 'day' | 'month' | 'year';

export default function Leads({ clinic }: Props) {
  // CORREÇÃO DE FUSO HORÁRIO: Garante a data correta de São Paulo/Brasília
  const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const [periodMode, setPeriodMode] = useState<'day' | 'week' | 'month'>('day');
  const [date, setDate] = useState(todayStr);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [leads, setLeads] = useState<LeadsDaily[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    let query = supabase.from('leads_daily').select('*').eq('clinic_id', clinic.id);

    if (viewMode === 'day') {
      query = query.eq('date', date);
    } else if (viewMode === 'month') {
      const d = new Date(date + 'T12:00:00');
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const monthStart = `${date.slice(0, 7)}-01`;
      const monthEnd = `${date.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
      query = query.gte('date', monthStart).lte('date', monthEnd);
    } else {
      const yearStart = `${date.slice(0, 4)}-01-01`;
      const yearEnd = `${date.slice(0, 4)}-12-31`;
      query = query.gte('date', yearStart).lte('date', yearEnd);
    }

    const { data } = await query.order('date', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [clinic.id, date, viewMode]);

  const weekDetails = getWeekDetails(date);

  const navigate = (dir: 'prev' | 'next') => {
    const d = new Date(date + 'T12:00:00');
    if (viewMode === 'year') {
      d.setFullYear(d.getFullYear() + (dir === 'next' ? 1 : -1));
    } else if (viewMode === 'month') {
      d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1));
    } else {
      if (periodMode === 'day') {
        d.setDate(d.getDate() + (dir === 'next' ? 1 : -1));
      } else if (periodMode === 'month') {
        d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1));
      } else if (periodMode === 'week') {
        const { weeks, currentIndex } = weekDetails;
        if (dir === 'next' && currentIndex < weeks.length - 1) {
          d.setDate(weeks[currentIndex + 1].start);
        } else if (dir === 'prev' && currentIndex > 0) {
          d.setDate(weeks[currentIndex - 1].start);
        } else {
          d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1));
          const newWeeks = getWeekDetails(d.toISOString().split('T')[0]).weeks;
          d.setDate(dir === 'next' ? newWeeks[0].start : newWeeks[newWeeks.length - 1].start);
        }
      }
    }
    setDate(d.toISOString().split('T')[0]);
  };

  const updateCount = async (source: string, delta: number) => {
    if (viewMode !== 'day') return;
    const existing = leads.find(l => l.source === source);
    const newCount = Math.max(0, (existing?.count || 0) + delta);
    if (existing) {
      await supabase.from('leads_daily').update({ count: newCount }).eq('id', existing.id);
    } else {
      await supabase.from('leads_daily').insert({ clinic_id: clinic.id, date, source, count: newCount });
    }
    fetchData();
  };

  const totalLeads = leads.reduce((s, l) => s + l.count, 0);

  const getAggregatedBySource = () => {
    const map: Record<string, number> = {};
    leads.forEach(l => { map[l.source] = (map[l.source] || 0) + l.count; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const getDailyBreakdown = () => {
    const map: Record<string, number> = {};
    leads.forEach(l => { map[l.date] = (map[l.date] || 0) + l.count; });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  };

  const sourceAgg = getAggregatedBySource();
  const dailyBreakdown = getDailyBreakdown();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          {viewMode === 'day' && (
            <>
              <select value={periodMode} onChange={e => setPeriodMode(e.target.value as any)} 
                className="border-0 bg-transparent text-sm font-semibold focus:ring-0 cursor-pointer" style={{ color: clinic.color }}>
                <option value="day">Lançamento Diário</option>
                <option value="week">Lançamento Semanal</option>
                <option value="month">Lançamento Mensal</option>
              </select>
              <div className="h-4 w-[1px] bg-gray-200" />
            </>
          )}

          <div className="flex items-center gap-2">
            <button onClick={() => navigate('prev')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <ChevronLeft size={18} />
            </button>

            <input 
              type={viewMode === 'year' ? 'number' : (viewMode === 'month' || (viewMode === 'day' && periodMode === 'month') ? 'month' : 'date')} 
              value={viewMode === 'year' ? date.slice(0, 4) : (viewMode === 'month' || (viewMode === 'day' && periodMode === 'month') ? date.slice(0, 7) : date)}
              onChange={e => {
                if (viewMode === 'year') setDate(e.target.value + '-01-01');
                else if (viewMode === 'month' || periodMode === 'month') setDate(e.target.value + '-01');
                else setDate(e.target.value);
              }}
              className="border border-gray-100 rounded-xl px-3 py-1.5 text-sm bg-gray-50 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500" 
            />

            <button onClick={() => navigate('next')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <ChevronRight size={18} />
            </button>
            
            {viewMode === 'day' && periodMode === 'week' && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${weekDetails.isValid ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                <Calendar size={14} className={weekDetails.isValid ? 'text-emerald-600' : 'text-amber-600'} />
                <span className="text-xs font-bold text-emerald-700 whitespace-nowrap">
                  {weekDetails.label} ({weekDetails.interval})
                </span>
              </div>
            )}
            
            {viewMode === 'day' && periodMode === 'day' && (
              <button onClick={() => setDate(todayStr)} className="text-xs font-bold hover:opacity-80 transition-opacity ml-1" style={{ color: clinic.color }}>HOJE</button>
            )}
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl shadow-sm">
          {(['day', 'month', 'year'] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setViewMode(m)} 
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {m === 'day' ? 'Lançamentos' : m === 'month' ? 'Mês' : 'Ano'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp size={18} style={{ color: clinic.color }} />
          Total de Leads: <span className="text-gray-500 font-normal">
            {viewMode === 'day' ? (periodMode === 'week' ? weekDetails.label : (periodMode === 'day' ? 'Hoje' : monthNames[new Date(date + 'T12:00:00').getMonth()])) : viewMode === 'month' ? 'do Mês' : 'do Ano'}
          </span>
        </h3>
        <p className="text-3xl font-black mt-1" style={{ color: clinic.color }}>{totalLeads}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        viewMode === 'day' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(LEAD_SOURCES).map(([key, label]) => (
              <div key={key} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-gray-200 transition-colors">
                <h4 className="font-semibold text-gray-900 mb-4">{label}</h4>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => updateCount(key, -1)} className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors">
                    <Minus size={18} className="text-gray-600" />
                  </button>
                  <span className="text-3xl font-black" style={{ color: clinic.color }}>
                    {leads.find(l => l.source === key)?.count || 0}
                  </span>
                  <button onClick={() => updateCount(key, 1)} className="w-10 h-10 rounded-xl text-white shadow-sm flex items-center justify-center transition-colors" style={{ backgroundColor: clinic.color }}>
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Por Origem</h3>
              <div className="space-y-3">
                {sourceAgg.map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{LEAD_SOURCES[source] || source}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${totalLeads > 0 ? (count / totalLeads) * 100 : 0}%`, backgroundColor: clinic.color }} />
                      </div>
                      <span className="text-sm font-bold" style={{ color: clinic.color }}>{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CalendarDays size={16} className="text-gray-500" /> 
                Por {viewMode === 'month' ? 'Dia' : 'Mês'}
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {dailyBreakdown.map(([d, count]) => (
                  <div key={d} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-700 font-medium">
                      {viewMode === 'month' ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : d.slice(0, 7)}
                    </span>
                    <span className="text-sm font-bold" style={{ color: clinic.color }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}