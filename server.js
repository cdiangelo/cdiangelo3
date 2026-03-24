const express = require('express');
const path = require('path');
const http = require('http');
const { initDb, getDb } = require('./db/init');
const { setupWebSocket } = require('./ws/handler');
const sessionsRouter = require('./routes/sessions');
const usersRouter = require('./routes/users');
const versionsRouter = require('./routes/versions');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));

// Health check for Render
app.get('/healthz', (req, res) => res.send('ok'));

// API routes
app.use('/api/sessions', sessionsRouter);
app.use('/api/sessions/:code/users', usersRouter);
app.use('/api/sessions/:code/versions', versionsRouter);

// Serve the app — must come AFTER API routes
const fs = require('fs');
const distDir = path.join(__dirname, 'dist');

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('/', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
} else {
  console.warn('WARNING: dist/ not found — run "npm run build" first');
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
}

// Catch-all: return 404 JSON for unknown API routes instead of HTML
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// JSON error handler for API routes — prevents Express from returning HTML errors
app.use('/api', (err, req, res, next) => {
  console.error('API error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Global error handler — catch anything else and return JSON if it was an API request
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (req.path.startsWith('/api')) {
    return res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
  res.status(500).send('Internal server error');
});

// Prevent crashes from unhandled errors — log and keep running
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (server still running):', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection (server still running):', reason);
});

// Initialize DB, then start server
initDb().then((db) => {
  setupWebSocket(server, db);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CompPlan running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
