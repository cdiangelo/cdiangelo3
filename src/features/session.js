// ── SESSION & PERSISTENCE ──
// Extracted from index.html lines 3911–4271

let persistenceMode = 'template'; // 'template' or 'session'
let sessionContext = null; // {code, sessionId, userId, userName, userColor, versionId, versionName}
let ws = null; // WebSocket connection

// Expose on window so other modules can access
window.persistenceMode = persistenceMode;
window.sessionContext = sessionContext;

// Keep window in sync via getters/setters
Object.defineProperty(window, 'persistenceMode', {
  get() { return persistenceMode; },
  set(v) { persistenceMode = v; },
  configurable: true
});
Object.defineProperty(window, 'sessionContext', {
  get() { return sessionContext; },
  set(v) { sessionContext = v; },
  configurable: true
});

// Debounce utility
function debounce(fn, ms) { let t; return function(...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms) } }

// Auto-save indicator
let lastSaveTime = null;
function formatSaveTime(d) {
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + ' ' + ampm;
}
function updateLastSaveDisplay() {
  const el = document.getElementById('lastSaveTime');
  if (el && lastSaveTime) el.textContent = 'Saved ' + formatSaveTime(lastSaveTime);
}
function updateSaveIndicator(status) {
  const el = document.getElementById('saveIndicator');
  if (!el) return;
  if (persistenceMode === 'template') { el.style.display = 'none'; return }
  el.style.display = 'inline';
  el.className = 'save-indicator ' + status;
  el.textContent = status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : status === 'error' ? 'Save error' : '';
  if (status === 'saved') setTimeout(() => { if (el.textContent === 'Saved') el.style.display = 'none' }, 3000);
}

// Server save (debounced)
const debouncedServerSave = debounce(async () => {
  if (!sessionContext || !sessionContext.versionId) return;
  updateSaveIndicator('saving');
  try {
    const resp = await fetch(`/api/sessions/${sessionContext.code}/versions/${sessionContext.versionId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stateData: JSON.stringify(window.state) })
    });
    if (!resp.ok) throw new Error('Save failed');
    lastSaveTime = new Date();
    updateSaveIndicator('saved');
    updateLastSaveDisplay();
  } catch (e) { updateSaveIndicator('error'); console.error('Auto-save error:', e) }
}, 300);

// WebSocket client
function connectWebSocket() {
  if (!sessionContext) return;
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}`);
  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'auth', sessionId: sessionContext.sessionId, userId: sessionContext.userId,
      userName: sessionContext.userName, userColor: sessionContext.userColor, versionId: sessionContext.versionId }));
    // Ping every 20s
    ws._pingInterval = setInterval(() => { if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'ping' })) }, 20000);
  };
  ws.onmessage = (event) => {
    let msg; try { msg = JSON.parse(event.data) } catch { return }
    if (msg.type === 'state_sync' && msg.fromUserId !== sessionContext.userId) {
      applyRemoteState(msg.stateData, msg.fromUserName);
    } else if (msg.type === 'presence') {
      updatePresenceIndicators(msg.users);
    }
  };
  ws.onclose = () => {
    if (ws._pingInterval) clearInterval(ws._pingInterval);
    if (sessionContext) setTimeout(connectWebSocket, 2000); // auto-reconnect
  };
  ws.onerror = () => {};
}
function disconnectWebSocket() {
  const old = ws; ws = null;
  if (old) { if (old._pingInterval) clearInterval(old._pingInterval); old.close() }
}
function broadcastStateChange() {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'state_update', stateData: JSON.stringify(window.state), timestamp: Date.now() }));
  }
}
function applyRemoteState(stateJson, fromName) {
  const activeEl = document.activeElement; const activeId = activeEl ? activeEl.id : null;
  window.state = JSON.parse(stateJson); window.ensureStateFields();
  if (typeof window.renderAll === 'function') window.renderAll();
  if (activeId) { const el = document.getElementById(activeId); if (el) el.focus() }
  showToast(fromName ? `Updated by ${fromName}` : 'Session updated');
}
function showToast(msg) {
  let t = document.getElementById('sessionToast');
  if (!t) {
    t = document.createElement('div'); t.id = 'sessionToast';
    t.style.cssText = 'position:fixed;bottom:20px;right:20px;background:var(--accent);color:#fff;padding:8px 16px;border-radius:8px;font-size:.82rem;z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none';
    document.body.appendChild(t)
  }
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(t._timer); t._timer = setTimeout(() => { t.style.opacity = '0' }, 2500);
}
function updatePresenceIndicators(users) {
  const stbUsers = document.getElementById('stbUsers');
  if (!stbUsers || !sessionContext) return;
  const usersHtml = '<span style="color:var(--text-dim);margin-right:4px">Online:</span>' +
    users.map(u => {
      const isMe = u.id === sessionContext.userId;
      const onDiffVersion = u.versionId !== sessionContext.versionId;
      const cls = onDiffVersion ? 'presence-dot muted' : 'presence-dot';
      const suffix = onDiffVersion ? ` (${u.versionName || 'other version'})` : '';
      return `<span class="${cls}" style="--dot-color:${u.color}"><span style="background:${u.color};width:7px;height:7px;border-radius:50%;display:inline-block"></span>${u.name}${isMe ? ' (you)' : ''}${suffix}</span>`;
    }).join('');
  stbUsers.innerHTML = usersHtml;
}

