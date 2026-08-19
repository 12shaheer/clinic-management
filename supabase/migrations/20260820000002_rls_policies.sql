-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE clinic_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE physiotherapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: Get current user's role
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM clinic_users WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM clinic_users
    WHERE auth_user_id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM clinic_users
    WHERE auth_user_id = auth.uid() AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- CLINIC_USERS POLICIES
-- ============================================================

CREATE POLICY "Users can view own record"
  ON clinic_users FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Admins can view all users"
  ON clinic_users FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert users"
  ON clinic_users FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update users"
  ON clinic_users FOR UPDATE
  USING (is_admin());

-- ============================================================
-- PATIENTS POLICIES
-- ============================================================

CREATE POLICY "Staff can view patients"
  ON patients FOR SELECT
  USING (is_staff());

CREATE POLICY "Admin and receptionist can insert patients"
  ON patients FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'receptionist'));

CREATE POLICY "Admin and receptionist can update patients"
  ON patients FOR UPDATE
  USING (get_user_role() IN ('admin', 'receptionist'));

-- ============================================================
-- PHYSIOTHERAPISTS POLICIES
-- ============================================================

CREATE POLICY "Staff can view physiotherapists"
  ON physiotherapists FOR SELECT
  USING (is_staff());

CREATE POLICY "Admins can insert physiotherapists"
  ON physiotherapists FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update physiotherapists"
  ON physiotherapists FOR UPDATE
  USING (is_admin());

-- ============================================================
-- APPOINTMENTS POLICIES
-- ============================================================

CREATE POLICY "Admin and receptionist can view all appointments"
  ON appointments FOR SELECT
  USING (get_user_role() IN ('admin', 'receptionist'));

CREATE POLICY "Physios can view their own appointments"
  ON appointments FOR SELECT
  USING (
    get_user_role() = 'physiotherapist'
    AND physiotherapist_id IN (
      SELECT p.id FROM physiotherapists p
      JOIN clinic_users cu ON cu.email = p.email
      WHERE cu.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admin and receptionist can insert appointments"
  ON appointments FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'receptionist'));

CREATE POLICY "Admin and receptionist can update appointments"
  ON appointments FOR UPDATE
  USING (get_user_role() IN ('admin', 'receptionist'));

-- ============================================================
-- SESSIONS POLICIES
-- ============================================================

CREATE POLICY "Admin and receptionist can view all sessions"
  ON sessions FOR SELECT
  USING (get_user_role() IN ('admin', 'receptionist'));

CREATE POLICY "Physios can view their own sessions"
  ON sessions FOR SELECT
  USING (
    get_user_role() = 'physiotherapist'
    AND physiotherapist_id IN (
      SELECT p.id FROM physiotherapists p
      JOIN clinic_users cu ON cu.email = p.email
      WHERE cu.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert sessions"
  ON sessions FOR INSERT
  WITH CHECK (is_staff());

CREATE POLICY "Staff can update sessions"
  ON sessions FOR UPDATE
  USING (is_staff());

-- ============================================================
-- INVOICES POLICIES
-- ============================================================

CREATE POLICY "Admin and receptionist can view all invoices"
  ON invoices FOR SELECT
  USING (get_user_role() IN ('admin', 'receptionist'));

CREATE POLICY "Physios can view invoices for their sessions"
  ON invoices FOR SELECT
  USING (
    get_user_role() = 'physiotherapist'
    AND session_id IN (
      SELECT s.id FROM sessions s
      JOIN physiotherapists p ON p.id = s.physiotherapist_id
      JOIN clinic_users cu ON cu.email = p.email
      WHERE cu.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admin and receptionist can insert invoices"
  ON invoices FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'receptionist'));

CREATE POLICY "Admin and receptionist can update invoices"
  ON invoices FOR UPDATE
  USING (get_user_role() IN ('admin', 'receptionist'));

-- ============================================================
-- PAYMENTS POLICIES
-- ============================================================

CREATE POLICY "Admin and receptionist can view all payments"
  ON payments FOR SELECT
  USING (get_user_role() IN ('admin', 'receptionist'));

CREATE POLICY "Admin and receptionist can insert payments"
  ON payments FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'receptionist'));

CREATE POLICY "Admin can update payments"
  ON payments FOR UPDATE
  USING (is_admin());

-- ============================================================
-- RECEIPTS POLICIES
-- ============================================================

CREATE POLICY "Admin and receptionist can view all receipts"
  ON receipts FOR SELECT
  USING (get_user_role() IN ('admin', 'receptionist'));

CREATE POLICY "Admin and receptionist can insert receipts"
  ON receipts FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'receptionist'));

-- ============================================================
-- AUDIT_LOGS POLICIES
-- ============================================================

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (is_admin());

CREATE POLICY "Staff can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (is_staff());
