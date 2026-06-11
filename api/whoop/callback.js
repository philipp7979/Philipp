// GET /api/whoop/callback — exchanges OAuth code for tokens, stores refresh token.
const L = require('./_lib');

module.exports = async (req, res) => {
  const origin = L.getOrigin(req);
  const url    = new URL(req.url, origin);
  const code   = url.searchParams.get('code');
  const state  = url.searchParams.get('state');
  const oauthErr = url.searchParams.get('error');
  const cookies  = L.parseCookies(req);
  const secure   = L.isHttps(req);

  // ── FULL DEBUG — remove once working ──────────────────────────
  let id2 = '(not set)', credErr2 = null;
  try { id2 = L.creds().id.slice(0, 8) + '...'; } catch(e) { credErr2 = e.message; }
  res.statusCode = 200;
  res.setHeader('content-type', 'text/plain; charset=utf-8');
  res.end([
    'WHOOP callback debug',
    '---',
    'code:           ' + (code ? code.slice(0,12)+'...' : '(none)'),
    'state_in_url:   ' + (state || '(none)'),
    'state_in_cookie:' + (cookies.whoop_state || '(none)'),
    'state_match:    ' + (state === cookies.whoop_state),
    'oauth_error:    ' + (oauthErr || '(none)'),
    'creds_ok:       ' + !credErr2 + (credErr2 ? ' — '+credErr2 : ''),
    'client_id:      ' + id2,
    'redirect_uri:   ' + L.redirectUri(),
    'all_cookies:    ' + Object.keys(cookies).join(', '),
    'all_params:     ' + url.searchParams.toString(),
  ].join('\n'));
  return;
  // ── END DEBUG ─────────────────────────────────────────────────

  const clearState = L.clearCookie('whoop_state', secure);

  if (!state || state !== cookies.whoop_state) {
    res.setHeader('Set-Cookie', clearState);
    res.statusCode = 302;
    res.setHeader('Location', '/whoop.html?whoop=error&reason=state_mismatch');
    res.end();
    return;
  }

  if (oauthErr || !code) {
    res.setHeader('Set-Cookie', clearState);
    res.statusCode = 302;
    res.setHeader('Location', '/whoop.html?whoop=' + (oauthErr === 'access_denied' ? 'denied' : 'error'));
    res.end();
    return;
  }

  let id, secret;
  try { ({ id, secret } = L.creds()); }
  catch (e) {
    res.setHeader('Set-Cookie', clearState);
    res.statusCode = 302;
    res.setHeader('Location', '/whoop.html?whoop=error&reason=not_configured');
    res.end();
    return;
  }

  // Make the token request manually so we can surface the raw error.
  let tokRes, tokBody;
  try {
    tokRes = await fetch(L.TOKEN_URL, {
      method:  'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        client_id:     id,
        client_secret: secret,
        redirect_uri:  L.redirectUri(),
      }).toString(),
    });
    tokBody = await tokRes.text();
  } catch (fetchErr) {
    res.setHeader('Set-Cookie', clearState);
    res.statusCode = 200;
    res.setHeader('content-type', 'text/plain');
    res.end('fetch_error: ' + fetchErr.message);
    return;
  }

  if (!tokRes.ok) {
    res.setHeader('Set-Cookie', clearState);
    res.statusCode = 200;
    res.setHeader('content-type', 'text/plain');
    res.end('token_http_' + tokRes.status + '\n\n' + tokBody + '\n\nredirect_uri_sent: ' + L.redirectUri() + '\nclient_id: ' + id.slice(0, 8) + '...');
    return;
  }

  let tok;
  try { tok = JSON.parse(tokBody); } catch(e) {
    res.setHeader('Set-Cookie', clearState);
    res.statusCode = 200;
    res.setHeader('content-type', 'text/plain');
    res.end('json_parse_error\n\n' + tokBody);
    return;
  }

  const setCookies = [clearState];
  if (tok.refresh_token) {
    setCookies.push(L.cookie('whoop_refresh', tok.refresh_token, { maxAge: 60 * 60 * 24 * 365, secure }));
    const sb = L.supabase();
    if (sb) sb.save(tok.refresh_token);
  }
  res.setHeader('Set-Cookie', setCookies);
  res.statusCode = 302;
  res.setHeader('Location', '/whoop.html?whoop=connected');
  res.end();
};
