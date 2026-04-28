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
  attendance: 'Atendimentos',
  appointments: 'Agenda',
  leads: 'Leads',
  financial: 'Financeiro',
  invoices: 'Notas Fiscais',
  goals: 'Metas',
  reports: 'Relatórios',
  classifications: 'Classificações',
  categories: 'Categorias',
};

export default function Layout({ currentPage, onNavigate, alertCount, alerts, clinic, clinics, onClinicChange, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  // Função para navegar e fechar o menu no mobile simultaneamente
  const handleNavigate = (page: Page) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Overlay para fechar o menu ao clicar fora (Mobile) */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[55] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        current={currentPage}
        onNavigate={handleNavigate}
        alertCount={alertCount}
        clinic={clinic}
        clinics={clinics}
        onClinicChange={onClinicChange}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/60 px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between flex-shrink-0 z-50">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 active:scale-95 transition-all"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div>
              <p className="text-slate-400 text-[10px] lg:text-xs font-bold uppercase tracking-widest">{greeting}</p>
              <h1 className="text-slate-900 font-black text-base lg:text-lg tracking-tight uppercase">
                {pageTitles[currentPage]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            {clinic && (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase"
                style={{ backgroundColor: clinic.color + '12', color: clinic.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: clinic.color }} />
                {clinic.name}
              </div>
            )}
            
            <div className="relative">
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className={`relative p-2 rounded-xl transition-all ${showAlerts ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}
              >
                <Bell size={20} />
                {alertCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {alertCount > 9 ? '!' : alertCount}
                  </span>
                )}
              </button>

              {showAlerts && (
                <>
                  <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setShowAlerts(false)} />
                  <div className="absolute right-0 top-full mt-2 w-[85vw] sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                      <span className="font-black text-slate-900 text-xs uppercase tracking-widest">Alertas</span>
                      <button onClick={() => setShowAlerts(false)} className="text-slate-400 p-1">
                        <X size={18} />
                      </button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      {alerts.length === 0 ? (
                        <p className="text-slate-400 text-xs font-bold uppercase text-center py-10">Tudo em dia</p>
                      ) : (
                        alerts.map(alert => {
                          const isPast = new Date(alert.due_at) < new Date();
                          return (
                            <div key={alert.id} className={`px-4 py-4 border-b border-slate-50 last:border-0 ${isPast ? 'bg-rose-50/30' : ''}`}>
                              <p className="text-slate-900 text-sm font-bold">{alert.title}</p>
                              <p className={`text-[10px] mt-1 font-black uppercase ${isPast ? 'text-rose-500' : 'text-amber-500'}`}>
                                {new Date(alert.due_at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 pb-20 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}