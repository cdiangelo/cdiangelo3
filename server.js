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

// API routes
app.use('/api/sessions', sessionsRouter);
app.use('/api/sessions/:code/users', usersRouter);
app.use('/api/sessions/:code/versions', versionsRouter);

// Serve the app — must come AFTER API routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Catch-all: return 404 JSON for unknown API routes instead of HTML
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize DB, then start server
initDb().then((db) => {
  setupWebSocket(server, db);
  server.listen(PORT, () => {
    console.log(`CompPlan running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
