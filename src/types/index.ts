export type Page =
  | 'dashboard'
  | 'attendance'
  | 'appointments'
  | 'financial'
  | 'leads'
  | 'goals'
  | 'reports'
  | 'invoices'
  | 'classifications'
  | 'categories';

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface PatientClassification {
  id: string;
  clinic_id: string;
  name: string;
  color: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface DailyAttendance {
  id: string;
  clinic_id: string;
  classification_id: string;
  date: string;
  count: number;
  notes: string;
  created_at: string;
  classification?: PatientClassification;
}

export interface Appointment {
  id: string;
  clinic_id: string;
  title: string;
  contact_name: string;
  contact_phone: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string;
  created_at: string;
}

export interface LeadsDaily {
  id: string;
  clinic_id: string;
  date: string;
  source: string;
  count: number;
  notes: string;
  created_at: string;
}

export interface DailyReport {
  id: string;
  clinic_id: string;
  date: string;
  content: string;
  rating: number;
  created_at: string;
}

export interface FinancialCategory {
  id: string;
  clinic_id: string;
  name: string;
  type: string;
  color: string;
  active: boolean;
  created_at: string;
}

export interface FinancialRecord {
  id: string;
  clinic_id: string;
  category_id: string | null;
  type: string;
  description: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  notes: string;
  created_at: string;
  category?: FinancialCategory;
}

export interface Invoice {
  id: string;
  clinic_id: string;
  number: string;
  issuer: string;
  amount: number;
  date: string;
  description: string;
  category: string;
  notes: string;
  created_at: string;
}

export interface Alert {
  id: string;
  clinic_id: string;
  title: string;
  description: string;
  due_at: string;
  type: string;
  status: string;
  appointment_id: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  clinic_id: string;
  type: string;
  month: string;
  target: number;
  current: number;
  notes: string;
  created_at: string;
}

export const GOAL_TYPES: Record<string, string> = {
  patients: 'Atendimentos',
  revenue: 'Receita (R$)',
  leads: 'Leads',
  appointments: 'Compromissos',
};

export const GOAL_TYPE_ICONS: Record<string, string> = {
  patients: 'Users',
  revenue: 'DollarSign',
  leads: 'TrendingUp',
  appointments: 'CalendarDays',
};

export const LEAD_SOURCES: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
  referral: 'Indicação',
  google: 'Google',
  other: 'Outro',
};

export const APPOINTMENT_STATUSES: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Realizado',
  cancelled: 'Cancelado',
  no_show: 'Não Compareceu',
};

export const FINANCIAL_TYPES: Record<string, string> = {
  expense: 'Despesa',
  income: 'Receita',
};

export const FINANCIAL_STATUSES: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
};
