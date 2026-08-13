// FULL LIVE AUDIT: run the entire dispatch loop against the real Supabase
// project as all three actors — customer, dispatcher, driver — over the same
// REST/RPC surface the apps use. This is the only honest test of "will the
// three apps communicate": they share no code paths except this data layer.

// Overridable so the script survives a project move; the anon key is public
// by design (RLS protects the data, not key secrecy).
const BASE = process.env.SUPABASE_URL ?? 'https://moujyjzuclxarobruwfo.supabase.co';
const KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vdWp5anp1Y2x4YXJvYnJ1d2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTM4MjgsImV4cCI6MjEwMjE4OTgyOH0.GAgJwnayYj684mo5PViILGUlEkM7t3DeiDiRe4aXsZE';

const results = [];
function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

async function api(path, { method = 'GET', token = KEY, body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, json };
}

async function signIn(phone) {
  await api('/auth/v1/otp', { method: 'POST', body: { phone } });
  const v = await api('/auth/v1/verify', {
    method: 'POST',
    body: { phone, token: '417226', type: 'sms' },
  });
  if (!v.json?.access_token) throw new Error(`sign-in failed for ${phone}: ${JSON.stringify(v.json).slice(0, 200)}`);
  return { token: v.json.access_token, id: v.json.user.id };
}

// Mirror of the client quote, to check parity with the server RPC.
const RATES = { base: 4.5, perKm: 1.2, perMin: 0.18, cityLevy: 0.7, roundStep: 0.05 };
const EST = { roadFactor: 1.35, averageSpeedKmh: 26, minimumDistanceKm: 0.8 };
const MULT = { share: 0.641, go: 1, xl: 1.556 };
function localQuote(a, b, tier) {
  const rad = (d) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.sin(rad(b.lng - a.lng) / 2) ** 2 * Math.cos(rad(a.lat)) * Math.cos(rad(b.lat));
  const straight = 2 * 6371 * Math.asin(Math.sqrt(h));
  const km = Math.round(Math.max(EST.minimumDistanceKm, straight * EST.roadFactor) * 10) / 10;
  const min = Math.max(1, Math.round((km / EST.averageSpeedKmh) * 60));
  const rs = (n) => Math.round((Math.round(n / RATES.roundStep) * RATES.roundStep) * 100) / 100;
  const base = rs(RATES.base * MULT[tier]);
  const dist = rs(RATES.perKm * km * MULT[tier]);
  const time = rs(RATES.perMin * min * MULT[tier]);
  return { total: Math.round((base + dist + time + RATES.cityLevy) * 100) / 100, km, min };
}

