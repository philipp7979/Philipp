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

  // WHOOP rejects + encoding for spaces — build manually with %20
  const qs = [
    'response_type=code',
    'client_id=' + encodeURIComponent(id),
    'redirect_uri=' + encodeURIComponent(L.redirectUri()),
    'scope=' + L.SCOPE.replace(/ /g, '%20'),
  ].join('&');

  res.statusCode = 302;
  res.setHeader('Location', L.AUTH_URL + '?' + qs);
  res.end();
};
