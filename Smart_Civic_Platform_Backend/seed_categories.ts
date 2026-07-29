import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const categories = [
  { category_name: 'Drinking Water Shortage', department_category: 'water_supply', default_priority: 'high', default_sla_hours: 48 },
  { category_name: 'Water Pipe Leakage', department_category: 'water_supply', default_priority: 'medium', default_sla_hours: 72 },
  { category_name: 'Power Outage', department_category: 'electricity', default_priority: 'high', default_sla_hours: 24 },
  { category_name: 'Streetlight Not Working', department_category: 'electricity', default_priority: 'low', default_sla_hours: 120 },
  { category_name: 'Pothole / Road Damage', department_category: 'road_transport', default_priority: 'medium', default_sla_hours: 168 },
  { category_name: 'Garbage Not Collected', department_category: 'sanitation', default_priority: 'medium', default_sla_hours: 48 },
  { category_name: 'Public Bin Overflow', department_category: 'sanitation', default_priority: 'low', default_sla_hours: 72 },
  { category_name: 'Health Post Service Issue', department_category: 'health', default_priority: 'high', default_sla_hours: 48 },
  { category_name: 'School Infrastructure Issue', department_category: 'education', default_priority: 'medium', default_sla_hours: 168 },
  { category_name: 'Land Revenue / Tax Query', department_category: 'revenue_tax', default_priority: 'low', default_sla_hours: 120 },
  { category_name: 'Disaster Relief Request', department_category: 'disaster_management', default_priority: 'urgent', default_sla_hours: 12 },
  { category_name: 'General Administrative Request', department_category: 'administration', default_priority: 'medium', default_sla_hours: 96 }
];

async function seed() {
  console.log("Seeding complaint categories...");
  for (const cat of categories) {
    const { data, error } = await supabase.from('complaint_categories').insert([cat]);
    if (error) {
      console.error(`Error inserting ${cat.category_name}:`, error.message);
    } else {
      console.log(`Inserted ${cat.category_name}`);
    }
  }
  console.log("Done seeding.");
}

seed();
