require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) console.warn('Warning: JWT_SECRET is not set. Add it to your .env file before using authentication.');
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET || 'development-only-secret', { expiresIn: '7d' });
}
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), JWT_SECRET || 'development-only-secret'); } catch (_) { /* treat invalid token as guest */ }
  }
  next();
}
function requiredAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Please sign in first.' });
  try { req.user = jwt.verify(header.slice(7), JWT_SECRET || 'development-only-secret'); next(); }
  catch (_) { return res.status(401).json({ error: 'Session expired. Please sign in again.' }); }
}

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); }
  catch (err) { res.status(500).json({ status: 'error', error: 'Database connection failed.' }); }
});

app.post('/api/auth/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8)
    return res.status(400).json({ error: 'Enter a name, valid email and password with at least 8 characters.' });
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email', [name, email, passwordHash]);
    const user = result.rows[0]; res.status(201).json({ user, token: createToken(user) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' });
    console.error(err); res.status(500).json({ error: 'Could not create account.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  try {
    const result = await pool.query('SELECT id, name, email, password_hash FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
    delete user.password_hash; res.json({ user, token: createToken(user) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Could not sign in.' }); }
});

app.get('/api/destinations', async (_req, res) => {
  try { const result = await pool.query('SELECT id, name, country, category, description, estimated_budget FROM destinations ORDER BY name'); res.json(result.rows); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Could not load destinations.' }); }
});

app.post('/api/trips', optionalAuth, async (req, res) => {
  const destination = String(req.body.destination || '').trim();
  if (!destination) return res.status(400).json({ error: 'Please enter a destination.' });
  const { travel_dates = '', travellers = '2 travellers', travel_style = '', notes = '' } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO trips (user_id, destination, travel_dates, travellers, travel_style, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, destination, status, created_at',
      [req.user?.id || null, destination, String(travel_dates).slice(0,120), String(travellers).slice(0,40), String(travel_style).slice(0,80), String(notes).slice(0,3000)]
    );
    res.status(201).json({ message: 'Trip request saved.', trip: result.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Could not save your trip request.' }); }
});

app.get('/api/my-trips', requiredAuth, async (req, res) => {
  try { const result = await pool.query('SELECT id, destination, travel_dates, travellers, travel_style, notes, status, created_at FROM trips WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]); res.json(result.rows); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Could not load your trips.' }); }
});

app.post('/api/contact', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const message = String(req.body.message || '').trim();
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || message.length < 3)
    return res.status(400).json({ error: 'Please enter your name, a valid email and a message.' });
  try {
    await pool.query('INSERT INTO contact_messages (name, email, topic, destination, message) VALUES ($1, $2, $3, $4, $5)', [name, email, String(req.body.topic || '').slice(0,80), String(req.body.destination || '').slice(0,160), message.slice(0,5000)]);
    res.status(201).json({ message: 'Message saved.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Could not send your message.' }); }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`Crocket Travel is running at http://localhost:${PORT}`));