// Session modal logic
function openSessionModal() {
  const m = document.getElementById('sessionModal');
  m.classList.add('show');
  // Reset to step 1
  m.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('sessionStep1').classList.add('active');
  document.getElementById('sessionCodeInput').value = '';
  document.getElementById('sessionError1').style.display = 'none';
  setTimeout(() => document.getElementById('sessionCodeInput').focus(), 100);
}
function closeSessionModal() { document.getElementById('sessionModal').classList.remove('show') }

// Session modal event wiring (runs after DOM ready, called from init)
function initSessionModal() {
  document.getElementById('sessionModalClose').addEventListener('click', closeSessionModal);
  document.getElementById('sessionModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeSessionModal() });

  // Step 1: Join by code
  document.getElementById('btnJoinCode').addEventListener('click', async () => {
    const code = document.getElementById('sessionCodeInput').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const errEl = document.getElementById('sessionError1');
    if (code.length < 3) { errEl.textContent = 'Please enter a valid session code.'; errEl.style.display = 'block'; return }
    try {
      const resp = await fetch(`/api/sessions/${code}`);
      if (!resp.ok) { errEl.textContent = 'Session not found. Check your code.'; errEl.style.display = 'block'; return }
      const session = await resp.json();
      sessionContext = { code: session.code, sessionId: session.id, sessionName: session.name };
      document.getElementById('sessionNameTitle').textContent = session.name || 'Session ' + session.code;
      document.getElementById('sessionModal').querySelectorAll('.step').forEach(s => s.classList.remove('active'));
      document.getElementById('sessionStep2').classList.add('active');
      setTimeout(() => document.getElementById('sessionDisplayName').focus(), 100);
    } catch (e) { errEl.textContent = 'Connection error. Try again.'; errEl.style.display = 'block' }
  });
  document.getElementById('sessionCodeInput').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btnJoinCode').click() });

  // Step 2: Enter display name
  document.getElementById('btnJoinProfile').addEventListener('click', async () => {
    const name = document.getElementById('sessionDisplayName').value.trim();
    const errEl = document.getElementById('sessionError2');
    if (!name) { errEl.textContent = 'Please enter your name.'; errEl.style.display = 'block'; return }
    try {
      const resp = await fetch(`/api/sessions/${sessionContext.code}/users`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name })
      });
      if (!resp.ok) { const d = await resp.json(); errEl.textContent = d.error || 'Error'; errEl.style.display = 'block'; return }
      const user = await resp.json();
      sessionContext.userId = user.id; sessionContext.userName = user.displayName; sessionContext.userColor = user.color;
      loadUserColorScheme();
      closeSessionModal();
      // Immediately clear template state so stale data never shows during async load
      window.state = { employees: [], projects: [], vendorRows: [], teRows: [], forecastAssumptions: { toggles: {}, attrition: [], hires: [], merit: [], market: [], ai: [], capitalization: [] }, allocOverrides: {} };
      window.ensureStateFields(); window.renderAll();
      try { await enterSession() } catch (re) { console.error('Session enter error:', re) }
    } catch (e) { errEl.textContent = 'Connection error. Try again.'; errEl.style.display = 'block' }
  });
  document.getElementById('sessionDisplayName').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btnJoinProfile').click() });
  document.getElementById('btnBackToStep1').addEventListener('click', () => {
    document.getElementById('sessionModal').querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById('sessionStep1').classList.add('active');
  });

  // Admin password show/hide toggle
  document.getElementById('toggleAdminPw').addEventListener('click', () => {
    const inp = document.getElementById('adminPassword');
    const btn = document.getElementById('toggleAdminPw');
    if (inp.type === 'password') { inp.type = 'text'; btn.textContent = 'Hide' } else { inp.type = 'password'; btn.textContent = 'Show' }
  });

  // Admin: Create session
  document.getElementById('adminCreateLink').addEventListener('click', () => {
    document.getElementById('sessionModal').querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById('sessionStepAdmin').classList.add('active');
    document.getElementById('sessionErrorAdmin').style.display = 'none';
    setTimeout(() => document.getElementById('adminSessionName').focus(), 100);
  });
  document.getElementById('btnCreateSession').addEventListener('click', async () => {
    const code = (document.getElementById('adminSessionCode').value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const name = document.getElementById('adminSessionName').value.trim();
    const pw = document.getElementById('adminPassword').value;
    const errEl = document.getElementById('sessionErrorAdmin');
    if (!code || code.length < 3) { errEl.textContent = 'Session code is required (at least 3 characters).'; errEl.style.display = 'block'; return }
    if (!name) { errEl.textContent = 'Session name is required.'; errEl.style.display = 'block'; return }
    if (!pw) { errEl.textContent = 'Admin password is required.'; errEl.style.display = 'block'; return }
    try {
      const resp = await fetch('/api/sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name, adminPassword: pw })
      });
      const ct = resp.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const txt = await resp.text();
        console.error('Non-JSON response:', resp.status, txt.substring(0, 200));
        const hint = resp.status === 405 ? 'The server may need to be restarted. Try refreshing the page.' : 'Is the server running?';
        errEl.textContent = 'Server error (status ' + resp.status + '). ' + hint; errEl.style.display = 'block'; return;
      }
      if (!resp.ok) { const d = await resp.json(); errEl.textContent = d.error || 'Error'; errEl.style.display = 'block'; return }
      const session = await resp.json();
      document.getElementById('newSessionName').textContent = session.name + ' — ready to join';
      document.getElementById('newSessionName').style.display = 'block';
      // Store for potential join
      sessionContext = { code: session.code, sessionId: session.id, sessionName: session.name };
      document.getElementById('sessionModal').querySelectorAll('.step').forEach(s => s.classList.remove('active'));
      document.getElementById('sessionStepCode').classList.add('active');
    } catch (e) { console.error('Session create error:', e); errEl.textContent = 'Connection error: ' + e.message; errEl.style.display = 'block' }
  });
  ['adminSessionCode', 'adminSessionName', 'adminPassword'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btnCreateSession').click() });
  });
  document.getElementById('btnBackFromAdmin').addEventListener('click', () => {
    document.getElementById('sessionModal').querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById('sessionStep1').classList.add('active');
  });

  // After create: join or close
  document.getElementById('btnUseNewSession').addEventListener('click', () => {
    document.getElementById('sessionModal').querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById('sessionStep2').classList.add('active');
    document.getElementById('sessionNameTitle').textContent = sessionContext.sessionName || 'Session';
    setTimeout(() => document.getElementById('sessionDisplayName').focus(), 100);
  });
  document.getElementById('btnCloseAfterCreate').addEventListener('click', closeSessionModal);

  // Landing page inline join box
  const landingJoinBtn = document.getElementById('landingJoinBtn');
  const landingCodeInput = document.getElementById('landingCodeInput');
  if (landingJoinBtn && landingCodeInput) {
    async function handleLandingJoin() {
      const code = landingCodeInput.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const errEl = document.getElementById('landingCodeError');
      if (code.length < 3) { errEl.textContent = 'Enter a valid session code.'; errEl.style.display = 'block'; return }
      errEl.style.display = 'none';
      try {
        const resp = await fetch(`/api/sessions/${code}`);
        if (!resp.ok) { errEl.textContent = 'Session not found. Check your code.'; errEl.style.display = 'block'; return }
        const session = await resp.json();
        sessionContext = { code: session.code, sessionId: session.id, sessionName: session.name };
        // Go straight to the name step in the modal
        const m = document.getElementById('sessionModal');
        m.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
        document.getElementById('sessionStep2').classList.add('active');
        document.getElementById('sessionNameTitle').textContent = session.name || 'Session ' + session.code;
        m.classList.add('show');
        setTimeout(() => document.getElementById('sessionDisplayName').focus(), 100);
      } catch (e) { errEl.textContent = 'Connection error. Try again.'; errEl.style.display = 'block' }
    }
    landingJoinBtn.addEventListener('click', handleLandingJoin);
    landingCodeInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleLandingJoin() });
  }

  // URL query param support: ?session=LCM27
  const urlParams = new URLSearchParams(window.location.search);
  const urlCode = urlParams.get('session');
  if (urlCode && !sessionContext) {
    landingCodeInput.value = urlCode;
    setTimeout(() => { if (landingJoinBtn) landingJoinBtn.click() }, 300);
  }
}

