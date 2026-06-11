// GET /api/whoop/login — starts standard WHOOP OAuth (authorization code + client secret).
const L = require('./_lib');

module.exports = (req, res) => {
  let id;
  try { id = L.creds().id; }
  catch (e) {
    res.statusCode = 500;
    res.setHeader('content-type', 'text/html');
    res.end('<h2>WHOOP not configured</h2><p>Set WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET in Vercel env vars.</p><a href="/">← back</a>');
    return;
  }

  // WHOOP requires a state param and rejects + encoding for spaces
  const state = L.crypto.randomBytes(12).toString('hex');
  const qs = [
    'response_type=code',
    'client_id=' + encodeURIComponent(id),
    'redirect_uri=' + encodeURIComponent(L.redirectUri()),
    'scope=' + L.SCOPE.replace(/ /g, '%20'),
    'state=' + state,
  ].join('&');

  const authUrl = L.AUTH_URL + '?' + qs;

  // ?debug=1 shows the exact URL before redirecting (for diagnosing request_forbidden)
  const origin = L.getOrigin(req);
  const reqUrl = new URL(req.url, origin);
  if (reqUrl.searchParams.get('debug') === '1') {
    res.statusCode = 200;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><html><head><meta charset="utf-8"><title>WHOOP Login Debug</title>
<style>body{font-family:system-ui;background:#0C0C12;color:#F3F2F8;padding:2rem}pre{background:#1a1a28;padding:1rem;border-radius:8px;word-break:break-all;white-space:pre-wrap;font-size:12px}a.btn{display:inline-block;margin-top:1rem;padding:.7rem 1.4rem;background:#8B7CFF;color:#130E2E;font-weight:700;border-radius:8px;text-decoration:none}</style>
</head><body>
<h2>WHOOP Auth URL Debug</h2>
<p>client_id in use: <code>${id}</code></p>
<p>redirect_uri being sent: <code>${L.redirectUri()}</code></p>
<p>scope being sent: <code>${L.SCOPE}</code></p>
<p>Full auth URL:</p>
<pre>${authUrl.replace(/&/g, '\n&')}</pre>
<a class="btn" href="${authUrl}">Proceed to WHOOP →</a>
</body></html>`);
    return;
  }

  res.statusCode = 302;
  res.setHeader('Location', authUrl);
  res.end();
};
