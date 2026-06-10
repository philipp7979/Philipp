// GET /api/whoop-callback — registered redirect URI in the WHOOP developer portal.
// Exchanges the auth code for tokens, stores them, and returns to the dashboard.
const L = require('./whoop/_lib');

module.exports = async (req, res) => {
  const origin = L.getOrigin(req);
  const url = new URL(req.url, origin);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthErr = url.searchParams.get('error');
  const cookies = L.parseCookies(req);
  const secure = L.isHttps(req);
  const back = (status) => {
    res.statusCode = 302;
    res.setHeader('Location', 'https://philipp-five.vercel.app/?whoop=' + status);
    res.end();
  };

  if (oauthErr) return back('denied&detail=' + encodeURIComponent(oauthErr));
  if (!code) return back('error&detail=no_code');
  if (!state || state !== cookies.whoop_state) return back('error&detail=state_mismatch_got_' + encodeURIComponent(state||'none') + '_cookie_' + encodeURIComponent(cookies.whoop_state||'none'));

  let id, secret;
  try { ({ id, secret } = L.creds()); }
  catch (e) { res.statusCode = 500; res.end('WHOOP not configured'); return; }

  try {
    const tok = await L.tokenRequest({
      grant_type: 'authorization_code',
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: L.redirectUri(),
    });
    const out = [L.clearCookie('whoop_state', secure)];
    if (tok.refresh_token) {
      out.push(L.cookie('whoop_refresh', tok.refresh_token, { maxAge: 60 * 60 * 24 * 365, secure }));
      const sb = L.supabase();
      if (sb) await sb.save(tok.refresh_token);
    }
    res.setHeader('Set-Cookie', out);
    if (tok.refresh_token) return back('connected');
    if (tok.access_token) return back('error&detail=no_refresh_token_scopes_' + encodeURIComponent(tok.scope||'unknown'));
    return back('error&detail=no_tokens_keys_' + encodeURIComponent(Object.keys(tok).join(',')));
  } catch (e) {
    return back('error&detail=' + encodeURIComponent(e.message || 'token_exchange_failed'));
  }
};
