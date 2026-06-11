// GET /api/whoop/login — starts WHOOP OAuth with PKCE (no state cookie needed).
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

  // PKCE — verifier stored in cookie; challenge sent to WHOOP
  const verifier  = L.crypto.randomBytes(32).toString('base64url');
  const challenge = L.crypto.createHash('sha256').update(verifier).digest('base64url');
  const secure    = L.isHttps(req);

  res.setHeader('Set-Cookie', L.cookie('whoop_verifier', verifier, { maxAge: 600, secure }));

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             id,
    redirect_uri:          L.redirectUri(),
    scope:                 L.SCOPE,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
  });

  res.statusCode = 302;
  res.setHeader('Location', L.AUTH_URL + '?' + params.toString());
  res.end();
};
