// GET /api/withings/callback — Withings redirects here with ?code & ?state.
// Verifies state, exchanges code for tokens, stores refresh in httpOnly cookie.
const L = require('./_lib');

module.exports = async (req, res) => {
  const origin   = L.getOrigin(req);
  const url      = new URL(req.url, origin);
  const code     = url.searchParams.get('code');
  const state    = url.searchParams.get('state');
  const oauthErr = url.searchParams.get('error');
  const cookies  = L.parseCookies(req);
  const secure   = L.isHttps(req);
  const back     = (s) => { res.statusCode = 302; res.setHeader('Location', '/body.html?withings=' + s); res.end(); };

  if (oauthErr) return back('denied');
  if (!code)    return back('error');
  if (!state || state !== cookies.withings_state) return back('error');

  try {
    const tok = await L.tokenRequest('requesttoken', {
      grant_type:   'authorization_code',
      code,
      redirect_uri: L.redirectUri(),
    });
    const out = [L.clearCookie('withings_state', secure)];
    if (tok.access_token) {
      out.push(L.cookie('withings_access', tok.access_token, { maxAge: tok.expires_in || 10800, secure }));
    }
    if (tok.refresh_token) {
      out.push(L.cookie('withings_refresh', tok.refresh_token, { maxAge: 60 * 60 * 24 * 365, secure }));
    }
    res.setHeader('Set-Cookie', out);
    return back(tok.refresh_token ? 'connected' : 'error');
  } catch (e) {
    return back('error');
  }
};
