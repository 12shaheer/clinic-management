-- Add collected_by column to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS collected_by TEXT DEFAULT 'reception';
