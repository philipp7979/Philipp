// GET /api/whoop/login-debug — shows the auth URL instead of redirecting
const L = require('./_lib');
const crypto = require('crypto');

module.exports = (req, res) => {
  let id, credErr = null;
  try { ({ id } = L.creds()); } catch (e) { credErr = e.message; }

  const state = crypto.randomBytes(12).toString('hex');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: id || '(not set)',
    redirect_uri: L.redirectUri(),
    scope: L.SCOPE,
    state,
  });
  const authUrl = L.AUTH_URL + '?' + params.toString();

  res.statusCode = 200;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><meta charset="utf-8">
<body style="font-family:monospace;padding:2rem;background:#111;color:#eee;word-break:break-all">
<h2>WHOOP Login Debug</h2>
<p><b>creds_ok:</b> ${!credErr} ${credErr||''}</p>
<p><b>client_id:</b> ${id||'(not set)'}</p>
<p><b>redirect_uri:</b> ${L.redirectUri()}</p>
<p><b>scope:</b> ${L.SCOPE}</p>
<p><b>Full auth URL:</b><br>${authUrl}</p>
<p><a href="${authUrl}" style="color:#4FC3F7">→ Click to attempt login with this URL</a></p>
</body>`);
};
