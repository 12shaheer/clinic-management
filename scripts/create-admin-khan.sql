-- Run this in Supabase SQL Editor to create the admin user "khan"
-- The auth user must be created first via Supabase Dashboard:
--   Authentication > Users > Add User
--   Email: khan@clinic.test
--   Password: Nostrangers456456!
--
-- After creating the auth user, copy their UUID and replace below:

-- Step 1: Get the auth user's UUID (run this to find it after creating in dashboard)
-- SELECT id FROM auth.users WHERE email = 'khan@clinic.test';

-- Step 2: Insert into clinic_users (replace YOUR_AUTH_UUID with actual UUID)
INSERT INTO clinic_users (auth_user_id, name, email, role, status)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'khan@clinic.test'),
  'Khan',
  'khan@clinic.test',
  'admin',
  'active'
);
