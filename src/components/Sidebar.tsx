import {
  LayoutDashboard,
  CalendarDays,
  DollarSign,
  TrendingUp,
  BarChart3,
  FileText,
  Users,
  Tag,
  Bell,
  Sparkles,
  Building2,
  Target,
} from 'lucide-react';
import { Page, Clinic } from '../types';

interface Props {
  current: Page;
  onNavigate: (page: Page) => void;
  alertCount: number;
  clinic: Clinic | null;
  clinics: Clinic[];
  onClinicChange: (clinic: Clinic) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const navSections = [
  {
    label: 'Operacional',
    items: [
      { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
      { id: 'attendance' as Page, label: 'Atendimentos', icon: Users },
      { id: 'appointments' as Page, label: 'Agenda', icon: CalendarDays },
      { id: 'leads' as Page, label: 'Leads', icon: TrendingUp },
      { id: 'goals' as Page, label: 'Metas', icon: Target },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { id: 'financial' as Page, label: 'Financeiro', icon: DollarSign },
      { id: 'invoices' as Page, label: 'Notas Fiscais', icon: FileText },
    ],
  },
  {
    label: 'Configurações',
    items: [
      { id: 'reports' as Page, label: 'Relatórios', icon: BarChart3 },
      { id: 'classifications' as Page, label: 'Classificações', icon: Tag },
      { id: 'categories' as Page, label: 'Categorias Fin.', icon: Tag },
    ],
  },
];

const clinicIcons: Record<string, React.ElementType> = {
  sparkles: Sparkles,
  building2: Building2,
};

export default function Sidebar({ current, onNavigate, alertCount, clinic, clinics, onClinicChange, mobileOpen, onMobileClose }: Props) {
  const ClinicIcon = clinic ? (clinicIcons[clinic.icon] || Sparkles) : Sparkles;

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden" onClick={onMobileClose} />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-[272px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 z-40 flex flex-col transform transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:z-auto ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: clinic ? clinic.color + '25' : '#1e293b' }}>
              <ClinicIcon size={16} style={{ color: clinic?.color || '#94a3b8' }} />
            </div>
            <div>
              <p className="text-white text-sm font-semibold tracking-tight">Gestão de Clínicas</p>
              <p className="text-slate-500 text-[10px] uppercase tracking-widest">Painel Administrativo</p>
            </div>
          </div>
          <div className="space-y-1">
            {clinics.map(c => {
              const Icon = clinicIcons[c.icon] || Sparkles;
              const isActive = clinic?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onClinicChange(c)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                  style={isActive ? { backgroundColor: c.color + '20', boxShadow: `inset 3px 0 0 ${c.color}` } : {}}
                >
                  <Icon size={15} style={isActive ? { color: c.color } : {}} />
                  <span className="truncate">{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto">
          {navSections.map((section, si) => (
            <div key={section.label} className={si > 0 ? 'mt-4' : ''}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600 font-semibold px-3 mb-1.5">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isActive = current === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { onNavigate(item.id); onMobileClose(); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                      style={isActive && clinic ? { backgroundColor: clinic.color + '18', color: clinic.color } : {}}
                    >
                      <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                      <span>{item.label}</span>
                      {item.id === 'dashboard' && alertCount > 0 && (
                        <span className="ml-auto flex items-center gap-1 bg-rose-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          <Bell size={9} />
                          {alertCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: clinic ? clinic.color + '15' : 'transparent' }}>
              <ClinicIcon size={13} style={{ color: clinic?.color || '#475569' }} />
            </div>
            <p className="text-slate-500 text-xs truncate">{clinic?.name || 'Selecione uma clínica'}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
