const express = require('express');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const supabase = require('./supabase');

const app = express();
const isVercel = process.env.VERCEL === '1';
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const dataDir = isVercel ? path.join('/tmp', 'savley-data') : path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'store.json');
const uploadDir = isVercel ? path.join('/tmp', 'savley-uploads') : path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

const seed = {
  users: [],
  properties: [
    { id: crypto.randomUUID(), title: 'Oceanfront Modern Residence', price: 185000000, image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85', description: 'A light-filled contemporary home with generous entertaining spaces and panoramic water views.', createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), title: 'The Meridian Executive Villa', price: 260000000, image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=85', description: 'Private compound living with five bedrooms, landscaped gardens, and a resort-style pool.', createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), title: 'Quiet Garden Townhouse', price: 98000000, image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85', description: 'An elegant, low-maintenance townhouse in a peaceful and connected neighborhood.', createdAt: new Date().toISOString() }
  ]
};
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify(seed, null, 2));
const readStore = () => JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const writeStore = (store) => fs.writeFileSync(dataFile, JSON.stringify(store, null, 2));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
const upload = multer({ dest: uploadDir, limits: { fileSize: 50 * 1024 * 1024, files: 16 }, fileFilter: (_, file, cb) => cb(null, /^(image|video)\//.test(file.mimetype)) });

function tokenFor(user) { return jwt.sign({ id: user.id, email: user.email, role: user.role || 'user', name: user.name }, JWT_SECRET, { expiresIn: '2h' }); }
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  try { req.user = jwt.verify(token, JWT_SECRET); next(); } catch { res.status(401).json({ error: 'Please log in to continue.' }); }
}
function adminOnly(req, res, next) { if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' }); next(); }
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

app.get('/api/properties', asyncRoute(async (_, res) => {
  res.json(supabase.enabled ? await supabase.listProperties() : readStore().properties);
}));
app.post('/api/auth/signup', asyncRoute(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password || password.length < 8) return res.status(400).json({ error: 'Name, email, and a password of 8+ characters are required.' });
  const normalized = email.trim().toLowerCase();
  const existingUser = supabase.enabled ? await supabase.findUser(normalized) : readStore().users.find((user) => user.email === normalized);
  if ((ADMIN_EMAIL && normalized === ADMIN_EMAIL) || existingUser) return res.status(409).json({ error: 'An account with this email already exists.' });
  const user = { id: crypto.randomUUID(), name: name.trim(), email: normalized, passwordHash: await bcrypt.hash(password, 12), role: 'user', createdAt: new Date().toISOString() };
  if (supabase.enabled) await supabase.createUser(user);
  else { const store = readStore(); store.users.push(user); writeStore(store); }
  res.status(201).json({ token: tokenFor(user), user: { name: user.name, email: user.email, role: user.role } });
}));
app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;
  if (ADMIN_EMAIL && ADMIN_PASSWORD && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) return res.json({ token: tokenFor({ id: 'admin', email: ADMIN_EMAIL, name: 'Savley Admin', role: 'admin' }), user: { name: 'Savley Admin', email: ADMIN_EMAIL, role: 'admin' } });
  const user = supabase.enabled ? await supabase.findUser(email) : readStore().users.find((candidate) => candidate.email === email);
  if (user && supabase.enabled) user.passwordHash = user.password_hash;
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
  res.json({ token: tokenFor(user), user: { name: user.name, email: user.email, role: user.role } });
}));
app.post('/api/properties', auth, adminOnly, upload.fields([{ name: 'imageFiles', maxCount: 12 }, { name: 'videoFiles', maxCount: 4 }]), (req, res) => {
  const { title, price, description, imageUrl, type, location } = req.body;
  const numericPrice = Number(price);
  const images = (req.files?.imageFiles || []).map((file) => `/uploads/${file.filename}`);
  const videos = (req.files?.videoFiles || []).map((file) => `/uploads/${file.filename}`);
  if (!title?.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0 || !description?.trim() || !['house', 'land'].includes(type) || !location?.trim()) return res.status(400).json({ error: 'Title, type, location, valid price, and description are required.' });
  const fallbackImage = imageUrl?.trim() || 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85';
  const property = { id: crypto.randomUUID(), title: title.trim(), type, location: location.trim(), price: numericPrice, image: images[0] || fallbackImage, images: images.length ? images : [fallbackImage], videos, description: description.trim(), createdAt: new Date().toISOString() };
  if (supabase.enabled) return supabase.createProperty(property).then((created) => res.status(201).json(created));
  const store = readStore(); store.properties.unshift(property); writeStore(store);
  res.status(201).json(property);
});
app.delete('/api/properties/:id', auth, adminOnly, asyncRoute(async (req, res) => {
  if (supabase.enabled) {
    const property = await supabase.deleteProperty(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found.' });
    return res.json({ property });
  }
  const store = readStore();
  const propertyIndex = store.properties.findIndex((property) => property.id === req.params.id);
  if (propertyIndex === -1) return res.status(404).json({ error: 'Property not found.' });
  const [property] = store.properties.splice(propertyIndex, 1);
  writeStore(store);
  res.json({ property });
}));
app.get('/admin', (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/admin.html', (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((error, _, res, next) => { console.error(error); if (res.headersSent) return next(error); res.status(500).json({ error: 'Something went wrong on the server.' }); });
if (!isVercel) app.listen(PORT, () => console.log(`Savley Global Property running at http://localhost:${PORT}`));
module.exports = app;
