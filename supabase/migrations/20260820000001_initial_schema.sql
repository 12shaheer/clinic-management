-- ============================================================
-- CLINIC MANAGEMENT SYSTEM - Initial Schema
-- ============================================================

-- Use gen_random_uuid() which is built-in to PostgreSQL 13+

-- ============================================================
-- SEQUENCE TABLES FOR HUMAN-READABLE ID GENERATION
-- ============================================================

CREATE SEQUENCE patient_code_seq START 1;
CREATE SEQUENCE physio_code_seq START 1;
CREATE SEQUENCE appointment_code_seq START 1;
CREATE SEQUENCE session_code_seq START 1;
CREATE SEQUENCE invoice_code_seq START 1;
CREATE SEQUENCE payment_code_seq START 1;
CREATE SEQUENCE receipt_code_seq START 1;

-- ============================================================
-- ID GENERATION FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION generate_patient_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'PT-' || LPAD(nextval('patient_code_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_physio_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'PHY-' || LPAD(nextval('physio_code_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_appointment_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'APT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('appointment_code_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'SES-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('session_code_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_invoice_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_code_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_payment_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'PAY-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('payment_code_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_receipt_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'RCT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('receipt_code_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLES
-- ============================================================

-- CLINIC USERS
CREATE TABLE clinic_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'receptionist', 'physiotherapist')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER clinic_users_updated_at
  BEFORE UPDATE ON clinic_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- PATIENTS
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_code TEXT UNIQUE NOT NULL DEFAULT generate_patient_code(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discharged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- PHYSIOTHERAPISTS
CREATE TABLE physiotherapists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physio_code TEXT UNIQUE NOT NULL DEFAULT generate_physio_code(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  specialization TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER physiotherapists_updated_at
  BEFORE UPDATE ON physiotherapists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- APPOINTMENTS
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_code TEXT UNIQUE NOT NULL DEFAULT generate_appointment_code(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  physiotherapist_id UUID NOT NULL REFERENCES physiotherapists(id),
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  appointment_type TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'checked_in', 'in_session', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_by UUID REFERENCES clinic_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- SESSIONS
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT UNIQUE NOT NULL DEFAULT generate_session_code(),
  appointment_id UUID REFERENCES appointments(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  physiotherapist_id UUID NOT NULL REFERENCES physiotherapists(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  session_notes TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- INVOICES
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_code TEXT UNIQUE NOT NULL DEFAULT generate_invoice_code(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id),
  session_id UUID REFERENCES sessions(id),
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'cancelled')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- PAYMENTS
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_code TEXT UNIQUE NOT NULL DEFAULT generate_payment_code(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  appointment_id UUID REFERENCES appointments(id),
  session_id UUID REFERENCES sessions(id),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'online', 'other')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_reference TEXT,
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES clinic_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RECEIPTS
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_code TEXT UNIQUE NOT NULL DEFAULT generate_receipt_code(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  amount NUMERIC(10,2) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AUDIT LOGS
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES clinic_users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_patients_code ON patients(patient_code);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_name ON patients(first_name, last_name);
CREATE INDEX idx_patients_status ON patients(status);

CREATE INDEX idx_physiotherapists_code ON physiotherapists(physio_code);
CREATE INDEX idx_physiotherapists_status ON physiotherapists(status);

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_physio ON appointments(physiotherapist_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_code ON appointments(appointment_code);

CREATE INDEX idx_sessions_appointment ON sessions(appointment_id);
CREATE INDEX idx_sessions_patient ON sessions(patient_id);
CREATE INDEX idx_sessions_physio ON sessions(physiotherapist_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_code ON sessions(session_code);

CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_invoices_session ON invoices(session_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_code ON invoices(invoice_code);

CREATE INDEX idx_payments_patient ON payments(patient_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_code ON payments(payment_code);

CREATE INDEX idx_receipts_payment ON receipts(payment_id);
CREATE INDEX idx_receipts_patient ON receipts(patient_id);
CREATE INDEX idx_receipts_code ON receipts(receipt_code);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

CREATE INDEX idx_clinic_users_auth ON clinic_users(auth_user_id);