// Enter session: load versions, connect WebSocket, switch to session mode
async function enterSession() {
  persistenceMode = 'session';
  // Load version list
  try {
    const resp = await fetch(`/api/sessions/${sessionContext.code}/versions`);
    if (resp.ok) {
      const versions = await resp.json();
      if (versions.length > 0) {
        // Load most recent version
        const v = versions[0];
        const vResp = await fetch(`/api/sessions/${sessionContext.code}/versions/${v.id}`);
        if (vResp.ok) {
          const vData = await vResp.json();
          sessionContext.versionId = v.id; sessionContext.versionName = v.name;
          window.state = JSON.parse(vData.state_data); window.ensureStateFields();
        }
      } else {
        // Create default version with current state
        const resp2 = await fetch(`/api/sessions/${sessionContext.code}/versions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Default', stateData: JSON.stringify(window.state), userId: sessionContext.userId })
        });
        if (resp2.ok) { const v = await resp2.json(); sessionContext.versionId = v.id; sessionContext.versionName = 'Default' }
      }
    }
  } catch (e) { console.error('Version load error:', e) }
  // Save to sessionStorage for refresh persistence
  localStorage.setItem('compPlanSession', JSON.stringify(sessionContext));
  // Update UI — always re-render even if version load had issues
  updateSessionUI();
  window.initDropdowns(); window.renderAll();
  try { connectWebSocket() } catch (e) { console.error('WebSocket error:', e) }
}

// Leave session
function leaveSession() {
  persistenceMode = 'template';
  disconnectWebSocket();
  sessionContext = null;
  localStorage.removeItem('compPlanSession');
  updateSessionUI();
  window.loadState(); window.initDropdowns(); window.renderAll();
}

// Update UI for current mode
function updateSessionUI() {
  const banner = document.getElementById('templateBanner');
  const indicator = document.getElementById('wsIndicator');
  const presenceBar = document.getElementById('presenceBar');
  const landingBox = document.getElementById('landingSessionBox');
  const topBar = document.getElementById('sessionTopBar');
  const stbSession = document.getElementById('stbSession');
  const stbUsers = document.getElementById('stbUsers');
  // Extra workspace indicators on landing, vendor, dep, revenue pages
  const extraWsIds = ['landingWsIndicator', 'vendorWsIndicator', 'depWsIndicator', 'revWsIndicator'];
  if (persistenceMode === 'session' && sessionContext) {
    banner.style.display = 'none';
    if (landingBox) landingBox.style.display = 'none';
    // Hide wsIndicator in session mode — everything is in top bar
    indicator.style.display = 'none';
    // Hide extra workspace indicators in session mode (top bar handles it)
    extraWsIds.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none' });
    // Populate the persistent top bar
    topBar.className = 'active';
    topBar.id = 'sessionTopBar';
    stbSession.innerHTML =
      `<span style="font-weight:600;color:var(--accent)">Session: ${sessionContext.sessionName || 'Active'}</span>` +
      `<span style="font-family:monospace;font-size:.72rem;color:var(--text-dim);background:var(--panel-inset);padding:1px 6px;border-radius:4px;border:1px solid var(--border-light)">${sessionContext.code || ''}</span>` +
      `<span style="font-size:.72rem;color:var(--text-dim);border-left:1px solid var(--border);padding-left:8px">v: <span class="ws-name" onclick="openWorkspaceModal()" title="Click to manage versions" style="color:var(--accent);font-weight:600;cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px">${sessionContext.versionName || 'Default'}</span></span>` +
      `<span class="save-indicator" id="saveIndicator" style="display:none"></span>` +
      `<span id="lastSaveTime" style="font-size:.68rem;color:var(--text-dim);margin-left:6px">${lastSaveTime ? 'Saved ' + formatSaveTime(lastSaveTime) : ''}</span>` +
      ` <span style="font-size:.75rem;color:var(--text-dim);border-left:1px solid var(--border);padding-left:8px">${sessionContext.userName}</span>` +
      ` <span style="cursor:pointer;font-size:.72rem;color:var(--danger);margin-left:4px" onclick="leaveSession()" title="Leave session">Leave</span>`;
    // Show initial user in top bar
    if (!stbUsers.innerHTML) {
      stbUsers.innerHTML = `<span style="color:var(--text-dim);margin-right:4px">Online:</span>` +
        `<span class="presence-dot"><span style="background:${sessionContext.userColor || 'var(--accent)'};width:7px;height:7px;border-radius:50%;display:inline-block"></span>${sessionContext.userName} (you)</span>`;
    }
    // Hide old presence bar in comp header
    presenceBar.className = 'presence-bar'; presenceBar.innerHTML = '';
    document.body.classList.add('session-active');
  } else {
    banner.style.display = 'flex';
    if (landingBox) landingBox.style.display = 'flex';
    indicator.style.display = '';
    const wsHtml = 'Workspace: <span class="ws-name" onclick="openWorkspaceModal()" title="Click to manage workspaces">' + window.currentWorkspaceName + '</span>';
    indicator.innerHTML = wsHtml + '<span class="save-indicator" id="saveIndicator" style="display:none"></span>';
    // Show workspace indicator on all module pages
    extraWsIds.forEach(id => { const el = document.getElementById(id); if (el) { el.style.display = ''; el.innerHTML = wsHtml } });
    // Hide top bar and old presence bar
    topBar.className = ''; topBar.id = 'sessionTopBar';
    stbSession.innerHTML = ''; stbUsers.innerHTML = '';
    presenceBar.className = 'presence-bar'; presenceBar.innerHTML = '';
    document.body.classList.remove('session-active');
  }
}

// loadUserColorScheme is defined in a later section of index.html (line ~7981)
// We reference it via window so other modules/inline code can provide it
function loadUserColorScheme() {
  if (typeof window.loadUserColorScheme_impl === 'function') {
    window.loadUserColorScheme_impl();
  }
}

// Assign to window for inline onclick handlers
window.openSessionModal = openSessionModal;
window.closeSessionModal = closeSessionModal;
window.leaveSession = leaveSession;
window.enterSession = enterSession;
window.showToast = showToast;
window.updateSessionUI = updateSessionUI;
window.debouncedServerSave = debouncedServerSave;
window.broadcastStateChange = broadcastStateChange;
window.initSessionModal = initSessionModal;
window.connectWebSocket = connectWebSocket;
Object.defineProperty(window,'ws',{get(){return ws},set(v){ws=v}});

export {
  initSessionModal,
  connectWebSocket,
  disconnectWebSocket,
  broadcastStateChange,
  debouncedServerSave,
  applyRemoteState,
  updateSessionUI,
  loadUserColorScheme,
  openSessionModal,
  closeSessionModal,
  leaveSession,
  enterSession,
  showToast,
  debounce,
  updateSaveIndicator,
  updateLastSaveDisplay,
  formatSaveTime
};
