-- Replace all physiotherapists with the new doctor list:
-- Dr. Sandhya Kumari, Dr. Nisaullah, Dr. Sateesh

-- Update existing appointments/sessions to point to the first new physio
-- so foreign key constraints are satisfied before we delete old rows.

-- Step 1: Insert new physiotherapists
INSERT INTO physiotherapists (id, first_name, last_name, email, phone, specialization, status) VALUES
  ('d0000001-0001-4000-a001-000000000001', 'Sandhya', 'Kumari', NULL, NULL, NULL, 'active'),
  ('d0000001-0001-4000-a001-000000000002', 'Nisaullah', '', NULL, NULL, NULL, 'active'),
  ('d0000001-0001-4000-a001-000000000003', 'Sateesh', '', NULL, NULL, NULL, 'active');

-- Step 2: Reassign any appointments referencing old physios to Dr. Sandhya Kumari
UPDATE appointments
SET physiotherapist_id = 'd0000001-0001-4000-a001-000000000001'
WHERE physiotherapist_id NOT IN (
  'd0000001-0001-4000-a001-000000000001',
  'd0000001-0001-4000-a001-000000000002',
  'd0000001-0001-4000-a001-000000000003'
);

-- Step 3: Delete old physiotherapists
DELETE FROM physiotherapists
WHERE id NOT IN (
  'd0000001-0001-4000-a001-000000000001',
  'd0000001-0001-4000-a001-000000000002',
  'd0000001-0001-4000-a001-000000000003'
);
