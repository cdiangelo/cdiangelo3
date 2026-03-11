const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Config ──
// In production, set these via environment variables
const PASSWORD_HASH = process.env.COMPPLAN_PW_HASH ||
  crypto.createHash('sha256').update('compmodelLCM_claude').digest('hex');
const SESSION_SECRET = process.env.SESSION_SECRET ||
  crypto.randomBytes(32).toString('hex');
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// ── Middleware ──
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'compplan.sid',
  cookie: {
    httpOnly: true,       // JS cannot read the cookie
    sameSite: 'strict',   // No cross-site requests
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    maxAge: SESSION_TIMEOUT
  }
}));

// ── Rate limiting (simple in-memory) ──
const loginAttempts = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, resetAt: now + 60000 };
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + 60000;
  }
  record.count++;
  loginAttempts.set(ip, record);
  return record.count <= 5; // 5 attempts per minute
}

// ── Auth check middleware ──
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    // Refresh session on activity
    req.session.touch();
    return next();
  }
  res.redirect('/login');
}

// ── Login page ──
const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CompPlan - Login</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#e8e8e8;--panel:#f5f5f0;--accent:#8b2020;--accent-light:#a83232;--secondary:#6b7a8d;--text:#2d2d2d;--text-dim:#5a5a5a;--border:#ccc;--danger:#b83030}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;align-items:center;justify-content:center}
.login-box{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:40px;text-align:center;max-width:380px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.1)}
.login-box h2{color:var(--accent);margin-bottom:6px;font-size:1.3rem}
.login-box h2 span{color:var(--secondary)}
.login-box p{color:var(--text-dim);font-size:.85rem;margin-bottom:20px}
input{background:#fff;border:1px solid var(--border);color:var(--text);padding:12px;border-radius:6px;font-size:1rem;width:100%;text-align:center;margin-bottom:12px}
input:focus{outline:none;border-color:var(--accent)}
button{width:100%;padding:12px;border-radius:6px;border:1px solid var(--accent);background:var(--accent);color:#fff;cursor:pointer;font-size:.95rem;transition:background .2s}
button:hover{background:var(--accent-light)}
.error{color:var(--danger);font-size:.82rem;margin-top:8px}
.lock-msg{color:var(--danger);font-size:.82rem;margin-top:8px}
</style>
</head>
<body>
<form class="login-box" method="POST" action="/login">
<h2>Comp<span>Plan</span></h2>
<p>This tool contains sensitive compensation data.<br>Enter the access password to continue.</p>
<input type="password" name="password" placeholder="Password" autofocus required>
<button type="submit">Unlock</button>
%%ERROR%%
</form>
</body>
</html>`;

// ── Routes ──
app.get('/login', (req, res) => {
  if (req.session && req.session.authenticated) return res.redirect('/');
  res.send(LOGIN_HTML.replace('%%ERROR%%', ''));
});

app.post('/login', (req, res) => {
  const ip = req.ip;
  if (!checkRateLimit(ip)) {
    return res.send(LOGIN_HTML.replace('%%ERROR%%',
      '<div class="lock-msg">Too many attempts. Wait 60 seconds.</div>'));
  }

  const input = req.body.password || '';
  const inputHash = crypto.createHash('sha256').update(input).digest('hex');

  if (inputHash === PASSWORD_HASH) {
    req.session.authenticated = true;
    req.session.authenticatedAt = Date.now();
    return res.redirect('/');
  }

  res.send(LOGIN_HTML.replace('%%ERROR%%',
    '<div class="error">Incorrect password. Try again.</div>'));
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ── Protected app ──
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'compensation-tool.html'));
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`CompPlan server running on http://localhost:${PORT}`);
  console.log(`Session timeout: ${SESSION_TIMEOUT / 60000} minutes`);
  console.log(`Rate limit: 5 login attempts per minute per IP`);
});
