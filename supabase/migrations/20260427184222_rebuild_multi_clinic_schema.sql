/*
  # Drop old tables and recreate for multi-clinic system

  ## Changes
  - Drops old single-clinic tables
  - Recreates all tables with clinic_id foreign key
  - Seeds two clinics and default data
*/

-- Drop old tables in reverse dependency order
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS financial_records CASCADE;
DROP TABLE IF EXISTS financial_categories CASCADE;
DROP TABLE IF EXISTS daily_reports CASCADE;
DROP TABLE IF EXISTS leads_daily CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS daily_attendance CASCADE;
DROP TABLE IF EXISTS patient_classifications CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS procedures CASCADE;
DROP TABLE IF EXISTS clinics CASCADE;

-- CLINICS
CREATE TABLE clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#059669',
  icon text NOT NULL DEFAULT 'scissors',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to clinics" ON clinics FOR SELECT USING (true);
CREATE POLICY "Allow insert clinics" ON clinics FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update clinics" ON clinics FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete clinics" ON clinics FOR DELETE USING (true);

-- PATIENT CLASSIFICATIONS
CREATE TABLE patient_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE patient_classifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to patient_classifications" ON patient_classifications FOR SELECT USING (true);
CREATE POLICY "Allow insert patient_classifications" ON patient_classifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update patient_classifications" ON patient_classifications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete patient_classifications" ON patient_classifications FOR DELETE USING (true);

-- DAILY ATTENDANCE
CREATE TABLE daily_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  classification_id uuid NOT NULL REFERENCES patient_classifications(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  count integer NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, classification_id, date)
);

ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to daily_attendance" ON daily_attendance FOR SELECT USING (true);
CREATE POLICY "Allow insert daily_attendance" ON daily_attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update daily_attendance" ON daily_attendance FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete daily_attendance" ON daily_attendance FOR DELETE USING (true);

-- APPOINTMENTS
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  title text NOT NULL,
  contact_name text DEFAULT '',
  contact_phone text DEFAULT '',
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'scheduled',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to appointments" ON appointments FOR SELECT USING (true);
CREATE POLICY "Allow insert appointments" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update appointments" ON appointments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete appointments" ON appointments FOR DELETE USING (true);

-- LEADS DAILY
CREATE TABLE leads_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL DEFAULT 'other',
  count integer NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, date, source)
);

ALTER TABLE leads_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to leads_daily" ON leads_daily FOR SELECT USING (true);
CREATE POLICY "Allow insert leads_daily" ON leads_daily FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update leads_daily" ON leads_daily FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete leads_daily" ON leads_daily FOR DELETE USING (true);

-- DAILY REPORTS
CREATE TABLE daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  content text NOT NULL DEFAULT '',
  rating integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, date)
);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to daily_reports" ON daily_reports FOR SELECT USING (true);
CREATE POLICY "Allow insert daily_reports" ON daily_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update daily_reports" ON daily_reports FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete daily_reports" ON daily_reports FOR DELETE USING (true);

-- FINANCIAL CATEGORIES
CREATE TABLE financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'expense',
  color text NOT NULL DEFAULT '#6B7280',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to financial_categories" ON financial_categories FOR SELECT USING (true);
CREATE POLICY "Allow insert financial_categories" ON financial_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update financial_categories" ON financial_categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete financial_categories" ON financial_categories FOR DELETE USING (true);

