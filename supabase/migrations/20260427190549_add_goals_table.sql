/*
  # Add Goals/Metas Table

  ## New Table
  - `goals` — Monthly goals per clinic with type, target value, and tracking

  ## Fields
  - clinic_id: references clinics
  - type: goal type (patients, revenue, leads, appointments)
  - month: format YYYY-MM
  - target: target value
  - current: current progress value
  - notes: optional notes
  - created_at: timestamp
*/

CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'patients',
  month text NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM'),
  target numeric(10,2) NOT NULL DEFAULT 0,
  current numeric(10,2) NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, type, month)
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to goals" ON goals FOR SELECT USING (true);
CREATE POLICY "Allow insert goals" ON goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update goals" ON goals FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete goals" ON goals FOR DELETE USING (true);
