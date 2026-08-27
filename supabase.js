const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

const propertyFromRow = (row) => ({
  id: row.id,
  title: row.title,
  type: row.type,
  location: row.location,
  price: Number(row.price),
  image: row.image,
  images: row.images || [],
  videos: row.videos || [],
  description: row.description,
  status: row.status || 'active',
  interest: row.interest || 0,
  qualifiedLeads: row.qualified_leads || 0,
  createdAt: row.created_at
});

async function listProperties() {
  const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(propertyFromRow);
}

async function createProperty(property) {
  const { data, error } = await supabase.from('properties').insert({
    id: property.id,
    title: property.title,
    type: property.type,
    location: property.location,
    price: property.price,
    image: property.image,
    images: property.images,
    videos: property.videos,
    description: property.description,
    status: property.status || 'active',
    interest: property.interest || 0,
    qualified_leads: property.qualifiedLeads || 0,
    created_at: property.createdAt
  }).select().single();
  if (error) throw error;
  return propertyFromRow(data);
}

async function deleteProperty(id) {
  const { data, error } = await supabase.from('properties').delete().eq('id', id).select().single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return propertyFromRow(data);
}

async function findUser(email) {
  const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
  if (error) throw error;
  return data;
}

async function createUser(user) {
  const { data, error } = await supabase.from('users').insert({
    id: user.id,
    name: user.name,
    email: user.email,
    password_hash: user.passwordHash,
    role: user.role,
    created_at: user.createdAt
  }).select().single();
  if (error) throw error;
  return data;
}

module.exports = { enabled: Boolean(supabase), listProperties, createProperty, deleteProperty, findUser, createUser };
