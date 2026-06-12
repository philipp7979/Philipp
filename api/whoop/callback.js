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
    const ok = status === 'connected';
    const bg = ok ? '#0a2e1a' : '#2e0a0a';
    const col = ok ? '#46E0A8' : '#FB7185';
    res.statusCode = 200;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><html><head><meta charset="utf-8">
<style>body{font-family:system-ui;background:${bg};color:#f3f2f8;padding:3rem;max-width:600px;margin:0 auto}
h2{color:${col}}code{background:#1a1a28;padding:2px 8px;border-radius:4px}
a.btn{display:inline-block;margin-top:2rem;padding:.8rem 1.6rem;background:#8B7CFF;color:#fff;font-weight:700;border-radius:8px;text-decoration:none}</style>
</head><body>
<h2>${ok ? '✓ WHOOP Connected' : '✗ WHOOP Connection Failed'}</h2>
<p>Status: <code>${status}</code>${reason ? ' &nbsp; Reason: <code>' + reason + '</code>' : ''}</p>
${ok ? '<p>Your refresh token was stored. Click below to open the dashboard.</p>' : '<p>See the reason above. Common causes: wrong WHOOP_CLIENT_SECRET in Vercel, or WHOOP did not return a refresh token.</p>'}
<a class="btn" href="/whoop.html">→ Go to WHOOP Dashboard</a>
</body></html>`);
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
