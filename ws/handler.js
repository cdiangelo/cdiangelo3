const { WebSocketServer } = require('ws');

// rooms: Map<string, Set<ws>> where key = "sessionId:versionId"
const rooms = new Map();
// clients: Map<ws, {sessionId, userId, userName, userColor, versionId}>
const clients = new Map();

// Debounced DB saves per version
const savePending = new Map();

function setupWebSocket(server, db) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      switch (msg.type) {
        case 'auth':
          handleAuth(ws, msg, db);
          break;
        case 'state_update':
          handleStateUpdate(ws, msg, db);
          break;
        case 'switch_version':
          handleSwitchVersion(ws, msg, db);
          break;
        case 'ping':
          handlePing(ws, db);
          break;
        case 'cursor':
          handleCursor(ws, msg);
          break;
      }
    });

    ws.on('close', () => handleDisconnect(ws, db));
    ws.on('error', () => handleDisconnect(ws, db));
  });

  // Heartbeat: detect dead connections every 30s
  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        handleDisconnect(ws, db);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  return wss;
}

function handleAuth(ws, msg, db) {
  const { sessionId, userId, userName, userColor, versionId } = msg;
  if (!sessionId || !userId || !versionId) return;

  const clientInfo = { sessionId, userId, userName, userColor, versionId };
  clients.set(ws, clientInfo);

  // Join room
  const roomKey = `${sessionId}:${versionId}`;
  if (!rooms.has(roomKey)) rooms.set(roomKey, new Set());
  rooms.get(roomKey).add(ws);

  // Update presence in DB
  try {
    db.prepare(
      `INSERT OR REPLACE INTO presence (user_id, session_id, active_version_id, connected_at, last_ping)
       VALUES (?, ?, ?, datetime('now'), datetime('now'))`
    ).run(userId, sessionId, versionId);
  } catch (e) { /* ignore */ }

  // Broadcast presence to entire session
  broadcastPresence(sessionId, db);
}

function handleStateUpdate(ws, msg, db) {
  const client = clients.get(ws);
  if (!client) return;

  const { stateData, timestamp } = msg;
  if (!stateData) return;

  const roomKey = `${client.sessionId}:${client.versionId}`;
  const room = rooms.get(roomKey);
  if (!room) return;

  // Broadcast to all others in the same room
  const outMsg = JSON.stringify({
    type: 'state_sync',
    stateData,
    fromUserId: client.userId,
    fromUserName: client.userName,
    timestamp
  });

  room.forEach((peer) => {
    if (peer !== ws && peer.readyState === 1) {
      peer.send(outMsg);
    }
  });

  // Debounced save to DB (300ms)
  const saveKey = `${client.sessionId}:${client.versionId}`;
  if (savePending.has(saveKey)) clearTimeout(savePending.get(saveKey));
  savePending.set(saveKey, setTimeout(() => {
    savePending.delete(saveKey);
    try {
      db.prepare(
        "UPDATE versions SET state_data = ?, updated_at = datetime('now') WHERE id = ? AND session_id = ?"
      ).run(stateData, client.versionId, client.sessionId);
    } catch (e) { /* ignore */ }
  }, 300));
}

function handleSwitchVersion(ws, msg, db) {
  const client = clients.get(ws);
  if (!client) return;

  const { versionId } = msg;
  if (!versionId) return;

  // Leave old room
  const oldKey = `${client.sessionId}:${client.versionId}`;
  const oldRoom = rooms.get(oldKey);
  if (oldRoom) {
    oldRoom.delete(ws);
    if (oldRoom.size === 0) rooms.delete(oldKey);
  }

  // Update client info
  client.versionId = versionId;

  // Join new room
  const newKey = `${client.sessionId}:${versionId}`;
  if (!rooms.has(newKey)) rooms.set(newKey, new Set());
  rooms.get(newKey).add(ws);

  // Update presence
  try {
    db.prepare(
      "UPDATE presence SET active_version_id = ?, last_ping = datetime('now') WHERE user_id = ?"
    ).run(versionId, client.userId);
  } catch (e) { /* ignore */ }

  broadcastPresence(client.sessionId, db);
}

function handlePing(ws, db) {
  const client = clients.get(ws);
  if (!client) return;
  try {
    db.prepare("UPDATE presence SET last_ping = datetime('now') WHERE user_id = ?").run(client.userId);
  } catch (e) { /* ignore */ }
}

function handleCursor(ws, msg) {
  const client = clients.get(ws);
  if (!client) return;

  const roomKey = `${client.sessionId}:${client.versionId}`;
  const room = rooms.get(roomKey);
  if (!room) return;

  const outMsg = JSON.stringify({
    type: 'cursor',
    userId: client.userId,
    userName: client.userName,
    userColor: client.userColor,
    tabName: msg.tabName,
    fieldId: msg.fieldId
  });

  room.forEach((peer) => {
    if (peer !== ws && peer.readyState === 1) {
      peer.send(outMsg);
    }
  });
}

function handleDisconnect(ws, db) {
  const client = clients.get(ws);
  if (!client) return;

  // Leave room
  const roomKey = `${client.sessionId}:${client.versionId}`;
  const room = rooms.get(roomKey);
  if (room) {
    room.delete(ws);
    if (room.size === 0) rooms.delete(roomKey);
  }

  // Remove presence
  try {
    db.prepare('DELETE FROM presence WHERE user_id = ?').run(client.userId);
  } catch (e) { /* ignore */ }

  const sessionId = client.sessionId;
  clients.delete(ws);

  broadcastPresence(sessionId, db);
}

function broadcastPresence(sessionId, db) {
  // Get all online users for this session
  let users = [];
  try {
    users = db.prepare(
      `SELECT p.user_id as id, u.display_name as name, u.color, p.active_version_id as versionId,
              v.name as versionName
       FROM presence p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN versions v ON v.id = p.active_version_id
       WHERE p.session_id = ?`
    ).all(sessionId);
  } catch (e) { /* ignore */ }

  const outMsg = JSON.stringify({ type: 'presence', users });

  // Send to all clients in this session (any version)
  clients.forEach((info, ws) => {
    if (info.sessionId === sessionId && ws.readyState === 1) {
      ws.send(outMsg);
    }
  });
}

module.exports = { setupWebSocket };
