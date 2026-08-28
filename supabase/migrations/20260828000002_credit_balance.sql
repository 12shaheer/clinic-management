-- Add credit balance to patients
ALTER TABLE patients ADD COLUMN credit_balance NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Credit transactions table for audit trail
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  amount NUMERIC(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('advance_payment', 'credit_used', 'refund')),
  description TEXT,
  invoice_id UUID REFERENCES invoices(id),
  created_by UUID REFERENCES clinic_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_patient ON credit_transactions(patient_id);
CREATE INDEX idx_credit_transactions_created ON credit_transactions(created_at);
