// GET /api/whoop/login — kicks off the WHOOP OAuth flow (302 → whoop.com login).
const L = require('./_lib');

module.exports = (req, res) => {
  let id;
  try { id = L.creds().id; }
  catch (e) {
    res.statusCode = 500;
    res.setHeader('content-type', 'text/html');
    res.end('<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;max-width:34rem;margin:4rem auto;line-height:1.5;color:#222">'
      + '<h2>WHOOP isn&#39;t configured yet</h2><p>Set <code>WHOOP_CLIENT_ID</code> and <code>WHOOP_CLIENT_SECRET</code> in your Vercel project&#39;s Environment Variables, and register <code>' + L.redirectUri(req) + '</code> as a redirect URL in your WHOOP developer app.</p><p><a href="/">&#8592; back to the dashboard</a></p></body>');
    return;
  }
  const state = L.crypto.randomBytes(12).toString('hex');
  res.setHeader('Set-Cookie', L.cookie('whoop_state', state, { maxAge: 600, secure: L.isHttps(req) }));
  // Build all params with URLSearchParams except scope — WHOOP needs %20 not + for spaces
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     id,
    redirect_uri:  L.redirectUri(req),
    state,
  });
  const loc = L.AUTH_URL + '?' + params.toString() + '&scope=' + L.SCOPE.replace(/ /g, '%20');
  res.statusCode = 302;
  res.setHeader('Location', loc);
  res.end();
};
