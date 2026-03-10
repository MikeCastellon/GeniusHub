-- Enrich directory_listings for bulk CSV import
-- Adds ratings, social links, and import metadata

-- Make owner_name and email nullable (CSV imports may not have them)
ALTER TABLE directory_listings ALTER COLUMN owner_name DROP NOT NULL;
ALTER TABLE directory_listings ALTER COLUMN email DROP NOT NULL;

-- Ratings
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS google_stars NUMERIC(2,1);
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS google_review_count INTEGER;
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS yelp_stars NUMERIC(2,1);
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS facebook_stars NUMERIC(2,1);

-- Social & Maps links
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

-- Category & source tracking
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS main_category TEXT;
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
