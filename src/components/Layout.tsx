import { ReactNode, useState } from 'react';
import { Menu, Bell, X, Clock } from 'lucide-react';
import Sidebar from './Sidebar';
import { Page, Clinic, Alert } from '../types';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  alertCount: number;
  alerts: Alert[];
  clinic: Clinic | null;
  clinics: Clinic[];
  onClinicChange: (clinic: Clinic) => void;
  children: ReactNode;
}

const pageTitles: Record<Page, string> = {
  dashboard: 'Dashboard',
  attendance: 'Atendimentos do Dia',
  appointments: 'Agenda de Compromissos',
  leads: 'Controle de Leads',
  financial: 'Gestão Financeira',
  invoices: 'Notas Fiscais',
  goals: 'Metas',
  reports: 'Relatórios',
  classifications: 'Classificações de Pacientes',
  categories: 'Categorias Financeiras',
};

export default function Layout({ currentPage, onNavigate, alertCount, alerts, clinic, clinics, onClinicChange, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  // CORREÇÃO DE FUSO HORÁRIO: Força o horário de São Paulo para a saudação e o relógio
  const now = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        current={currentPage}
        onNavigate={onNavigate}
        alertCount={alertCount}
        clinic={clinic}
        clinics={clinics}
        onClinicChange={onClinicChange}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 lg:px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-slate-400 text-xs font-medium">{greeting}</p>
              <h1 className="text-slate-900 font-bold text-lg tracking-tight">{pageTitles[currentPage]}</h1>
            </div>
            {clinic && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: clinic.color + '12', color: clinic.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: clinic.color }} />
                {clinic.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400">
              <Clock size={13} />
              {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className="relative p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all duration-200"
              >
                <Bell size={18} />
                {alertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm shadow-rose-500/30">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </button>
              {showAlerts && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-100 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <span className="font-semibold text-slate-900 text-sm">Alertas Pendentes</span>
                    <button onClick={() => setShowAlerts(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-8">Nenhum alerta pendente</p>
                    ) : (
                      alerts.slice(0, 10).map(alert => {
                        const isPast = new Date(alert.due_at) < new Date();
                        return (
                          <div key={alert.id} className={`px-4 py-3 border-b border-slate-50 last:border-0 transition-colors ${isPast ? 'bg-rose-50/50' : ''}`}>
                            <p className="text-slate-900 text-sm font-medium">{alert.title}</p>
                            {alert.description && <p className="text-slate-500 text-xs mt-0.5">{alert.description}</p>}
                            <p className={`text-[11px] mt-1 font-medium ${isPast ? 'text-rose-500' : 'text-amber-500'}`}>
                              {new Date(alert.due_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}