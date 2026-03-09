CREATE TABLE IF NOT EXISTS quote_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type TEXT NOT NULL CHECK (service_type IN ('gl','garage','auto','tax')),

  -- Business info
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT,
  years_in_business TEXT,
  num_employees TEXT,
  annual_revenue TEXT,

  -- Current insurance
  has_current_insurance BOOLEAN DEFAULT false,
  current_provider TEXT,
  current_premium_monthly NUMERIC(10,2),
  coverage_amount TEXT,

  -- GL-specific
  gl_sq_footage INTEGER,
  gl_mobile_only BOOLEAN,

  -- Garage-specific
  garage_building_value TEXT,
  garage_equipment_value TEXT,
  garage_inventory_value TEXT,

  -- Auto-specific
  auto_num_vehicles INTEGER,
  auto_vehicle_types TEXT[],

  -- Tax-specific
  tax_entity_type TEXT,

  -- Quote result
  quoted_monthly NUMERIC(10,2),
  quoted_annual NUMERIC(10,2),
  quote_tier TEXT,

  -- Contact preferences
  preferred_contact TEXT,
  additional_notes TEXT,

  -- Meta
  status TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','converted','closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert quote_requests"
  ON quote_requests FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_quote_requests_service ON quote_requests(service_type);
CREATE INDEX idx_quote_requests_status ON quote_requests(status);
CREATE INDEX idx_quote_requests_created ON quote_requests(created_at DESC);