(async () => {
  console.log('── Auth ──');
  const cust = await signIn('+67583122058');
  const desk = await signIn('+67570000002');
  const drv = await signIn('+67572453312');
  record('all three roles sign in with test OTPs', true);

  console.log('\n── Schema & seed state (as dispatcher) ──');
  const profiles = await api('/rest/v1/profiles?select=role,name,phone', { token: desk.token });
  const roles = (profiles.json || []).map((p) => p.role).sort();
  record('profiles: customer + driver + dispatcher exist',
    roles.includes('customer') && roles.includes('driver') && roles.includes('dispatcher'),
    JSON.stringify((profiles.json || []).map((p) => `${p.role}:${p.name}`)));

  const vehicles = await api('/rest/v1/vehicles?select=plate,tier,driver_id', { token: desk.token });
  record('vehicles seeded, one linked to the driver',
    Array.isArray(vehicles.json) && vehicles.json.length >= 1 && vehicles.json.some((v) => v.driver_id),
    JSON.stringify((vehicles.json || []).map((v) => `${v.plate}/${v.tier}`)));

  const places = await api('/rest/v1/places?select=id,name,lat,lng&active=eq.true', { token: cust.token });
  const placeRows = Array.isArray(places.json) ? places.json : [];
  const withCoords = placeRows.filter((p) => p.lat != null);
  record('places table exists and has coordinates', Array.isArray(places.json) && withCoords.length >= 2,
    Array.isArray(places.json) ? `${placeRows.length} places, ${withCoords.length} with coords` : String(places.json?.message).slice(0, 90));

  const fc = await api('/rest/v1/fare_config?select=*', { token: cust.token });
  record('fare_config exists (server-side pricing deployed)', Array.isArray(fc.json) && fc.json.length === 1,
    Array.isArray(fc.json) ? `currency ${fc.json[0]?.currency}` : JSON.stringify(fc.json).slice(0, 120));

  if (!Array.isArray(places.json) || withCoords.length < 2 || !Array.isArray(fc.json)) {
    console.log('\n!! Cannot continue the loop — schema.sql / seed-accounts.sql not fully applied.');
    return summary();
  }

  const A = withCoords.find((p) => p.name.includes('Boroko')) ?? withCoords[0];
  const B = withCoords.find((p) => p.name.includes('Airport')) ?? withCoords[1];

  console.log(`\n── Fare parity: ${A.name} → ${B.name} (go) ──`);
  const server = await api('/rest/v1/rpc/quote_ride', {
    method: 'POST', token: cust.token,
    body: { p_pickup: A.id, p_dropoff: B.id, p_tier: 'go' },
  });
  const local = localQuote(A, B, 'go');
  const sTotal = Number(server.json?.total);
  record('server quote_ride works', server.status === 200 && !Number.isNaN(sTotal),
    JSON.stringify(server.json).slice(0, 140));
  record('server and client quote the SAME fare', Math.abs(sTotal - local.total) < 0.001,
    `server K${sTotal} vs client K${local.total} (${local.km} km / ${local.min} min)`);

  console.log('\n── Booking (customer) ──');
  const wrong = await api('/rest/v1/rpc/book_ride', {
    method: 'POST', token: cust.token,
    body: { p_pickup: A.id, p_dropoff: B.id, p_tier: 'go', p_expected_total: 1.0 },
  });
  record('book_ride REFUSES a client-supplied wrong fare', wrong.status >= 400,
    JSON.stringify(wrong.json?.message ?? wrong.json).slice(0, 110));

  const direct = await api('/rest/v1/jobs', {
    method: 'POST', token: cust.token, headers: { Prefer: 'return=representation' },
    body: { customer_id: cust.id, tier: 'go', pickup: { address: 'x' }, dropoff: { address: 'y' },
      quoted_fare: { base: 0, distance: 0, time: 0, cityLevy: 0, total: 0.05, currency: 'PGK' }, status: 'at_desk' },
  });
  record('direct INSERT into jobs is blocked (client cannot name its price)', direct.status >= 400,
    `HTTP ${direct.status}`);

  const booked = await api('/rest/v1/rpc/book_ride', {
    method: 'POST', token: cust.token,
    body: { p_pickup: A.id, p_dropoff: B.id, p_tier: 'go', p_expected_total: sTotal, p_note: 'Audit run — blue gate' },
  });
  const job = booked.json;
  record('book_ride books at the server price', booked.status === 200 && job?.status === 'at_desk',
    job?.number ? `request ${job.number}, K${job.quoted_fare?.total}, route ${JSON.stringify(job.route)}` : JSON.stringify(job).slice(0, 140));
  if (!job?.id) return summary();

  console.log('\n── Dispatch (desk → driver) ──');
  const invisible = await api(`/rest/v1/jobs?id=eq.${job.id}&select=id`, { token: drv.token });
  record('driver CANNOT see the job before assignment (RLS)', (invisible.json || []).length === 0);

  const queue = await api(`/rest/v1/jobs?status=eq.at_desk&select=id,number`, { token: desk.token });
  record('desk sees the booking in its queue', (queue.json || []).some((j) => j.id === job.id),
    `${(queue.json || []).length} queued`);

  const veh = vehicles.json.find((v) => v.driver_id);
  const offer = await api(`/rest/v1/jobs?id=eq.${job.id}`, {
    method: 'PATCH', token: desk.token, headers: { Prefer: 'return=representation' },
    body: { status: 'offered', assigned_driver_id: drv.id, assigned_vehicle_id: veh ? (await api(`/rest/v1/vehicles?driver_id=eq.${drv.id}&select=id`, { token: desk.token })).json?.[0]?.id : null, dispatcher_id: desk.id },
  });
  record('desk offers the job to the driver', offer.status === 200 && offer.json?.[0]?.status === 'offered');

  const nowVisible = await api(`/rest/v1/jobs?id=eq.${job.id}&select=number,status`, { token: drv.token });
  record('driver NOW sees the job (assignment grants visibility)', (nowVisible.json || []).length === 1);

  console.log('\n── Trip lifecycle ──');
  const steps = [
    ['driver confirms → arriving', drv.token, { status: 'arriving' }],
    ['driver arrives → at_pickup (new enum value)', drv.token, { status: 'at_pickup' }],
    ['customer boards → on_trip', cust.token, { status: 'on_trip' }],
    ['driver completes → completed', drv.token, { status: 'completed' }],
  ];
  for (const [name, token, body] of steps) {
    const r = await api(`/rest/v1/jobs?id=eq.${job.id}`, {
      method: 'PATCH', token, headers: { Prefer: 'return=representation' }, body,
    });
    record(name, r.status === 200 && r.json?.[0]?.status === body.status,
      r.status !== 200 ? JSON.stringify(r.json).slice(0, 110) : '');
  }

  console.log('\n── Cross-visibility while paired ──');
  const drvProfile = await api(`/rest/v1/profiles?id=eq.${drv.id}&select=name,phone`, { token: cust.token });
  record('customer can read driver name + phone (Call button data)', (drvProfile.json || []).length === 1,
    JSON.stringify(drvProfile.json?.[0]));
  const deskProfile = await api(`/rest/v1/profiles?id=eq.${desk.id}&select=name,ward`, { token: cust.token });
  record('customer can read dispatcher name ("Ravi K.", naming rule)', (deskProfile.json || []).length === 1,
    JSON.stringify(deskProfile.json?.[0]));

  console.log('\n── Audit timeline ──');
  const events = await api(`/rest/v1/job_events?job_id=eq.${job.id}&select=event&order=created_at`, { token: cust.token });
  const names = (events.json || []).map((e) => e.event);
  record('job_events recorded (customer-visible timeline)', names.includes('created'),
    names.join(' → ') || 'EMPTY');
  record('lifecycle events beyond created are recorded', names.length > 1,
    names.length <= 1 ? 'only "created" — REST patches here bypass the app repo layer, see notes' : `${names.length} events`);

  console.log('\n── Known hole (expected to still exist) ──');
  const tamper = await api(`/rest/v1/jobs?id=eq.${job.id}`, {
    method: 'PATCH', token: cust.token, headers: { Prefer: 'return=representation' },
    body: { quoted_fare: { ...job.quoted_fare, total: 0.05 } },
  });
  record('KNOWN HOLE: customer can still rewrite quoted_fare on own job',
    tamper.status === 200 && Number(tamper.json?.[0]?.quoted_fare?.total) === 0.05,
    'documented gap — needs amend_fare() RPC before real money');
  // Put the fare back so the record is not corrupted.
  await api(`/rest/v1/jobs?id=eq.${job.id}`, {
    method: 'PATCH', token: cust.token, body: { quoted_fare: job.quoted_fare },
  });

  console.log('\n── Isolation ──');
  const anon = await api('/rest/v1/jobs?select=id', {});
  record('anonymous sees no jobs', Array.isArray(anon.json) && anon.json.length === 0);
  const escalate = await api(`/rest/v1/profiles?id=eq.${cust.id}`, {
    method: 'PATCH', token: cust.token, body: { role: 'dispatcher' },
  });
  record('role escalation still blocked', escalate.status >= 400,
    JSON.stringify(escalate.json?.message ?? '').slice(0, 60));

  summary();

  function summary() {
    const pass = results.filter((r) => r.pass).length;
    console.log(`\n══════ ${pass}/${results.length} checks passed ══════`);
  }
})().catch((e) => { console.error('ABORTED:', e.message); });
