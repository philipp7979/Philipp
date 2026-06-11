// GET /api/withings/data — refreshes the access token if needed, fetches recent
// body measurements, and returns a structured payload for body.html.
const L = require('./_lib');

function scaled(m) { return m.value * Math.pow(10, m.unit); }

module.exports = async (req, res) => {
  res.setHeader('content-type', 'application/json');
  const cookies = L.parseCookies(req);
  const secure  = L.isHttps(req);

  let access  = cookies.withings_access  || null;
  const refresh = cookies.withings_refresh || null;

  if (!refresh) {
    res.statusCode = 200;
    res.end(JSON.stringify({ connected: false }));
    return;
  }

  // Use stored access token; if missing (expired after 3 h), exchange refresh token.
  if (!access) {
    try {
      const tok = await L.tokenRequest('refreshaccesstoken', {
        grant_type:    'refresh_token',
        refresh_token: refresh,
      });
      access = tok.access_token;
      const newCookies = [L.cookie('withings_access', access, { maxAge: tok.expires_in || 10800, secure })];
      if (tok.refresh_token && tok.refresh_token !== refresh)
        newCookies.push(L.cookie('withings_refresh', tok.refresh_token, { maxAge: 60 * 60 * 24 * 365, secure }));
      res.setHeader('Set-Cookie', newCookies);
    } catch (e) {
      res.setHeader('Set-Cookie', L.clearCookie('withings_refresh', secure));
      res.end(JSON.stringify({ connected: false, error: 'refresh_failed' }));
      return;
    }
  }

  const now   = Math.floor(Date.now() / 1000);
  const start = now - 90 * 24 * 3600; // 90 days back

  try {
    const groups = await L.getMeasurements(access, start, now);

    // latest[type] = most recent value
    const latest = {};
    // weight history — all groups in the full 90-day fetch window
    const chartStart = now - 90 * 24 * 3600;
    const weightHistory = [];

    for (const grp of groups) {
      for (const m of grp.measures) {
        const val = scaled(m);
        if (!latest[m.type] || grp.date > latest[m.type].date)
          latest[m.type] = { value: val, date: grp.date };
        if (m.type === 1 && grp.date >= chartStart)
          weightHistory.push({ date: grp.date * 1000, value: Math.round(val * 100) / 100 });
      }
    }
    weightHistory.sort((a, b) => a.date - b.date);

    // 7-day delta for weight
    const week = now - 7 * 24 * 3600;
    let weightWeekAgo = null;
    for (const grp of groups) {
      if (grp.date <= week) {
        for (const m of grp.measures) {
          if (m.type === 1 && (!weightWeekAgo || grp.date > weightWeekAgo.date))
            weightWeekAgo = { value: scaled(m), date: grp.date };
        }
      }
    }

    const get = (t) => latest[t] ? Math.round(latest[t].value * 100) / 100 : null;

    res.statusCode = 200;
    res.end(JSON.stringify({
      connected:    true,
      weight:       get(1),     // kg
      weightDate:   latest[1]  ? latest[1].date  * 1000 : null, // ms timestamp of most recent weight
      fatPct:       get(6),     // %
      fatMass:      get(8),     // kg
      muscle:       get(76),    // kg
      hydration:    get(77),    // kg
      bone:         get(88),    // kg
      weightWeekAgo: weightWeekAgo ? Math.round(weightWeekAgo.value * 100) / 100 : null,
      weightChart:  weightHistory,
      ts:           Date.now(),
    }));
  } catch (e) {
    // 401 = access token rejected — clear it so next request triggers a refresh
    if ((e.status || 0) === 401 || (e.message || '').includes('_401')) {
      res.setHeader('Set-Cookie', L.clearCookie('withings_access', secure));
      res.end(JSON.stringify({ connected: false, error: 'token_expired' }));
    } else {
      res.end(JSON.stringify({ connected: false, error: e.message || 'fetch_failed' }));
    }
  }
};
