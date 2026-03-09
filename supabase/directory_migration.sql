-- Directory Listings table for ACG Pro Hub Detailer Directory
CREATE TABLE IF NOT EXISTS directory_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT,
  website_url TEXT,
  description TEXT,
  services_offered TEXT[] DEFAULT '{}',
  logo_url TEXT,
  is_acg_member BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE directory_listings ENABLE ROW LEVEL SECURITY;

-- Public can read approved listings (no auth needed)
CREATE POLICY "Public read approved listings"
  ON directory_listings FOR SELECT
  USING (status = 'approved');

-- Anyone can insert new listings (registration form, always pending)
CREATE POLICY "Public insert listings"
  ON directory_listings FOR INSERT
  WITH CHECK (status = 'pending');

-- Indexes for filtering and performance
CREATE INDEX idx_directory_city_state ON directory_listings(city, state);
CREATE INDEX idx_directory_status ON directory_listings(status);
CREATE INDEX idx_directory_services ON directory_listings USING GIN(services_offered);
