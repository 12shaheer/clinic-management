-- Enforce unique phone numbers for patients
ALTER TABLE patients ADD CONSTRAINT patients_phone_unique UNIQUE (phone);