-- FINANCIAL RECORDS
CREATE TABLE financial_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  category_id uuid REFERENCES financial_categories(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'payable',
  description text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  due_date date NOT NULL DEFAULT CURRENT_DATE,
  paid_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to financial_records" ON financial_records FOR SELECT USING (true);
CREATE POLICY "Allow insert financial_records" ON financial_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update financial_records" ON financial_records FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete financial_records" ON financial_records FOR DELETE USING (true);

-- INVOICES
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  number text NOT NULL DEFAULT '',
  issuer text NOT NULL DEFAULT '',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text DEFAULT '',
  category text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to invoices" ON invoices FOR SELECT USING (true);
CREATE POLICY "Allow insert invoices" ON invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update invoices" ON invoices FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete invoices" ON invoices FOR DELETE USING (true);

-- ALERTS
CREATE TABLE alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  due_at timestamptz NOT NULL,
  type text NOT NULL DEFAULT 'appointment',
  status text NOT NULL DEFAULT 'pending',
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to alerts" ON alerts FOR SELECT USING (true);
CREATE POLICY "Allow insert alerts" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update alerts" ON alerts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete alerts" ON alerts FOR DELETE USING (true);

-- SEED CLINICS
INSERT INTO clinics (name, slug, color, icon) VALUES
  ('Harmonização Facial', 'harmonizacao', '#059669', 'scissors'),
  ('Instituto Bruba Braga', 'bruba', '#0F766E', 'heart');

-- SEED DEFAULT CLASSIFICATIONS
INSERT INTO patient_classifications (clinic_id, name, color, sort_order)
SELECT id, 'Novo', '#3B82F6', 1 FROM clinics WHERE slug = 'harmonizacao'
UNION ALL
SELECT id, 'Recorrente', '#059669', 2 FROM clinics WHERE slug = 'harmonizacao'
UNION ALL
SELECT id, 'Indicação', '#D97706', 3 FROM clinics WHERE slug = 'harmonizacao'
UNION ALL
SELECT id, 'Novo', '#3B82F6', 1 FROM clinics WHERE slug = 'bruba'
UNION ALL
SELECT id, 'Recorrente', '#0F766E', 2 FROM clinics WHERE slug = 'bruba'
UNION ALL
SELECT id, 'Indicação', '#D97706', 3 FROM clinics WHERE slug = 'bruba';

-- SEED DEFAULT FINANCIAL CATEGORIES
INSERT INTO financial_categories (clinic_id, name, type, color)
SELECT id, 'Aluguel', 'expense', '#DC2626' FROM clinics WHERE slug = 'harmonizacao'
UNION ALL
SELECT id, 'Insumos', 'expense', '#EA580C' FROM clinics WHERE slug = 'harmonizacao'
UNION ALL
SELECT id, 'Marketing', 'expense', '#D97706' FROM clinics WHERE slug = 'harmonizacao'
UNION ALL
SELECT id, 'Salários', 'expense', '#9333EA' FROM clinics WHERE slug = 'harmonizacao'
UNION ALL
SELECT id, 'Impostos', 'expense', '#6B7280' FROM clinics WHERE slug = 'harmonizacao'
UNION ALL
SELECT id, 'Utilidades', 'expense', '#0EA5E9' FROM clinics WHERE slug = 'harmonizacao'
UNION ALL
SELECT id, 'Procedimentos', 'income', '#059669' FROM clinics WHERE slug = 'harmonizacao'
UNION ALL
SELECT id, 'Consultas', 'income', '#0F766E' FROM clinics WHERE slug = 'harmonizacao'
UNION ALL
SELECT id, 'Aluguel', 'expense', '#DC2626' FROM clinics WHERE slug = 'bruba'
UNION ALL
SELECT id, 'Insumos', 'expense', '#EA580C' FROM clinics WHERE slug = 'bruba'
UNION ALL
SELECT id, 'Marketing', 'expense', '#D97706' FROM clinics WHERE slug = 'bruba'
UNION ALL
SELECT id, 'Salários', 'expense', '#9333EA' FROM clinics WHERE slug = 'bruba'
UNION ALL
SELECT id, 'Impostos', 'expense', '#6B7280' FROM clinics WHERE slug = 'bruba'
UNION ALL
SELECT id, 'Utilidades', 'expense', '#0EA5E9' FROM clinics WHERE slug = 'bruba'
UNION ALL
SELECT id, 'Serviços', 'income', '#059669' FROM clinics WHERE slug = 'bruba'
UNION ALL
SELECT id, 'Consultas', 'income', '#0F766E' FROM clinics WHERE slug = 'bruba';
