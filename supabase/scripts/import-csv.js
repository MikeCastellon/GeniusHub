/**
 * Import auto detailing businesses from CSV files into Supabase directory_listings.
 *
 * Usage: node import-csv.js
 *
 * Reads 4 CSV files from ~/Downloads, filters to auto care categories,
 * deduplicates, maps fields, and inserts into Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ── Supabase config ──
const SUPABASE_URL = 'https://rbtilezwxucnqefukbzi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidGlsZXp3eHVjbnFlZnVrYnppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDQyMzYsImV4cCI6MjA4ODMyMDIzNn0.yRmFkjOQYwwdusuqfC67dh3IRusXJdBZiD2gvLydakI';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── CSV files ──
const DL_DIR = join(homedir(), 'Downloads');
const CSV_FILES = [
  'Auto Detailing in Tallahassee, FL (Report by Luis Marcelino).csv',
  'Auto Detailing in Tampa, FL (Report by Luis Marcelino).csv',
  'AUTO DETAILING in Orlando, FL (Report by Luis Marcelino).csv',
  'Auto Detailing in Kissimmee, FL (Report by Luis Marcelino).csv',
];

// ── Category allowlist & mapping ──
const CATEGORY_MAP = {
  'valeting service':           ['Detail Shop'],
  'auto detailing':             ['Detail Shop'],
  'auto detail':                ['Detail Shop'],
  'car wash':                   ['Car Wash'],
  'window tinting service':     ['Tint Shop'],
  'car window tinting':         ['Tint Shop'],
  'vehicle wrapping service':   ['PPF / Wrap'],
  'vehicle wraps':              ['PPF / Wrap'],
  'pressure washers':           ['Mobile Detailing'],
  'pressure washing service':   ['Mobile Detailing'],
  'car restoration service':    ['Paint Correction'],
  'ceramic coating':            ['Ceramic Coating'],
};

function getAllowedCategories() {
  return new Set(Object.keys(CATEGORY_MAP));
}

function mapServices(mainCategory) {
  const key = (mainCategory || '').toLowerCase().trim();
  return CATEGORY_MAP[key] || ['Detail Shop']; // default fallback
}

function isAllowedCategory(cat) {
  const key = (cat || '').toLowerCase().trim();
  return getAllowedCategories().has(key);
}

function cleanPhone(phone) {
  if (!phone) return null;
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return phone; // return as-is
}

function cleanUrl(url) {
  if (!url || url === 'http://' || url === 'https://') return null;
  return url;
}

function parseStars(val) {
  if (!val) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function parseInt2(val) {
  if (!val) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

// ── Main ──
async function main() {
  console.log('🚀 Starting CSV import...\n');

  // 1. Read all CSVs
  let allRows = [];
  for (const file of CSV_FILES) {
    const path = join(DL_DIR, file);
    try {
      const content = readFileSync(path, 'utf8');
      const rows = parse(content, { columns: true, skip_empty_lines: true });
      console.log(`  📄 ${file}: ${rows.length} rows`);
      allRows.push(...rows);
    } catch (e) {
      console.error(`  ❌ Failed to read ${file}: ${e.message}`);
    }
  }
  console.log(`\n  Total raw rows: ${allRows.length}`);

  // 2. Filter to auto care categories
  const filtered = allRows.filter(r => {
    const cat = (r.MainCategory || '').toLowerCase().trim();
    return isAllowedCategory(cat);
  });
  console.log(`  After category filter: ${filtered.length}`);

  // 3. Filter out rows missing required fields
  const valid = filtered.filter(r => {
    return r.BusinessName && r.BusinessName.trim() &&
           r.City && r.City.trim() &&
           r.State && r.State.trim();
  });
  console.log(`  After required fields filter: ${valid.length}`);

  // 4. Deduplicate by business_name + city + state (case-insensitive)
  const seen = new Set();
  const deduped = [];
  for (const r of valid) {
    const key = `${r.BusinessName.trim().toLowerCase()}|${r.City.trim().toLowerCase()}|${r.State.trim().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(r);
    }
  }
  console.log(`  After dedup: ${deduped.length}\n`);

  // 5. Map to Supabase rows
  const rows = deduped.map(r => ({
    business_name:      r.BusinessName.trim(),
    owner_name:         null,
    email:              r.Email?.trim() || null,
    phone:              cleanPhone(r.Telephone),
    address:            r.Address?.trim() || null,
    city:               r.City.trim(),
    state:              r.State.trim().toUpperCase(),
    zip:                r.ZIP?.trim() || null,
    website_url:        cleanUrl(r.WebsiteURL?.trim()),
    description:        null,
    services_offered:   mapServices(r.MainCategory),
    logo_url:           null,
    is_acg_member:      false,
    featured:           false,
    status:             'approved',
    google_stars:       parseStars(r.GoogleStars),
    google_review_count: parseInt2(r.GoogleCount),
    yelp_stars:         parseStars(r.YelpStars),
    facebook_stars:     parseStars(r.FacebookStars),
    instagram_url:      cleanUrl(r.Instagram?.trim()),
    facebook_url:       cleanUrl(r.FacebookProfile?.trim()),
    google_maps_url:    cleanUrl(r.Gmaps_URL?.trim()),
    main_category:      r.MainCategory?.trim() || null,
    source:             'csv_import',
  }));

  // 6. Generate SQL file for supabase db execute (bypasses RLS)
  const { writeFileSync } = await import('fs');

  let sql = '-- Auto-generated directory import\nBEGIN;\n\n';

  for (const r of rows) {
    const esc = (v) => v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;
    const arr = (v) => v === null ? 'NULL' : `ARRAY[${v.map(s => `'${s}'`).join(',')}]::text[]`;
    const num = (v) => v === null ? 'NULL' : v;

    sql += `INSERT INTO directory_listings (business_name, owner_name, email, phone, address, city, state, zip, website_url, description, services_offered, logo_url, is_acg_member, featured, status, google_stars, google_review_count, yelp_stars, facebook_stars, instagram_url, facebook_url, google_maps_url, main_category, source) VALUES (${esc(r.business_name)}, NULL, ${esc(r.email)}, ${esc(r.phone)}, ${esc(r.address)}, ${esc(r.city)}, ${esc(r.state)}, ${esc(r.zip)}, ${esc(r.website_url)}, NULL, ${arr(r.services_offered)}, NULL, false, false, 'approved', ${num(r.google_stars)}, ${num(r.google_review_count)}, ${num(r.yelp_stars)}, ${num(r.facebook_stars)}, ${esc(r.instagram_url)}, ${esc(r.facebook_url)}, ${esc(r.google_maps_url)}, ${esc(r.main_category)}, 'csv_import');\n`;
  }

  sql += '\nCOMMIT;\n';

  const outPath = join(import.meta.dirname, 'import-data.sql');
  writeFileSync(outPath, sql, 'utf8');
  console.log(`\n📝 Generated SQL file: ${outPath}`);
  console.log(`  Total INSERT statements: ${rows.length}`);
  console.log(`\nRun with: npx supabase db execute --file supabase/scripts/import-data.sql`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
