-- Property boundary (manually drawn polygons).
-- Stored as a GeoJSON FeatureCollection on the properties table — each feature
-- is a Polygon with `properties: { name, kind }`.
-- `kind` is a free-form string ('building', 'garage', 'fence', 'garden',
-- 'parking', 'other'); empty / null is allowed.

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'properties'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'boundary_geojson'
        ) THEN
            ALTER TABLE properties ADD COLUMN boundary_geojson JSONB;
        END IF;
    END IF;
END $$;

COMMIT;
