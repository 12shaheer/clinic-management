-- Add payment_confirmed_at and confirmed_by columns to invoices
ALTER TABLE invoices ADD COLUMN payment_confirmed_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN confirmed_by UUID REFERENCES clinic_users(id);

-- Index for quick lookup of unpaid invoices
CREATE INDEX idx_invoices_unpaid ON invoices(status) WHERE status IN ('unpaid', 'partially_paid');
CREATE INDEX idx_invoices_created_date ON invoices(created_at);
