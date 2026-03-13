const express = require('express');
const path = require('path');
const http = require('http');
const { getDb } = require('./db/init');
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

// Serve the app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize DB and WebSocket
const db = getDb();
setupWebSocket(server, db);

server.listen(PORT, () => {
  console.log(`CompPlan running on http://localhost:${PORT}`);
});
