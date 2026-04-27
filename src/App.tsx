import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Appointments from './pages/Appointments';
import Financial from './pages/Financial';
import Leads from './pages/Leads';
import Goals from './pages/Goals';
import Reports from './pages/Reports';
import Invoices from './pages/Invoices';
import Classifications from './pages/Classifications';
import Categories from './pages/Categories';
import { useAlerts } from './hooks/useAlerts';
import { supabase } from './lib/supabase';
import { Page, Clinic } from './types';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [activeClinic, setActiveClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);

  const { alerts, pendingCount } = useAlerts(activeClinic?.id || null);

  useEffect(() => {
    const fetchClinics = async () => {
      const { data } = await supabase.from('clinics').select('*').order('name');
      setClinics(data || []);
      if (data && data.length > 0 && !activeClinic) {
        setActiveClinic(data[0]);
      }
      setLoading(false);
    };
    fetchClinics();
  }, []);

  const handleClinicChange = (clinic: Clinic) => {
    setActiveClinic(clinic);
    setCurrentPage('dashboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-slate-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!activeClinic) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <p className="text-slate-400">Nenhuma clínica cadastrada</p>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard clinic={activeClinic} onNavigate={setCurrentPage} />;
      case 'attendance': return <Attendance clinic={activeClinic} />;
      case 'appointments': return <Appointments clinic={activeClinic} />;
      case 'financial': return <Financial clinic={activeClinic} />;
      case 'leads': return <Leads clinic={activeClinic} />;
      case 'goals': return <Goals clinic={activeClinic} />;
      case 'reports': return <Reports clinic={activeClinic} />;
      case 'invoices': return <Invoices clinic={activeClinic} />;
      case 'classifications': return <Classifications clinic={activeClinic} />;
      case 'categories': return <Categories clinic={activeClinic} />;
      default: return <Dashboard clinic={activeClinic} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      alertCount={pendingCount}
      alerts={alerts}
      clinic={activeClinic}
      clinics={clinics}
      onClinicChange={handleClinicChange}
    >
      {renderPage()}
    </Layout>
  );
}
