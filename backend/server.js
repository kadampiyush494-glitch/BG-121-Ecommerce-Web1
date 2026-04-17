require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve static frontend files from project root
app.use(express.static(path.join(__dirname, '..')));

// ─── API Routes ──────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/promotions', require('./routes/promotions'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/stats', require('./routes/stats'));

// ─── Health Check ────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ForgeAdmin Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── Catch-all: serve frontend pages ─────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ─── 404 for unknown API routes ──────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `API endpoint '${req.originalUrl}' does not exist.`,
    available_endpoints: [
      'POST   /api/auth/signup',
      'POST   /api/auth/login',
      'GET    /api/auth/me',
      'GET    /api/users',
      'GET    /api/categories',
      'GET    /api/products',
      'GET    /api/customers',
      'GET    /api/orders',
      'GET    /api/reviews',
      'GET    /api/promotions',
      'GET    /api/inventory',
      'GET    /api/stats',
    ],
  });
});

// ─── Global Error Handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred. Please try again later.',
  });
});

// ─── Start Server ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🔥 ForgeAdmin Backend running at http://localhost:${PORT}`);
  console.log(`📡 API Base: http://localhost:${PORT}/api`);
  console.log(`🌐 Frontend: http://localhost:${PORT}\n`);
});
