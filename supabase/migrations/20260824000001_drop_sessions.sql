-- Drop RLS policy that depends on session_id
DROP POLICY IF EXISTS "Physios can view invoices for their sessions" ON invoices;

-- Replace with a simpler policy for physios viewing invoices
CREATE POLICY "Physios can view invoices for their patients"
  ON invoices FOR SELECT
  USING (
    get_user_role() = 'physiotherapist'
    AND patient_id IN (
      SELECT a.patient_id FROM appointments a
      JOIN physiotherapists p ON p.id = a.physiotherapist_id
      JOIN clinic_users cu ON cu.email = p.email
      WHERE cu.auth_user_id = auth.uid()
    )
  );

-- Remove session_id foreign keys from invoices and payments
ALTER TABLE invoices DROP COLUMN IF EXISTS session_id;
ALTER TABLE payments DROP COLUMN IF EXISTS session_id;

-- Drop sessions table indexes
DROP INDEX IF EXISTS idx_sessions_appointment;
DROP INDEX IF EXISTS idx_sessions_patient;
DROP INDEX IF EXISTS idx_sessions_physio;
DROP INDEX IF EXISTS idx_sessions_status;
DROP INDEX IF EXISTS idx_sessions_code;
DROP INDEX IF EXISTS idx_invoices_session;

-- Drop sessions table (cascades trigger)
DROP TABLE IF EXISTS sessions CASCADE;

-- Drop session code sequence and function
DROP FUNCTION IF EXISTS generate_session_code();
DROP SEQUENCE IF EXISTS session_code_seq;

-- Remove 'in_session' from appointments status check constraint
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('scheduled', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'));
