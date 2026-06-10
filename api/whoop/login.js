// GET /api/whoop/login — kicks off the WHOOP OAuth flow (302 → whoop.com login).
const L = require('./_lib');

module.exports = (req, res) => {
  let id;
  try { id = L.creds().id; }
  catch (e) {
    res.statusCode = 500;
    res.setHeader('content-type', 'text/html');
    res.end('<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;max-width:34rem;margin:4rem auto;line-height:1.5;color:#222">'
      + '<h2>WHOOP isn’t configured yet</h2><p>Set <code>WHOOP_CLIENT_ID</code> and <code>WHOOP_CLIENT_SECRET</code> in your Vercel project’s Environment Variables, and register <code>' + L.redirectUri(req) + '</code> as a redirect URL in your WHOOP developer app. See <code>WHOOP_SETUP.md</code>.</p><p><a href="/">← back to the dashboard</a></p></body>');
    return;
  }
  const state = L.crypto.randomBytes(12).toString('hex');
  const secure = L.isHttps(req);
  res.setHeader('Set-Cookie', L.cookie('whoop_state', state, { maxAge: 600, secure }));

  // Build URL manually with %20 scope encoding (WHOOP rejects + encoding)
  const qs = [
    'response_type=code',
    'client_id=' + encodeURIComponent(id),
    'redirect_uri=' + encodeURIComponent(L.redirectUri(req)),
    'scope=' + L.SCOPE.replace(/ /g, '%20'),
    'state=' + state,
  ].join('&');
  const authUrl = L.AUTH_URL + '?' + qs;

  // Build a minimal test URL (just offline + read:recovery) to isolate scope issues
  const minScope = 'offline%20read:recovery';
  const minQs = [
    'response_type=code',
    'client_id=' + encodeURIComponent(id),
    'redirect_uri=' + encodeURIComponent(L.redirectUri(req)),
    'scope=' + minScope,
    'state=' + state,
  ].join('&');
  const minUrl = L.AUTH_URL + '?' + minQs;

  // DEBUG — show both URLs so we can test which scope works
  res.statusCode = 200;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><meta charset="utf-8">
<body style="font-family:monospace;padding:2rem;background:#111;color:#eee;word-break:break-all">
<h2>WHOOP Auth Debug</h2>
<p style="color:#f90;font-weight:bold">Try LINK 1 first. If it shows WHOOP login = offline scope required. If still errors, try LINK 2.</p>
<p><b>LINK 1 — full scope + offline:</b><br><a href="${authUrl}" style="color:#6cf">→ Open WHOOP Login (full scope)</a></p>
<pre style="background:#1a1a2e;padding:1rem;border-radius:8px;overflow:auto;font-size:0.8em">${authUrl.replace(/&/g, '\n&amp;')}</pre>
<p><b>LINK 2 — minimal scope (offline + read:recovery only):</b><br><a href="${minUrl}" style="color:#9f9">→ Open WHOOP Login (minimal)</a></p>
<pre style="background:#1a1a2e;padding:1rem;border-radius:8px;overflow:auto;font-size:0.8em">${minUrl.replace(/&/g, '\n&amp;')}</pre>
</body>`);
};
