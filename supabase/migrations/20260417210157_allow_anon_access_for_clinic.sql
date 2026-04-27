/*
  # Allow Anonymous Access for Clinic Management

  ## Changes
  - Updates all RLS policies to allow both authenticated and anon roles
  - This enables the clinic management app to work without requiring user login
  - The app is an internal management tool, so direct access via anon key is acceptable

  ## Tables Modified
  All clinic tables: procedures, patients, leads, appointments, payments, expenses, invoices, alerts
*/

-- PROCEDURES
DROP POLICY IF EXISTS "Authenticated users can select procedures" ON procedures;
DROP POLICY IF EXISTS "Authenticated users can insert procedures" ON procedures;
DROP POLICY IF EXISTS "Authenticated users can update procedures" ON procedures;
DROP POLICY IF EXISTS "Authenticated users can delete procedures" ON procedures;

CREATE POLICY "Allow all access to procedures" ON procedures FOR SELECT USING (true);
CREATE POLICY "Allow insert procedures" ON procedures FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update procedures" ON procedures FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete procedures" ON procedures FOR DELETE USING (true);

-- PATIENTS
DROP POLICY IF EXISTS "Authenticated users can select patients" ON patients;
DROP POLICY IF EXISTS "Authenticated users can insert patients" ON patients;
DROP POLICY IF EXISTS "Authenticated users can update patients" ON patients;
DROP POLICY IF EXISTS "Authenticated users can delete patients" ON patients;

CREATE POLICY "Allow all access to patients" ON patients FOR SELECT USING (true);
CREATE POLICY "Allow insert patients" ON patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update patients" ON patients FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete patients" ON patients FOR DELETE USING (true);

-- LEADS
DROP POLICY IF EXISTS "Authenticated users can select leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON leads;

CREATE POLICY "Allow all access to leads" ON leads FOR SELECT USING (true);
CREATE POLICY "Allow insert leads" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update leads" ON leads FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete leads" ON leads FOR DELETE USING (true);

-- APPOINTMENTS
DROP POLICY IF EXISTS "Authenticated users can select appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can delete appointments" ON appointments;

CREATE POLICY "Allow all access to appointments" ON appointments FOR SELECT USING (true);
CREATE POLICY "Allow insert appointments" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update appointments" ON appointments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete appointments" ON appointments FOR DELETE USING (true);

-- PAYMENTS
DROP POLICY IF EXISTS "Authenticated users can select payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can update payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can delete payments" ON payments;

CREATE POLICY "Allow all access to payments" ON payments FOR SELECT USING (true);
CREATE POLICY "Allow insert payments" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update payments" ON payments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete payments" ON payments FOR DELETE USING (true);

-- INVOICES
DROP POLICY IF EXISTS "Authenticated users can select invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON invoices;

CREATE POLICY "Allow all access to invoices" ON invoices FOR SELECT USING (true);
CREATE POLICY "Allow insert invoices" ON invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update invoices" ON invoices FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete invoices" ON invoices FOR DELETE USING (true);

-- EXPENSES
DROP POLICY IF EXISTS "Authenticated users can select expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can update expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can delete expenses" ON expenses;

CREATE POLICY "Allow all access to expenses" ON expenses FOR SELECT USING (true);
CREATE POLICY "Allow insert expenses" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update expenses" ON expenses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete expenses" ON expenses FOR DELETE USING (true);

-- ALERTS
DROP POLICY IF EXISTS "Authenticated users can select alerts" ON alerts;
DROP POLICY IF EXISTS "Authenticated users can insert alerts" ON alerts;
DROP POLICY IF EXISTS "Authenticated users can update alerts" ON alerts;
DROP POLICY IF EXISTS "Authenticated users can delete alerts" ON alerts;

CREATE POLICY "Allow all access to alerts" ON alerts FOR SELECT USING (true);
CREATE POLICY "Allow insert alerts" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update alerts" ON alerts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete alerts" ON alerts FOR DELETE USING (true);
