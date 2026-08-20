-- Make end_time optional on appointments
ALTER TABLE appointments ALTER COLUMN end_time DROP NOT NULL;
ALTER TABLE appointments DROP CONSTRAINT end_after_start;
ALTER TABLE appointments ADD CONSTRAINT end_after_start CHECK (end_time IS NULL OR end_time > start_time);
