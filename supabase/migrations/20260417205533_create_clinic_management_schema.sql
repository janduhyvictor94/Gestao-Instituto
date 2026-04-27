
/*
  # Clinic Management System - Complete Schema

  ## Overview
  Full schema for a facial harmonization clinic management system.

  ## Tables Created

  ### 1. `procedures`
  Service catalog with procedure names, prices, and durations.

  ### 2. `patients`
  Patient registry with contact info and notes.

  ### 3. `leads`
  Daily lead tracking with source, status, and conversion tracking.

  ### 4. `appointments`
  Scheduling with patient, procedure, date/time, status, and pricing.

  ### 5. `payments`
  Payment records linked to appointments with method and status.

  ### 6. `expenses`
  Daily expense records with categories for financial control.

  ### 7. `invoices`
  Nota fiscal registry with issuer, amount, and description.

  ### 8. `alerts`
  Appointment and commitment alerts with due dates and status.

  ## Security
  - RLS enabled on all tables
  - Policies allow authenticated users to manage all records
*/

-- PROCEDURES
CREATE TABLE IF NOT EXISTS procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 60,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select procedures"
  ON procedures FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert procedures"
  ON procedures FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update procedures"
  ON procedures FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete procedures"
  ON procedures FOR DELETE TO authenticated USING (true);

-- PATIENTS
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  birth_date date,
  address text DEFAULT '',
  notes text DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select patients"
  ON patients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert patients"
  ON patients FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update patients"
  ON patients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete patients"
  ON patients FOR DELETE TO authenticated USING (true);

-- LEADS
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  source text NOT NULL DEFAULT 'other',
  status text NOT NULL DEFAULT 'new',
  notes text DEFAULT '',
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select leads"
  ON leads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert leads"
  ON leads FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads"
  ON leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete leads"
  ON leads FOR DELETE TO authenticated USING (true);

-- APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  procedure_id uuid REFERENCES procedures(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  price numeric(10,2) NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select appointments"
  ON appointments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert appointments"
  ON appointments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update appointments"
  ON appointments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete appointments"
  ON appointments FOR DELETE TO authenticated USING (true);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select payments"
  ON payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert payments"
  ON payments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update payments"
  ON payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete payments"
  ON payments FOR DELETE TO authenticated USING (true);

-- INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL DEFAULT '',
  issuer text NOT NULL DEFAULT '',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'supply',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select invoices"
  ON invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert invoices"
  ON invoices FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices"
  ON invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete invoices"
  ON invoices FOR DELETE TO authenticated USING (true);

-- EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'other',
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select expenses"
  ON expenses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert expenses"
  ON expenses FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update expenses"
  ON expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete expenses"
  ON expenses FOR DELETE TO authenticated USING (true);

-- ALERTS
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  due_at timestamptz NOT NULL,
  type text NOT NULL DEFAULT 'appointment',
  status text NOT NULL DEFAULT 'pending',
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select alerts"
  ON alerts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert alerts"
  ON alerts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update alerts"
  ON alerts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete alerts"
  ON alerts FOR DELETE TO authenticated USING (true);

-- Sample procedures
INSERT INTO procedures (name, description, price, duration_minutes) VALUES
  ('Toxina Botulínica', 'Aplicação de botox para redução de rugas', 800.00, 60),
  ('Preenchimento Labial', 'Preenchimento com ácido hialurônico', 1200.00, 90),
  ('Bioestimulador de Colágeno', 'Aplicação de Sculptra ou Radiesse', 1500.00, 90),
  ('Fios de PDO', 'Lifting com fios de sustentação', 2000.00, 120),
  ('Skinbooster', 'Hidratação profunda da pele', 900.00, 60)
ON CONFLICT DO NOTHING;
