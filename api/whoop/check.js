// GET /api/whoop/check — diagnostic page (safe to leave deployed, shows no secrets).
const L = require('./_lib');

module.exports = (req, res) => {
  const id     = (process.env.WHOOP_CLIENT_ID     || '').trim();
  const secret = (process.env.WHOOP_CLIENT_SECRET || '').trim();

  const idOk     = id.length > 0;
  const secretOk = secret.length > 0;

  const redirectUri = L.redirectUri();
  const scope = L.SCOPE.replace(/ /g, '%20');

  const qs = [
    'response_type=code',
    'client_id=' + encodeURIComponent(id || 'NOT_SET'),
    'redirect_uri=' + encodeURIComponent(redirectUri),
    'scope=' + scope,
  ].join('&');
  const authUrl = L.AUTH_URL + '?' + qs;

  const row = (label, ok, detail) =>
    `<tr><td style="padding:8px 12px;font-weight:600">${label}</td>` +
    `<td style="padding:8px 12px;color:${ok ? '#46E0A8' : '#FB7185'}">${ok ? '✓ OK' : '✗ MISSING'}</td>` +
    `<td style="padding:8px 12px;color:#aaa;word-break:break-all">${detail}</td></tr>`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8">
<title>WHOOP Check</title>
<style>
body{font-family:system-ui,sans-serif;background:#0C0C12;color:#F3F2F8;padding:2rem;line-height:1.5}
h2{margin:0 0 1.5rem;font-size:1.4rem}
table{border-collapse:collapse;width:100%;max-width:860px;background:#15151F;border-radius:12px;overflow:hidden;margin-bottom:2rem}
th{padding:10px 12px;text-align:left;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#8B7CFF;background:#1a1a28}
pre{background:#1a1a28;padding:1rem;border-radius:8px;overflow-x:auto;font-size:12px;word-break:break-all;white-space:pre-wrap;max-width:860px}
a.btn{display:inline-block;padding:.7rem 1.4rem;background:#8B7CFF;color:#130E2E;font-weight:700;border-radius:8px;text-decoration:none;margin-top:1rem}
.warn{color:#FBBF24;font-size:13px;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);padding:.6rem 1rem;border-radius:6px;max-width:860px;margin-bottom:1.5rem}
</style></head><body>
<h2>WHOOP OAuth Diagnostics</h2>
${(!idOk || !secretOk) ? '<p class="warn">⚠ Env vars missing — set WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET in Vercel → Project → Settings → Environment Variables, then redeploy.</p>' : ''}
<table>
<thead><tr><th>Check</th><th>Status</th><th>Value</th></tr></thead>
<tbody>
${row('WHOOP_CLIENT_ID', idOk, idOk ? id.slice(0,8) + '…' + id.slice(-4) : 'not set')}
${row('WHOOP_CLIENT_SECRET', secretOk, secretOk ? '(set, ' + secret.length + ' chars)' : 'not set')}
${row('Redirect URI', true, redirectUri)}
${row('Scope', true, L.SCOPE)}
</tbody></table>
<p style="margin:0 0 .5rem;font-size:13px;color:#aaa">Auth URL that will be sent to WHOOP:</p>
<pre>${authUrl.replace(/&/g, '\n&amp;')}</pre>
${idOk && secretOk
  ? `<p>Everything looks configured. Click below to test the full WHOOP auth flow — if WHOOP shows its login screen, the URL is correct.</p>
<a class="btn" href="/api/whoop/login">→ Test WHOOP Login</a>`
  : `<p>Fix the missing env vars above, then reload this page.</p>`}
<p style="margin:2rem 0 .5rem;font-size:13px;color:#aaa">Credential test (sends a dummy code — WHOOP tells us if your client_id/secret are accepted):</p>
<pre id="credtest">testing...</pre>
<script>
fetch('/api/whoop/credtest').then(r=>r.json()).then(d=>{
  var el=document.getElementById('credtest');
  el.style.color=d.ok?'#46E0A8':'#FB7185';
  el.textContent=d.message;
}).catch(function(e){document.getElementById('credtest').textContent='fetch failed: '+e;});
</script>
</body></html>`;

  res.statusCode = 200;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(html);
};
