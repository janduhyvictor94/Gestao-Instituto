import { useEffect, useState } from 'react';
import { Plus, Users, Minus, FileText, Star, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Clinic, PatientClassification, DailyAttendance, DailyReport } from '../types';
import Modal from '../components/Modal';

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
  
  if (weekIndex === 0) {
    return {
      label: `Domingo - ${monthNames[month]}/${year}`,
      interval: `Dia de Descanso`,
      isValid: false,
      weeks
    };
  }

  const currentWeek = weeks[weekIndex - 1];
  return {
    label: `Semana ${weekIndex} - ${monthNames[month]}/${year}`,
    interval: `${String(currentWeek.start).padStart(2, '0')} a ${String(currentWeek.end).padStart(2, '0')}`,
    isValid: true,
    weeks,
    currentIndex: weekIndex - 1
  };
};

const getWeekString = (dStr: string) => {
  if (!dStr) return '';
  const d = new Date(dStr + 'T12:00:00');
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

const getDateFromWeek = (weekStr: string) => {
  if (!weekStr) return new Date().toISOString().split('T')[0];
  const [y, w] = weekStr.split('-W');
  const d = new Date(Number(y), 0, 1 + (Number(w) - 1) * 7);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().split('T')[0];
};

interface Props {
  clinic: Clinic;
}

export default function Attendance({ clinic }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [periodMode, setPeriodMode] = useState<'day' | 'week' | 'month'>('day');
  const [date, setDate] = useState(today);
  const [classifications, setClassifications] = useState<PatientClassification[]>([]);
  const [attendance, setAttendance] = useState<DailyAttendance[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportModal, setReportModal] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [reportRating, setReportRating] = useState(3);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [clsRes, attRes, repRes] = await Promise.all([
      supabase.from('patient_classifications').select('*').eq('clinic_id', clinic.id).eq('active', true).order('sort_order'),
      supabase.from('daily_attendance').select('*, classification:patient_classifications(name,color)').eq('clinic_id', clinic.id).eq('date', date),
      supabase.from('daily_reports').select('*').eq('clinic_id', clinic.id).eq('date', date).maybeSingle(),
    ]);
    setClassifications((clsRes.data as PatientClassification[]) || []);
    setAttendance((attRes.data as DailyAttendance[]) || []);
    setReport((repRes.data as DailyReport) || null);
    if (repRes.data) {
      setReportContent((repRes.data as DailyReport).content);
      setReportRating((repRes.data as DailyReport).rating || 3);
    } else {
      setReportContent('');
      setReportRating(3);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [clinic.id, date]);

  const weekDetails = getWeekDetails(date);

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const d = new Date(date + 'T12:00:00');
    if (periodMode === 'day') {
      d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
    } else if (periodMode === 'month') {
      d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (periodMode === 'week') {
      const { weeks, currentIndex } = weekDetails;
      if (direction === 'next' && currentIndex !== undefined && currentIndex < weeks.length - 1) {
        d.setDate(weeks[currentIndex + 1].start);
      } else if (direction === 'prev' && currentIndex !== undefined && currentIndex > 0) {
        d.setDate(weeks[currentIndex - 1].start);
      } else {
        d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
        const newWeeks = getWeekDetails(d.toISOString().split('T')[0]).weeks;
        d.setDate(direction === 'next' ? newWeeks[0].start : newWeeks[newWeeks.length - 1].start);
      }
    }
    setDate(d.toISOString().split('T')[0]);
  };

  const updateCount = async (clsId: string, delta: number) => {
    const att = attendance.find(a => a.classification_id === clsId);
    const newCount = Math.max(0, (att?.count || 0) + delta);
    if (att) {
      await supabase.from('daily_attendance').update({ count: newCount }).eq('id', att.id);
    } else {
      await supabase.from('daily_attendance').insert({ clinic_id: clinic.id, classification_id: clsId, date, count: newCount });
    }
    fetchData();
  };

  const setCount = async (clsId: string, count: number) => {
    const att = attendance.find(a => a.classification_id === clsId);
    if (att) {
      await supabase.from('daily_attendance').update({ count }).eq('id', att.id);
    } else {
      await supabase.from('daily_attendance').insert({ clinic_id: clinic.id, classification_id: clsId, date, count });
    }
    fetchData();
  };

  const handleSaveReport = async () => {
    setSaving(true);
    const payload = { clinic_id: clinic.id, date, content: reportContent, rating: reportRating };
    if (report) await supabase.from('daily_reports').update(payload).eq('id', report.id);
    else await supabase.from('daily_reports').insert(payload);
    setSaving(false);
    setReportModal(false);
    fetchData();
  };

  const totalPatients = attendance.reduce((s, a) => s + a.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <select value={periodMode} onChange={e => setPeriodMode(e.target.value as any)}
            className="border-0 bg-transparent text-sm font-semibold focus:ring-0 cursor-pointer" style={{ color: clinic.color }}>
            <option value="day">Lançamento Diário</option>
            <option value="week">Lançamento Semanal</option>
            <option value="month">Lançamento Mensal</option>
          </select>
          <div className="h-4 w-[1px] bg-gray-200" />
          <div className="flex items-center gap-2">
            <button onClick={() => navigatePeriod('prev')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft size={18} /></button>
            <input type={periodMode === 'month' ? 'month' : 'date'} value={periodMode === 'month' ? date.slice(0, 7) : date}
              onChange={e => setDate(periodMode === 'month' ? e.target.value + '-01' : e.target.value)}
              className="border border-gray-100 rounded-xl px-3 py-1.5 text-sm bg-gray-50 font-medium" />
            <button onClick={() => navigatePeriod('next')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronRight size={18} /></button>
            {periodMode === 'week' && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${weekDetails.isValid ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                <Calendar size={14} className={weekDetails.isValid ? 'text-emerald-600' : 'text-amber-600'} />
                <span className="text-xs font-bold whitespace-nowrap text-emerald-700">{weekDetails.label} ({weekDetails.interval})</span>
              </div>
            )}
            {periodMode === 'day' && <button onClick={() => setDate(today)} className="text-xs font-bold" style={{ color: clinic.color }}>HOJE</button>}
          </div>
        </div>
        <button onClick={() => setReportModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-sm" style={{ backgroundColor: clinic.color }}>
          <FileText size={16} /> Relatório
        </button>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users size={18} style={{ color: clinic.color }} />
            Atendimentos: <span className="text-gray-500 font-normal">{periodMode === 'week' ? weekDetails.label : periodMode === 'month' ? monthNames[new Date(date + 'T12:00:00').getMonth()] : 'Hoje'}</span>
          </h3>
          <div className="text-right">
            <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Total</p>
            <p className="text-2xl font-black" style={{ color: clinic.color }}>{totalPatients}</p>
          </div>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classifications.map(cls => (
            <div key={cls.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cls.color }} />
                <h4 className="font-semibold text-gray-900">{cls.name}</h4>
              </div>
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => updateCount(cls.id, -1)} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center"><Minus size={18} /></button>
                <input type="number" value={attendance.find(a => a.classification_id === cls.id)?.count || 0}
                  onChange={e => setCount(cls.id, parseInt(e.target.value) || 0)}
                  className="w-16 text-center text-3xl font-black border-0 bg-transparent" style={{ color: cls.color }} />
                <button onClick={() => updateCount(cls.id, 1)} className="w-10 h-10 rounded-xl text-white shadow-sm flex items-center justify-center" style={{ backgroundColor: clinic.color }}><Plus size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {report && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-2">Resumo do Período</h3>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} className={i <= (report.rating || 3) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />)}
          </div>
          <p className="text-gray-700 text-sm whitespace-pre-wrap">{report.content}</p>
        </div>
      )}

      {reportModal && (
        <Modal title="Relatório do Período" onClose={() => setReportModal(false)} size="lg">
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">Avaliação ({periodMode === 'week' ? weekDetails.label : 'Mensal'})</label>
            <div className="flex gap-2 mb-3">
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} onClick={() => setReportRating(i)}><Star size={28} className={i <= reportRating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} /></button>
              ))}
            </div>
            <textarea rows={6} value={reportContent} onChange={e => setReportContent(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Observações..." />
            <div className="flex gap-3">
              <button onClick={() => setReportModal(false)} className="flex-1 border py-2.5 rounded-xl">Cancelar</button>
              <button onClick={handleSaveReport} disabled={saving} className="flex-1 text-white py-2.5 rounded-xl" style={{ backgroundColor: clinic.color }}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}