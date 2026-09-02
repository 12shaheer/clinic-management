-- ============================================================
-- SEED DATA - Fictional data for development only
-- ============================================================
-- NOTE: Run this AFTER creating an admin user via Supabase Auth.
-- The admin user's auth UID must be inserted into clinic_users first.
-- Below we use placeholder UUIDs for clinic_users that should be
-- updated with real auth_user_ids after creating auth accounts.

-- ============================================================
-- PHYSIOTHERAPISTS
-- ============================================================

INSERT INTO physiotherapists (id, first_name, last_name, email, phone, specialization, status) VALUES
  ('d0000001-0001-4000-a001-000000000001', 'Sandhya', 'Kumari', NULL, NULL, NULL, 'active'),
  ('d0000001-0001-4000-a001-000000000002', 'Nisaullah', '', NULL, NULL, NULL, 'active'),
  ('d0000001-0001-4000-a001-000000000003', 'Sateesh', '', NULL, NULL, NULL, 'active');

-- ============================================================
-- PATIENTS
-- ============================================================

INSERT INTO patients (id, first_name, last_name, phone, email, date_of_birth, gender, address, emergency_contact_name, emergency_contact_phone, notes, status) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Fatima', 'Zahra', '0311-1111111', 'fatima.z@example.test', '1985-03-15', 'female', '123 Main Street, Islamabad', 'Ali Zahra', '0312-1111111', 'Lower back pain - chronic', 'active'),
  ('b2222222-2222-2222-2222-222222222222', 'Muhammad', 'Usman', '0322-2222222', 'usman.m@example.test', '1990-07-22', 'male', '456 Garden Road, Rawalpindi', 'Ayesha Usman', '0323-2222222', 'Post-ACL surgery rehabilitation', 'active'),
  ('b3333333-3333-3333-3333-333333333333', 'Ayesha', 'Siddiqui', '0333-3333333', NULL, '1978-11-08', 'female', '789 Blue Area, Islamabad', 'Tariq Siddiqui', '0334-3333333', 'Frozen shoulder - left', 'active'),
  ('b4444444-4444-4444-4444-444444444444', 'Bilal', 'Ahmed', '0344-4444444', 'bilal.a@example.test', '1995-01-30', 'male', '321 F-8 Markaz, Islamabad', 'Hina Ahmed', '0345-4444444', NULL, 'active'),
  ('b5555555-5555-5555-5555-555555555555', 'Zainab', 'Noor', '0355-5555555', 'zainab.n@example.test', '2000-06-12', 'female', '654 G-9, Islamabad', 'Noor Hassan', '0356-5555555', 'Sports injury - ankle sprain', 'active');

-- ============================================================
-- APPOINTMENTS (today and upcoming)
-- ============================================================

