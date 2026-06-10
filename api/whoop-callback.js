// GET /api/whoop-callback — debug version
const L = require('./whoop/_lib');

module.exports = async (req, res) => {
  const origin = L.getOrigin(req);
  const url = new URL(req.url, origin);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthErr = url.searchParams.get('error');
  const cookies = L.parseCookies(req);

  let id, secret, credErr = null;
  try { ({ id, secret } = L.creds()); } catch (e) { credErr = e.message; }

  let tok = null, tokErr = null;
  if (!credErr && code) {
    try {
      tok = await L.tokenRequest({
        grant_type: 'authorization_code',
        code, client_id: id, client_secret: secret,
        redirect_uri: L.redirectUri(),
      });
    } catch (e) { tokErr = e.message; }
  }

  res.statusCode = 200;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><meta charset="utf-8">
<body style="font-family:monospace;padding:2rem;background:#111;color:#eee;white-space:pre-wrap">
<h2>WHOOP Callback Debug</h2>
oauth_error:  ${oauthErr || '(none)'}
code:         ${code || '(none)'}
state_match:  ${state === cookies.whoop_state}
creds_ok:     ${!credErr} ${credErr || ''}
redirect_uri: ${L.redirectUri()}
scope_used:   ${L.SCOPE}
token_resp:   ${tok ? JSON.stringify(tok, null, 2) : '(none)'}
token_err:    ${tokErr || '(none)'}
all_params:   ${url.searchParams.toString()}
</body>`);
};
