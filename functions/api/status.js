// GET /api/status - monitor data for the /status page.
//
// Calls UptimeRobot's getMonitors with the read-only key in the
// UPTIMEROBOT_API_KEY secret (Cloudflare Pages > Settings > Variables and
// Secrets; locally, .dev.vars). The key stays on the server and only the
// fields the page needs are returned. Every monitor on the account is
// included, so a monitor added in UptimeRobot shows up on /status with no
// code change.
//
// The free plan allows 10 API calls a minute, so a response is cached at
// the edge for FRESH_SECONDS, and the last good response is kept for
// STALE_SECONDS as a fallback when the API errors or rate-limits.

const API = "https://api.uptimerobot.com/v2/getMonitors";
const PAGE_SIZE = 50; // getMonitors maximum
const FRESH_SECONDS = 60;
const STALE_SECONDS = 86400;
const DAY = 86400;
const HISTORY_DAYS = 90;

const STATUS = { 0: "paused", 1: "pending", 2: "up", 8: "degraded", 9: "down" };

export async function onRequestGet({ request, env, waitUntil }) {
  const origin = new URL(request.url).origin;
  const freshKey = new Request(`${origin}/api/status?cache=fresh`);
  const staleKey = new Request(`${origin}/api/status?cache=stale`);
  const cache = caches.default;

  const hit = await cache.match(freshKey);
  if (hit) return hit;

  if (!env.UPTIMEROBOT_API_KEY) {
    return reply(JSON.stringify({ error: "Status data is not configured." }), 503, "no-store");
  }

  try {
    const body = JSON.stringify(await loadStatus(env.UPTIMEROBOT_API_KEY));
    waitUntil(cache.put(freshKey, reply(body, 200, `public, max-age=${FRESH_SECONDS}`)));
    waitUntil(cache.put(staleKey, reply(body, 200, `public, max-age=${STALE_SECONDS}`)));
    return reply(body, 200, `public, max-age=${FRESH_SECONDS}`);
  } catch (err) {
    const stale = await cache.match(staleKey);
    if (stale) {
      // Last good data, marked stale so the page can say so.
      const data = await stale.json();
      return reply(JSON.stringify({ ...data, stale: true }), 200, "no-store");
    }
    return reply(JSON.stringify({ error: "Status data is unavailable right now." }), 502, "no-store");
  }
}

function reply(body, status, cacheControl) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
      "x-robots-tag": "noindex",
    },
  });
}

async function loadStatus(apiKey) {
  const now = Math.floor(Date.now() / 1000);
  // HISTORY_DAYS calendar days in UTC, oldest first, the last one being
  // today so far.
  const todayStart = now - (now % DAY);
  const days = [];
  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const start = todayStart - i * DAY;
    days.push({ start, end: i === 0 ? now : start + DAY });
  }

  const params = {
    api_key: apiKey,
    format: "json",
    limit: String(PAGE_SIZE),
    custom_uptime_ratios: "1-7-30-90",
    custom_uptime_ranges: days.map((d) => `${d.start}_${d.end}`).join("-"),
    response_times: "1",
    response_times_average: "60",
    response_times_start_date: String(now - DAY),
    response_times_end_date: String(now),
    logs: "1",
    logs_limit: "20",
  };

  const monitors = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const res = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "cache-control": "no-cache" },
      body: new URLSearchParams({ ...params, offset: String(offset) }),
    });
    if (!res.ok) throw new Error(`getMonitors HTTP ${res.status}`);
    const data = await res.json();
    if (data.stat !== "ok") throw new Error(`getMonitors: ${JSON.stringify(data.error || data)}`);
    monitors.push(...data.monitors);
    const total = data.pagination ? data.pagination.total : monitors.length;
    if (monitors.length >= total || data.monitors.length === 0) break;
  }

  return { updated: now, monitors: monitors.map((m) => shape(m, days, now)) };
}

function shape(m, days, now) {
  const ratios = String(m.custom_uptime_ratio || "").split("-").map(toNumber);
  const daily = String(m.custom_uptime_ranges || "").split("-").map(toNumber);
  const created = m.create_datetime || 0;
  return {
    id: m.id,
    name: m.friendly_name,
    host: hostOf(m.url),
    // Only web monitors get a link; ping/port monitors have no page to open.
    url: /^https?:\/\//i.test(m.url || "") ? m.url : null,
    status: STATUS[m.status] || "pending",
    interval: m.interval,
    uptime: { day: ratios[0], week: ratios[1], month: ratios[2], quarter: ratios[3] },
    avgResponseMs: m.average_response_time ? Math.round(Number(m.average_response_time)) : null,
    responseTimes: (m.response_times || [])
      .map((r) => ({ t: r.datetime, ms: r.value }))
      .sort((a, b) => a.t - b.t),
    // A day that ended before the monitor existed has no data, not 100%.
    days: days.map((d, i) => ({
      date: new Date(d.start * 1000).toISOString().slice(0, 10),
      uptime: d.end <= created ? null : daily[i] ?? null,
    })),
    incidents: (m.logs || [])
      .filter((l) => l.type === 1 && l.datetime >= now - 90 * DAY)
      .map((l) => ({
        start: l.datetime,
        duration: l.duration,
        reason: (l.reason && l.reason.detail) || "",
      })),
  };
}

function toNumber(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url || "";
  }
}
