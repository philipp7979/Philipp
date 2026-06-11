// GET /api/whoop/credtest — diagnostic: probe WHOOP token endpoint with a fake code
// to see if the client credentials are accepted (invalid_grant = creds OK, invalid_client = creds wrong).
const L = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('content-type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  let id, secret;
  try { ({ id, secret } = L.creds()); }
  catch (e) {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: false, message: 'Env vars not set: WHOOP_CLIENT_ID and/or WHOOP_CLIENT_SECRET are missing in Vercel.' }));
    return;
  }

  try {
    // Send a deliberately wrong code — WHOOP will respond:
    //   invalid_grant  → credentials are ACCEPTED (code was just wrong — expected)
    //   invalid_client → credentials are REJECTED (wrong client_id or secret)
    const r = await fetch(L.TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'diagnostic_test_code',
        client_id: id,
        client_secret: secret,
        redirect_uri: L.redirectUri(),
      }).toString(),
    });
    const j = await r.json().catch(() => ({}));
    const err = j.error || '';
    if (err === 'invalid_grant' || err === 'authorization_code_not_found') {
      // Credentials accepted — the code was wrong (as expected)
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, message: 'Credentials OK — WHOOP accepted client_id/secret (error was invalid_grant for dummy code, which is expected). OAuth should work.' }));
    } else if (err === 'invalid_client' || r.status === 401) {
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: false, message: 'Credentials REJECTED — WHOOP returned: ' + JSON.stringify(j) + '. Update WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET in Vercel env vars then redeploy.' }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: null, message: 'WHOOP response (HTTP ' + r.status + '): ' + JSON.stringify(j) }));
    }
  } catch (e) {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: false, message: 'Request to WHOOP failed: ' + e.message }));
  }
};
