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
        case 'tab':
          handleTab(ws, msg, db);
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

async function handleAuth(ws, msg, db) {
  // Support both session-based and plan-file-based auth
  const sessionId = msg.sessionId || (msg.planFileId ? 'plan:'+msg.planFileId : null);
  const userId = msg.userId || msg.accountId;
  const userName = msg.userName || msg.initials || 'User';
  const userColor = msg.userColor || msg.color || '#3a7d44';
  const versionId = msg.versionId || (msg.planFileId ? 'main' : null);
  if (!sessionId || !userId || !versionId) return;

  const clientInfo = { sessionId, userId, userName, userColor, versionId, isPlan:!!msg.planFileId };
  clients.set(ws, clientInfo);

  // Join room
  const roomKey = `${sessionId}:${versionId}`;
  if (!rooms.has(roomKey)) rooms.set(roomKey, new Set());
  rooms.get(roomKey).add(ws);

  // Update presence in DB (skip for plan-file connections — they use in-memory presence)
  if (!clientInfo.isPlan) {
    try {
      await db.prepare(
        `INSERT INTO presence (user_id, session_id, active_version_id, connected_at, last_ping)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET
           session_id = EXCLUDED.session_id,
           active_version_id = EXCLUDED.active_version_id,
           connected_at = CURRENT_TIMESTAMP,
           last_ping = CURRENT_TIMESTAMP
         RETURNING user_id`
      ).run(userId, sessionId, versionId);
    } catch (e) { console.error('WS DB error:', e.message) }
  }

  // Broadcast presence to entire session
  await broadcastPresence(sessionId, db);
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
    fromAccountId: client.userId, // plan-file compat
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
  savePending.set(saveKey, setTimeout(async () => {
    savePending.delete(saveKey);
    try {
      if (client.isPlan) {
        // Plan file — save to plan_files table
        const planId = client.sessionId.replace('plan:', '');
        await db.prepare(
          "UPDATE plan_files SET state_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(stateData, parseInt(planId));
      } else {
        // Session — save to versions table
        await db.prepare(
          "UPDATE versions SET state_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND session_id = ?"
        ).run(stateData, client.versionId, client.sessionId);
      }
    } catch (e) { console.error('WS DB error:', e.message) }
  }, 300));
}

async function handleSwitchVersion(ws, msg, db) {
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
    await db.prepare(
      "UPDATE presence SET active_version_id = ?, last_ping = CURRENT_TIMESTAMP WHERE user_id = ?"
    ).run(versionId, client.userId);
  } catch (e) { console.error('WS DB error:', e.message) }

  await broadcastPresence(client.sessionId, db);
}

async function handlePing(ws, db) {
  const client = clients.get(ws);
  if (!client) return;
  try {
    await db.prepare("UPDATE presence SET last_ping = CURRENT_TIMESTAMP WHERE user_id = ?").run(client.userId);
  } catch (e) { console.error('WS DB error:', e.message) }
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
    fromAccountId: client.userId,
    initials: client.userName,
    color: client.userColor,
    cellId: msg.cellId,
    tabName: msg.tabName,
    fieldId: msg.fieldId
  });

  room.forEach((peer) => {
    if (peer !== ws && peer.readyState === 1) {
      peer.send(outMsg);
    }
  });
}

async function handleTab(ws, msg, db) {
  const client = clients.get(ws);
  if (!client) return;
  client.tab = msg.tab || '';
  await broadcastPresence(client.sessionId, db);
}

async function handleDisconnect(ws, db) {
  const client = clients.get(ws);
  if (!client) return;

  // Leave room
  const roomKey = `${client.sessionId}:${client.versionId}`;
  const room = rooms.get(roomKey);
  if (room) {
    room.delete(ws);
    if (room.size === 0) rooms.delete(roomKey);
  }

  // Remove presence (skip for plan-file connections — they use in-memory presence)
  if (!client.isPlan) {
    try {
      await db.prepare('DELETE FROM presence WHERE user_id = ?').run(client.userId);
    } catch (e) { console.error('WS DB error:', e.message) }
  }

  const sessionId = client.sessionId;
  clients.delete(ws);

  await broadcastPresence(sessionId, db);
}

async function broadcastPresence(sessionId, db) {
  // For plan-file connections, build presence from in-memory clients
  if (sessionId.startsWith('plan:')) {
    const users = [];
    clients.forEach((info) => {
      if (info.sessionId === sessionId) {
        users.push({ id: info.userId, initials: info.userName, color: info.userColor, tab: info.tab || '' });
      }
    });
    const outMsg = JSON.stringify({ type: 'presence', users });
    clients.forEach((info, ws) => {
      if (info.sessionId === sessionId && ws.readyState === 1) {
        ws.send(outMsg);
      }
    });
    return;
  }

  // Session-based presence (original)
  let users = [];
  try {
    users = await db.prepare(
      `SELECT p.user_id as id, u.display_name as name, u.color, p.active_version_id as "versionId",
              v.name as "versionName"
       FROM presence p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN versions v ON v.id = p.active_version_id
       WHERE p.session_id = ?`
    ).all(sessionId);
  } catch (e) { console.error('WS DB error:', e.message) }

  const outMsg = JSON.stringify({ type: 'presence', users });
  clients.forEach((info, ws) => {
    if (info.sessionId === sessionId && ws.readyState === 1) {
      ws.send(outMsg);
    }
  });
}

module.exports = { setupWebSocket };
