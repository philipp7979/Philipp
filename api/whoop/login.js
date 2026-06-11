// GET /api/whoop/login — starts standard WHOOP OAuth (authorization code + client secret).
const L = require('./_lib');

module.exports = (req, res) => {
  let id;
  try { id = L.creds().id; }
  catch (e) {
    res.statusCode = 500;
    res.setHeader('content-type', 'text/html');
    res.end('<h2>WHOOP not configured</h2><p>Set WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET in Vercel env vars.</p><a href="/">← back</a>');
    return;
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     id,
    redirect_uri:  L.redirectUri(),
    scope:         L.SCOPE,
  });

  res.statusCode = 302;
  res.setHeader('Location', L.AUTH_URL + '?' + params.toString());
  res.end();
};
