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

  // DEBUG: show exactly what arrived
  let id, secret, credErr = null;
  try { ({ id, secret } = L.creds()); } catch (e) { credErr = e.message; }

  let tok = null, tokErr = null;
  if (!credErr && code) {
    try {
      tok = await L.tokenRequest({
        grant_type: 'authorization_code',
        code,
        client_id: id,
        client_secret: secret,
        redirect_uri: L.redirectUri(),
      });
    } catch (e) { tokErr = e.message; }
  }

  res.statusCode = 200;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><meta charset="utf-8">
<body style="font-family:monospace;padding:2rem;background:#111;color:#eee;white-space:pre-wrap">
<h2>WHOOP Callback Debug</h2>
code:         ${code || '(none)'}
state_url:    ${state || '(none)'}
state_cookie: ${cookies.whoop_state || '(none)'}
state_match:  ${state === cookies.whoop_state}
oauth_error:  ${oauthErr || '(none)'}
creds_ok:     ${!credErr} ${credErr || ''}
redirect_uri: ${L.redirectUri()}
token_resp:   ${tok ? JSON.stringify(tok, null, 2) : '(none)'}
token_err:    ${tokErr || '(none)'}
all_cookies:  ${JSON.stringify(cookies)}
</body>`);
};
