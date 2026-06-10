// GET /api/withings/login — kicks off the Withings OAuth flow (302 → withings login).
const L = require('./_lib');

module.exports = (req, res) => {
  let id;
  try { id = L.creds().id; }
  catch (e) {
    res.statusCode = 500;
    res.setHeader('content-type', 'text/html');
    res.end('<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;max-width:34rem;margin:4rem auto;line-height:1.5;color:#222">'
      + '<h2>Withings isn\'t configured yet</h2>'
      + '<p>Set <code>WITHINGS_CLIENT_ID</code> and <code>WITHINGS_CLIENT_SECRET</code> in your Vercel project\'s Environment Variables, '
      + 'and register <code>' + L.redirectUri() + '</code> as a redirect URL in your Withings developer app '
      + '(create one at <a href="https://account.withings.com/partner/add_oauth2">account.withings.com/partner/add_oauth2</a>).</p>'
      + '<p><a href="/">← back to the dashboard</a></p></body>');
    return;
  }
  const state  = L.crypto.randomBytes(12).toString('hex');
  const secure = L.isHttps(req);
  res.setHeader('Set-Cookie', L.cookie('withings_state', state, { maxAge: 600, secure }));
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     id,
    redirect_uri:  L.redirectUri(),
    scope:         L.SCOPE,
    state,
  });
  res.statusCode = 302;
  res.setHeader('Location', L.AUTH_URL + '?' + params.toString());
  res.end();
};
