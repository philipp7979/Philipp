// GET /api/whoop/callback — verifies state, exchanges code+PKCE for tokens.
const L = require('./_lib');

module.exports = async (req, res) => {
  const origin   = L.getOrigin(req);
  const url      = new URL(req.url, origin);
  const code     = url.searchParams.get('code');
  const state    = url.searchParams.get('state');
  const oauthErr = url.searchParams.get('error');
  const cookies  = L.parseCookies(req);
  const secure   = L.isHttps(req);

  const clearCookies = [
    L.clearCookie('whoop_state',    secure),
    L.clearCookie('whoop_verifier', secure),
  ];

  if (!state || state !== cookies.whoop_state) {
    res.setHeader('Set-Cookie', clearCookies);
    res.statusCode = 302;
    res.setHeader('Location', '/whoop.html?whoop=error&reason=state_mismatch');
    res.end();
    return;
  }

  if (oauthErr || !code) {
    res.setHeader('Set-Cookie', clearCookies);
    res.statusCode = 302;
    res.setHeader('Location', '/whoop.html?whoop=' + (oauthErr === 'access_denied' ? 'denied' : 'error'));
    res.end();
    return;
  }

  let id, secret;
  try { ({ id, secret } = L.creds()); }
  catch (e) {
    res.setHeader('Set-Cookie', clearCookies);
    res.statusCode = 302;
    res.setHeader('Location', '/whoop.html?whoop=error&reason=not_configured');
    res.end();
    return;
  }

  try {
    const body = {
      grant_type:    'authorization_code',
      code,
      client_id:     id,
      client_secret: secret,
      redirect_uri:  L.redirectUri(),
    };
    if (cookies.whoop_verifier) body.code_verifier = cookies.whoop_verifier;

    const tok = await L.tokenRequest(body);

    const setCookies = [...clearCookies];
    if (tok.refresh_token) {
      setCookies.push(L.cookie('whoop_refresh', tok.refresh_token, { maxAge: 60 * 60 * 24 * 365, secure }));
      const sb = L.supabase();
      if (sb) sb.save(tok.refresh_token);
    }
    res.setHeader('Set-Cookie', setCookies);
    res.statusCode = 302;
    res.setHeader('Location', '/whoop.html?whoop=connected');
    res.end();
  } catch (e) {
    res.setHeader('Set-Cookie', clearCookies);
    res.statusCode = 302;
    res.setHeader('Location', '/whoop.html?whoop=error&reason=' + encodeURIComponent(e.message || 'token_failed'));
    res.end();
  }
};
