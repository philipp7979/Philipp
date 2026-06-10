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
  // PKCE — WHOOP requires code_challenge or returns "The error is unrecognizable"
  const verifier = L.crypto.randomBytes(32).toString('base64url');
  const challenge = L.crypto.createHash('sha256').update(verifier).digest('base64url');
  const secure = L.isHttps(req);
  res.setHeader('Set-Cookie', [
    L.cookie('whoop_state',    state,    { maxAge: 600, secure }),
    L.cookie('whoop_verifier', verifier, { maxAge: 600, secure }),
  ]);
  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             id,
    redirect_uri:          L.redirectUri(req),
    scope:                 L.SCOPE,
    state,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
  });
  res.statusCode = 302;
  res.setHeader('Location', L.AUTH_URL + '?' + params.toString());
  res.end();
};
