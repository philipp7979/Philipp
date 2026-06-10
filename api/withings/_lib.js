// Shared helpers for the Withings OAuth serverless functions.
// Client secret lives here only (server-side, from env).
// Tokens stored in httpOnly cookies — never sent to the browser.
const crypto = require('crypto');

const AUTH_URL    = 'https://account.withings.com/oauth2_user/authorize2';
const TOKEN_URL   = 'https://wbsapi.withings.net/v2/oauth2';
const MEASURE_URL = 'https://wbsapi.withings.net/measure';
const SCOPE       = 'user.metrics';

function getOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host   = req.headers['x-forwarded-host'] || req.headers.host;
  return proto + '://' + host;
}
function redirectUri() { return 'https://row-gray.vercel.app/api/withings/callback'; }
function isHttps(req) { return getOrigin(req).startsWith('https'); }

function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function cookie(name, val, opts) {
  opts = opts || {};
  let s = name + '=' + encodeURIComponent(val) + '; Path=/; HttpOnly; SameSite=Lax';
  if (opts.secure !== false) s += '; Secure';
  if (opts.maxAge != null) s += '; Max-Age=' + opts.maxAge;
  return s;
}
function clearCookie(name, secure) {
  return name + '=; Path=/; HttpOnly; SameSite=Lax' + (secure !== false ? '; Secure' : '') + '; Max-Age=0';
}

function creds() {
  const id = process.env.WITHINGS_CLIENT_ID, secret = process.env.WITHINGS_CLIENT_SECRET;
  if (!id || !secret) { const e = new Error('WITHINGS_NOT_CONFIGURED'); e.code = 'WITHINGS_NOT_CONFIGURED'; throw e; }
  return { id, secret };
}

// action = 'requesttoken' (initial) or 'refreshaccesstoken' (refresh).
// Withings wraps all responses in { status: 0, body: {...} }.
async function tokenRequest(action, params) {
  const { id, secret } = creds();
  const r = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ action, client_id: id, client_secret: secret, ...params }).toString(),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.status !== 0) {
    const e = new Error('withings_' + (j.status || r.status) + ' ' + (j.error || ''));
    e.status = j.status || r.status;
    throw e;
  }
  return j.body;
}

// Fetches body measurements for the given Unix timestamp range.
// meastype: 1=weight(kg) 6=fat% 8=fat_mass(kg) 76=muscle(kg) 77=hydration(kg) 88=bone(kg)
async function getMeasurements(accessToken, startdate, enddate) {
  const r = await fetch(MEASURE_URL, {
    method:  'POST',
    headers: {
      'content-type':  'application/x-www-form-urlencoded',
      'Authorization': 'Bearer ' + accessToken,
    },
    body: new URLSearchParams({
      action:   'getmeas',
      meastype: '1,6,8,76,77,88',
      category: '1',
      startdate: String(startdate),
      enddate:   String(enddate),
    }).toString(),
  });
  const j = await r.json().catch(() => ({}));
  if (j.status !== 0) {
    const e = new Error('getmeas_' + j.status);
    e.status = j.status;
    throw e;
  }
  return (j.body && j.body.measuregrps) || [];
}

module.exports = { crypto, AUTH_URL, TOKEN_URL, MEASURE_URL, SCOPE, getOrigin, redirectUri, isHttps, parseCookies, cookie, clearCookie, creds, tokenRequest, getMeasurements };
