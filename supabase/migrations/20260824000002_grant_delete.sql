-- Grant DELETE permission to authenticated and service_role
GRANT DELETE ON receipts TO authenticated;
GRANT DELETE ON payments TO authenticated;
GRANT DELETE ON invoices TO authenticated;
GRANT DELETE ON appointments TO authenticated;
GRANT DELETE ON patients TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON receipts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON appointments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON patients TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON physiotherapists TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON clinic_users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs TO service_role;
