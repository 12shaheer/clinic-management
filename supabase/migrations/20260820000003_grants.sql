-- ============================================================
-- GRANT TABLE ACCESS TO authenticated AND anon ROLES
-- ============================================================
-- RLS policies control row-level access. These GRANTs allow
-- the roles to access the tables in the first place.

GRANT USAGE ON SCHEMA public TO authenticated, anon;

GRANT SELECT, INSERT, UPDATE ON patients TO authenticated;
GRANT SELECT, INSERT, UPDATE ON physiotherapists TO authenticated;
GRANT SELECT, INSERT, UPDATE ON appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON invoices TO authenticated;
GRANT SELECT, INSERT ON payments TO authenticated;
GRANT SELECT, INSERT ON receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON clinic_users TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;

-- Grant sequence usage for ID generation
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
