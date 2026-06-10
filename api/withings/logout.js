// GET /api/withings/logout — clears all Withings tokens (disconnect).
const L = require('./_lib');

module.exports = (req, res) => {
  const secure = L.isHttps(req);
  res.setHeader('Set-Cookie', [
    L.clearCookie('withings_access',  secure),
    L.clearCookie('withings_refresh', secure),
    L.clearCookie('withings_state',   secure),
  ]);
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ connected: false }));
};
