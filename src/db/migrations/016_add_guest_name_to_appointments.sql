-- Migration 016: Add guest_name to appointments table

-- Add guest_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='guest_name') THEN
    ALTER TABLE appointments ADD COLUMN guest_name TEXT;
  END IF;
END $$;