INSERT INTO appointments (id, patient_id, physiotherapist_id, appointment_date, start_time, end_time, appointment_type, status, notes) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'd0000001-0001-4000-a001-000000000001', CURRENT_DATE, '09:00', '09:45', 'Follow-up', 'completed', 'Regular follow-up session'),
  ('c2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'd0000001-0001-4000-a001-000000000002', CURRENT_DATE, '10:00', '10:45', 'Treatment', 'checked_in', 'ACL rehab week 6'),
  ('c3333333-3333-3333-3333-333333333333', 'b3333333-3333-3333-3333-333333333333', 'd0000001-0001-4000-a001-000000000001', CURRENT_DATE, '11:00', '11:45', 'Treatment', 'scheduled', 'Shoulder mobilization'),
  ('c4444444-4444-4444-4444-444444444444', 'b4444444-4444-4444-4444-444444444444', 'd0000001-0001-4000-a001-000000000003', CURRENT_DATE, '14:00', '14:30', 'Initial Assessment', 'scheduled', 'New patient assessment'),
  ('c5555555-5555-5555-5555-555555555555', 'b5555555-5555-5555-5555-555555555555', 'd0000001-0001-4000-a001-000000000002', CURRENT_DATE, '15:00', '15:45', 'Follow-up', 'scheduled', NULL),
  ('c6666666-6666-6666-6666-666666666666', 'b1111111-1111-1111-1111-111111111111', 'd0000001-0001-4000-a001-000000000001', CURRENT_DATE + INTERVAL '1 day', '09:00', '09:45', 'Follow-up', 'scheduled', NULL),
  ('c7777777-7777-7777-7777-777777777777', 'b3333333-3333-3333-3333-333333333333', 'd0000001-0001-4000-a001-000000000001', CURRENT_DATE + INTERVAL '2 days', '10:00', '10:45', 'Treatment', 'scheduled', NULL),
  ('c8888888-8888-8888-8888-888888888888', 'b2222222-2222-2222-2222-222222222222', 'd0000001-0001-4000-a001-000000000002', CURRENT_DATE + INTERVAL '3 days', '11:00', '11:45', 'Follow-up', 'confirmed', NULL),
  ('c9999999-9999-9999-9999-999999999999', 'b4444444-4444-4444-4444-444444444444', 'd0000001-0001-4000-a001-000000000003', CURRENT_DATE + INTERVAL '4 days', '09:00', '09:30', 'Treatment', 'scheduled', NULL),
  ('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b5555555-5555-5555-5555-555555555555', 'd0000001-0001-4000-a001-000000000002', CURRENT_DATE + INTERVAL '5 days', '14:00', '14:45', 'Follow-up', 'scheduled', NULL);

-- ============================================================
-- SESSIONS
-- ============================================================

INSERT INTO sessions (id, appointment_id, patient_id, physiotherapist_id, started_at, completed_at, session_notes, status) VALUES
  ('d1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'd0000001-0001-4000-a001-000000000001', CURRENT_DATE + TIME '09:00', CURRENT_DATE + TIME '09:40', 'Patient reports 40% improvement in lower back pain. Continued with lumbar mobilization and core stabilization exercises.', 'completed'),
  ('d2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'd0000001-0001-4000-a001-000000000002', NULL, NULL, NULL, 'waiting'),
  ('d3333333-3333-3333-3333-333333333333', NULL, 'b3333333-3333-3333-3333-333333333333', 'd0000001-0001-4000-a001-000000000001', CURRENT_DATE - INTERVAL '3 days' + TIME '11:00', CURRENT_DATE - INTERVAL '3 days' + TIME '11:40', 'Shoulder ROM improving. Added resistance exercises.', 'completed'),
  ('d4444444-4444-4444-4444-444444444444', NULL, 'b5555555-5555-5555-5555-555555555555', 'd0000001-0001-4000-a001-000000000002', CURRENT_DATE - INTERVAL '5 days' + TIME '14:00', CURRENT_DATE - INTERVAL '5 days' + TIME '14:35', 'Ankle mobility exercises. Good progress.', 'completed'),
  ('d5555555-5555-5555-5555-555555555555', NULL, 'b1111111-1111-1111-1111-111111111111', 'd0000001-0001-4000-a001-000000000001', CURRENT_DATE - INTERVAL '7 days' + TIME '09:00', CURRENT_DATE - INTERVAL '7 days' + TIME '09:45', 'Initial assessment completed. Treatment plan discussed.', 'completed');

-- ============================================================
-- INVOICES
-- ============================================================

INSERT INTO invoices (id, patient_id, appointment_id, session_id, subtotal, discount, total, status, issued_at) VALUES
  ('e1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 3000.00, 0.00, 3000.00, 'paid', NOW()),
  ('e2222222-2222-2222-2222-222222222222', 'b3333333-3333-3333-3333-333333333333', NULL, 'd3333333-3333-3333-3333-333333333333', 3500.00, 500.00, 3000.00, 'paid', NOW() - INTERVAL '3 days'),
  ('e3333333-3333-3333-3333-333333333333', 'b5555555-5555-5555-5555-555555555555', NULL, 'd4444444-4444-4444-4444-444444444444', 2500.00, 0.00, 2500.00, 'paid', NOW() - INTERVAL '5 days'),
  ('e4444444-4444-4444-4444-444444444444', 'b1111111-1111-1111-1111-111111111111', NULL, 'd5555555-5555-5555-5555-555555555555', 5000.00, 0.00, 5000.00, 'paid', NOW() - INTERVAL '7 days'),
  ('e5555555-5555-5555-5555-555555555555', 'b2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', NULL, 3000.00, 0.00, 3000.00, 'unpaid', NOW());

-- ============================================================
-- PAYMENTS
-- ============================================================

INSERT INTO payments (id, patient_id, invoice_id, appointment_id, session_id, amount, payment_method, payment_status, paid_at) VALUES
  ('f1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 3000.00, 'cash', 'completed', NOW()),
  ('f2222222-2222-2222-2222-222222222222', 'b3333333-3333-3333-3333-333333333333', 'e2222222-2222-2222-2222-222222222222', NULL, 'd3333333-3333-3333-3333-333333333333', 3000.00, 'card', 'completed', NOW() - INTERVAL '3 days'),
  ('f3333333-3333-3333-3333-333333333333', 'b5555555-5555-5555-5555-555555555555', 'e3333333-3333-3333-3333-333333333333', NULL, 'd4444444-4444-4444-4444-444444444444', 2500.00, 'cash', 'completed', NOW() - INTERVAL '5 days'),
  ('f4444444-4444-4444-4444-444444444444', 'b1111111-1111-1111-1111-111111111111', 'e4444444-4444-4444-4444-444444444444', NULL, 'd5555555-5555-5555-5555-555555555555', 5000.00, 'bank_transfer', 'completed', NOW() - INTERVAL '7 days'),
  ('f5555555-5555-5555-5555-555555555555', 'b2222222-2222-2222-2222-222222222222', 'e5555555-5555-5555-5555-555555555555', 'c2222222-2222-2222-2222-222222222222', NULL, 1500.00, 'cash', 'completed', NOW());

-- ============================================================
-- RECEIPTS
-- ============================================================

INSERT INTO receipts (id, payment_id, patient_id, invoice_id, amount, issued_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 3000.00, NOW()),
  ('22222222-2222-2222-2222-222222222222', 'f2222222-2222-2222-2222-222222222222', 'b3333333-3333-3333-3333-333333333333', 'e2222222-2222-2222-2222-222222222222', 3000.00, NOW() - INTERVAL '3 days'),
  ('33333333-3333-3333-3333-333333333333', 'f3333333-3333-3333-3333-333333333333', 'b5555555-5555-5555-5555-555555555555', 'e3333333-3333-3333-3333-333333333333', 2500.00, NOW() - INTERVAL '5 days'),
  ('44444444-4444-4444-4444-444444444444', 'f4444444-4444-4444-4444-444444444444', 'b1111111-1111-1111-1111-111111111111', 'e4444444-4444-4444-4444-444444444444', 5000.00, NOW() - INTERVAL '7 days'),
  ('55555555-5555-5555-5555-555555555555', 'f5555555-5555-5555-5555-555555555555', 'b2222222-2222-2222-2222-222222222222', 'e5555555-5555-5555-5555-555555555555', 1500.00, NOW());
