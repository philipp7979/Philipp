// GET /api/whoop/login — kicks off the WHOOP OAuth flow (302 → whoop.com login).
const L = require('./_lib');

module.exports = (req, res) => {
  let id;
  try { id = L.creds().id; }
  catch (e) {
    res.statusCode = 500;
    res.setHeader('content-type', 'text/html');
    res.end('<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;max-width:34rem;margin:4rem auto;line-height:1.5;color:#222">'
      + '<h2>WHOOP not configured</h2><p>Set WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET in Vercel env vars.</p></body>');
    return;
  }

  const state = L.crypto.randomBytes(12).toString('hex');
  // Scope must use %20 (not +) — WHOOP treats + literally in URL query params
  const scope = L.SCOPE.replace(/ /g, '%20');
  const redirectUri = L.redirectUri(req);
  const authUrl = L.AUTH_URL
    + '?response_type=code'
    + '&client_id=' + encodeURIComponent(id)
    + '&redirect_uri=' + encodeURIComponent(redirectUri)
    + '&scope=' + scope
    + '&state=' + state;

  // ?debug=1 — shows exact params before redirecting (diagnose request_forbidden)
  const origin = L.getOrigin(req);
  if (new URL(req.url, origin).searchParams.get('debug') === '1') {
    res.statusCode = 200;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><html><head><meta charset="utf-8"><title>WHOOP Debug</title>
<style>body{font-family:system-ui;background:#0C0C12;color:#F3F2F8;padding:2rem}
table{border-collapse:collapse;width:100%;max-width:700px;margin:1.5rem 0}
td{padding:8px 12px;border:1px solid #2a2a3a;word-break:break-all;font-size:13px}
td:first-child{white-space:nowrap;color:#8B7CFF;width:140px}
pre{background:#1a1a28;padding:1rem;border-radius:8px;word-break:break-all;white-space:pre-wrap;font-size:12px;max-width:700px}
a.btn{display:inline-block;margin-top:1.5rem;padding:.8rem 1.6rem;background:#8B7CFF;color:#fff;font-weight:700;border-radius:8px;text-decoration:none}</style>
</head><body>
<h2 style="margin:0 0 .5rem">WHOOP Auth URL Preview</h2>
<p style="color:#aaa;margin:0 0 1.5rem">Compare these values with your WHOOP developer portal, then click Proceed.</p>
<table>
<tr><td>client_id</td><td>${id}</td></tr>
<tr><td>redirect_uri</td><td>${redirectUri}</td></tr>
<tr><td>scope</td><td>${L.SCOPE}</td></tr>
<tr><td>state</td><td>${state}</td></tr>
</table>
<p style="color:#aaa;font-size:13px;margin:.5rem 0">Full auth URL:</p>
<pre>${authUrl.replace(/&/g, '\n&')}</pre>
<a class="btn" href="${authUrl}">Proceed to WHOOP →</a>
</body></html>`);
    return;
  }

  res.setHeader('Set-Cookie', L.cookie('whoop_state', state, { maxAge: 600, secure: L.isHttps(req) }));
  res.statusCode = 302;
  res.setHeader('Location', authUrl);
  res.end();
};
