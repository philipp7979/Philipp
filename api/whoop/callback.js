// GET /api/whoop/callback — WHOOP redirects here with ?code & ?state.
// Verifies state, exchanges the code for tokens, stores refresh token in httpOnly cookie.
const L = require('./_lib');

module.exports = async (req, res) => {
  const origin   = L.getOrigin(req);
  const url      = new URL(req.url, origin);
  const code     = url.searchParams.get('code');
  const state    = url.searchParams.get('state');
  const oauthErr = url.searchParams.get('error');
  const cookies  = L.parseCookies(req);
  const secure   = L.isHttps(req);

  const back = (status, reason) => {
    let loc = '/whoop.html?whoop=' + status;
    if (reason) loc += '&reason=' + encodeURIComponent(reason);
    res.statusCode = 302;
    res.setHeader('Location', loc);
    res.end();
  };

  if (oauthErr) return back(oauthErr === 'access_denied' ? 'denied' : 'error', oauthErr);
  if (!code) return back('error', 'no_code');

  let id, secret;
  try { ({ id, secret } = L.creds()); }
  catch (e) { return back('error', 'not_configured'); }

  try {
    const tok = await L.tokenRequest({
      grant_type:    'authorization_code',
      code,
      client_id:     id,
      client_secret: secret,
      redirect_uri:  L.redirectUri(req),
    });
    const out = [L.clearCookie('whoop_state', secure)];
    if (tok.refresh_token) out.push(L.cookie('whoop_refresh', tok.refresh_token, { maxAge: 60 * 60 * 24 * 365, secure }));
    res.setHeader('Set-Cookie', out);
    return back(tok.refresh_token ? 'connected' : 'error', tok.refresh_token ? null : 'no_refresh_token');
  } catch (e) {
    return back('error', e.message || 'token_failed');
  }
};
