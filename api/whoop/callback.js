// GET /api/whoop/callback — exchanges authorization code for tokens.
const L = require('./_lib');

module.exports = async (req, res) => {
  const origin   = L.getOrigin(req);
  const url      = new URL(req.url, origin);
  const code     = url.searchParams.get('code');
  const oauthErr = url.searchParams.get('error');
  const secure   = L.isHttps(req);

  if (oauthErr || !code) {
    res.statusCode = 302;
    res.setHeader('Location', '/whoop.html?whoop=' + (oauthErr === 'access_denied' ? 'denied' : 'error') + '&reason=' + encodeURIComponent(oauthErr || 'no_code'));
    res.end();
    return;
  }

  let id, secret;
  try { ({ id, secret } = L.creds()); }
  catch (e) {
    res.statusCode = 302;
    res.setHeader('Location', '/whoop.html?whoop=error&reason=not_configured');
    res.end();
    return;
  }

  try {
    const tok = await L.tokenRequest({
      grant_type:    'authorization_code',
      code,
      client_id:     id,
      client_secret: secret,
      redirect_uri:  L.redirectUri(),
    });

    if (tok.refresh_token) {
      res.setHeader('Set-Cookie', L.cookie('whoop_refresh', tok.refresh_token, { maxAge: 60 * 60 * 24 * 365, secure }));
      const sb = L.supabase();
      if (sb) sb.save(tok.refresh_token);
    }
    res.statusCode = 302;
    res.setHeader('Location', '/whoop.html?whoop=connected');
    res.end();
  } catch (e) {
    res.statusCode = 302;
    res.setHeader('Location', '/whoop.html?whoop=error&reason=' + encodeURIComponent(e.message || 'token_failed'));
    res.end();
  }
};
