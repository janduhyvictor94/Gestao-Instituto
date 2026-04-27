// src/types/index.ts

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
  icon?: string;
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
  notes?: string;
  created_at: string;
  classification?: PatientClassification;
}

// INTERFACE CORRIGIDA: Adicionados campos date, time, completed e financeiros
export interface Appointment {
  id: string;
  clinic_id: string;
  title: string;
  date: string;       // Necessário para Dashboard e Agenda
  time: string;       // Necessário para Dashboard e Agenda
  completed: boolean; // Necessário para Dashboard e Agenda
  contact_name?: string;
  contact_phone?: string;
  type: 'common' | 'financial';
  amount: number;
  category_id?: string;
  category_name?: string;
  is_recurring: boolean;
  current_installment?: number;
  total_installments?: number;
  description?: string;
  scheduled_at?: string;
  notes?: string;
  created_at: string;
}

export interface LeadsDaily {
  id: string;
  clinic_id: string;
  date: string;
  source: string;
  count: number;
  notes?: string;
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
  notes?: string;
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
  notes?: string;
  file_url?: string; // Campo para o anexo da nota fiscal
  created_at: string;
}

export interface Alert {
  id: string;
  clinic_id: string;
  title: string;
  description?: string;
  due_at: string;
  type?: string;
  status: string;
  appointment_id?: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  clinic_id: string;
  type: string;
  month: string;
  target: number;
  current: number;
  notes?: string;
  created_at: string;
}

export const GOAL_TYPES: Record<string, string> = {
  patients: 'Atendimentos',
  revenue: 'Faturamento',
  leads: 'Leads',
  appointments: 'Compromissos',
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
  pending: 'Pendente',
  completed: 'Concluído',
  cancelled: 'Cancelado',
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