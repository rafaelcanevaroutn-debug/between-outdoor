DO $$ 
DECLARE 
    constraint_name text;
BEGIN 
    -- Eliminar check constraint de 'niche' en tabla profiles
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'profiles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%niche%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE profiles DROP CONSTRAINT ' || constraint_name;
    END IF;

    -- Eliminar check constraint de 'nicho' en tabla tiktok_intelligence
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'tiktok_intelligence'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%nicho%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE tiktok_intelligence DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;
