// GET /api/whoop/callback — exchanges code for tokens using PKCE.
const L = require('./_lib');

module.exports = async (req, res) => {
  const origin   = L.getOrigin(req);
  const url      = new URL(req.url, origin);
  const code     = url.searchParams.get('code');
  const oauthErr = url.searchParams.get('error');
  const cookies  = L.parseCookies(req);
  const secure   = L.isHttps(req);

  const clearVerifier = L.clearCookie('whoop_verifier', secure);

  if (oauthErr || !code) {
    res.setHeader('Set-Cookie', clearVerifier);
    res.statusCode = 302;
    res.setHeader('Location', '/whoop.html?whoop=' + (oauthErr === 'access_denied' ? 'denied' : 'error'));
    res.end();
    return;
  }

  let id, secret;
  try { ({ id, secret } = L.creds()); }
  catch (e) {
    res.setHeader('Set-Cookie', clearVerifier);
    res.statusCode = 302;
    res.setHeader('Location', '/whoop.html?whoop=error&reason=not_configured');
    res.end();
    return;
  }

  try {
    const params = {
      grant_type:    'authorization_code',
      code,
      client_id:     id,
      client_secret: secret,
      redirect_uri:  L.redirectUri(),
    };
    if (cookies.whoop_verifier) params.code_verifier = cookies.whoop_verifier;

    const tok = await L.tokenRequest(params);

    const setCookies = [clearVerifier];
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
    res.setHeader('Set-Cookie', clearVerifier);
    res.statusCode = 302;
    res.setHeader('Location', '/whoop.html?whoop=error&reason=' + encodeURIComponent(e.message || 'token_failed'));
    res.end();
  }
};
