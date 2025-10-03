-- Migration 012: Backfill ext  -- Loop through all services without external_id
  FOR service_record IN 
    SELECT id, business_id, name 
    FROM services 
    WHERE external_id IS NULL 
      AND deleted_at IS NULL
    ORDER BY business_id, sort_order, id
  LOOP for existing services
-- Generates slugs from service names for services that don't have external_id yet

-- Function to create a slug from a service name
CREATE OR REPLACE FUNCTION slugify(text_value TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          TRIM(text_value),
          '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special chars
        ),
        '\s+', '-', 'g'  -- Replace spaces with hyphens
      ),
      '-+', '-', 'g'  -- Replace multiple hyphens with single
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill external_id for services that don't have one
-- Uses name-based slugification with deduplication
DO $$
DECLARE
  service_record RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
BEGIN
  -- Loop through all services without external_id
  FOR service_record IN 
    SELECT id, business_id, name 
    FROM services 
    WHERE external_id IS NULL 
      AND deleted_at IS NULL
    ORDER BY business_id, sort_order
  LOOP
    -- Generate base slug from name
    base_slug := slugify(service_record.name);
    
    -- Ensure slug is not empty
    IF base_slug = '' OR base_slug IS NULL THEN
      base_slug := 'service';
    END IF;
    
    -- Check if slug exists for this business, if so append counter
    final_slug := base_slug;
    counter := 1;
    
    WHILE EXISTS (
      SELECT 1 FROM services 
      WHERE business_id = service_record.business_id 
        AND external_id = final_slug
        AND id != service_record.id
        AND deleted_at IS NULL
    ) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    
    -- Update the service with the generated external_id
    UPDATE services 
    SET external_id = final_slug
    WHERE id = service_record.id;
    
    RAISE NOTICE 'Backfilled service % (%) with external_id: %', 
      service_record.name, service_record.id, final_slug;
  END LOOP;
END $$;

-- Drop the temporary slugify function (we'll create a permanent one if needed later)
DROP FUNCTION slugify(TEXT);

-- Verify backfill
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM services
  WHERE external_id IS NULL AND deleted_at IS NULL;
  
  IF null_count > 0 THEN
    RAISE WARNING 'Still have % services without external_id', null_count;
  ELSE
    RAISE NOTICE 'All active services now have external_id';
  END IF;
END $$;
