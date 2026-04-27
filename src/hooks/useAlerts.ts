import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Alert } from '../types';

export function useAlerts(clinicId: string | null) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchAlerts = async () => {
    if (!clinicId) return;
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'pending')
      .order('due_at', { ascending: true });

    if (data) {
      setAlerts(data);
      const now = new Date();
      const upcoming = data.filter(a => new Date(a.due_at) <= new Date(now.getTime() + 24 * 60 * 60 * 1000));
      setPendingCount(upcoming.length);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [clinicId]);

  return { alerts, pendingCount, refetch: fetchAlerts };
}
