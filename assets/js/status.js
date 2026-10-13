/*
 * /status page: renders monitor data from /api/status (functions/api/status.js)
 * into #status-app and refreshes it every minute. Every monitor the API
 * returns is shown, so new monitors need no change here.
 *
 * Built with DOM methods, not innerHTML, so monitor names and incident
 * reasons are always treated as text.
 */
(function () {
  "use strict";

  var REFRESH_MS = 60000;
  var app = document.getElementById("status-app");
  if (!app) return;

  var LABELS = {
    up: "Operational",
    degraded: "Degraded",
    down: "Down",
    paused: "Paused",
    pending: "Pending",
  };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function svg(tag, attrs) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function pct(value) {
    if (value == null) return "-";
    return (value >= 100 ? "100" : value.toFixed(2)) + "%";
  }

  function dayClass(uptime) {
    if (uptime == null) return "is-none";
    if (uptime >= 99.9) return "is-up";
    if (uptime >= 99) return "is-warn";
    return "is-down";
  }

  function duration(seconds) {
    if (seconds < 60) return seconds + " sec";
    var m = Math.round(seconds / 60);
    if (m < 60) return m + " min";
    var h = Math.floor(m / 60);
    return h + " hr" + (m % 60 ? " " + (m % 60) + " min" : "");
  }

  function when(unix, withTime) {
    var opts = { month: "short", day: "numeric" };
    if (withTime) {
      opts.hour = "numeric";
      opts.minute = "2-digit";
    }
    return new Date(unix * 1000).toLocaleString(undefined, opts);
  }

  function dayLabel(isoDate) {
    // isoDate is a UTC calendar day; label it without shifting zones.
    return new Date(isoDate + "T12:00:00Z").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }

  function summary(monitors) {
    var active = monitors.filter(function (m) {
      return m.status !== "paused";
    });
    var down = active.filter(function (m) {
      return m.status === "down";
    }).length;
    var degraded = active.filter(function (m) {
      return m.status === "degraded";
    }).length;
    var box = el("div", "status-summary");
    var state = down ? "is-down" : degraded ? "is-warn" : "is-up";
    box.classList.add(state);
    var text = down
      ? down + " of " + active.length + " sites down"
      : degraded
        ? degraded + " of " + active.length + " sites degraded"
        : "All systems operational";
    box.appendChild(el("span", "status-dot " + state));
    box.appendChild(el("strong", null, text));
    return box;
  }

  function sparkline(points) {
    var wrap = el("div", "status-spark");
    if (!points || points.length < 2) return wrap;
    var w = 160;
    var h = 36;
    var values = points.map(function (p) {
      return p.ms;
    });
    var max = Math.max.apply(null, values);
    var min = Math.min.apply(null, values);
    var span = max - min || 1;
    var coords = points
      .map(function (p, i) {
        var x = (i / (points.length - 1)) * w;
        var y = h - 3 - ((p.ms - min) / span) * (h - 6);
        return x.toFixed(1) + "," + y.toFixed(1);
      })
      .join(" ");
    var chart = svg("svg", {
      viewBox: "0 0 " + w + " " + h,
      width: w,
      height: h,
      role: "img",
      "aria-label": "Response time over the last 24 hours, " + min + " to " + max + " ms",
    });
    chart.appendChild(svg("polyline", { points: coords, fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linejoin": "round" }));
    wrap.appendChild(chart);
    return wrap;
  }

  function history(days) {
    var bars = el("div", "status-days");
    var counted = days.filter(function (d) {
      return d.uptime != null;
    });
    bars.setAttribute("role", "img");
    bars.setAttribute(
      "aria-label",
      counted.length
        ? "Daily uptime for the last " + counted.length + " days with data"
        : "No daily uptime data yet",
    );
    days.forEach(function (d) {
      var bar = el("span", "status-day " + dayClass(d.uptime));
      bar.title = dayLabel(d.date) + ": " + (d.uptime == null ? "no data" : pct(d.uptime) + " uptime");
      bars.appendChild(bar);
    });
    return bars;
  }

  function stat(label, value) {
    var box = el("div", "status-stat");
    box.appendChild(el("span", "status-stat-value", value));
    box.appendChild(el("span", "status-stat-label", label));
    return box;
  }

  function monitorCard(m) {
    var card = el("article", "status-card is-" + m.status);
    var head = el("div", "status-card-head");
    var name = el("div", "status-card-name");
    name.appendChild(el("h2", null, m.name));
    if (m.host) {
      var host = el(m.url ? "a" : "span", "status-host", m.host);
      if (m.url) {
        host.href = m.url;
        host.target = "_blank";
        host.rel = "noopener noreferrer";
        host.setAttribute("aria-label", m.host + " (opens in a new tab)");
      }
      name.appendChild(host);
    }
    head.appendChild(name);
    var badge = el("span", "status-badge is-" + m.status);
    badge.appendChild(el("span", "status-dot is-" + m.status));
    badge.appendChild(document.createTextNode(LABELS[m.status] || m.status));
    head.appendChild(badge);
    card.appendChild(head);

    card.appendChild(history(m.days));
    // Phones show only the last 30 bars (CSS), so the label has a short form.
    var scale = el("div", "status-days-scale");
    var from = el("span");
    from.appendChild(el("span", "status-scale-long", m.days.length + " days ago"));
    from.appendChild(el("span", "status-scale-short", Math.min(30, m.days.length) + " days ago"));
    scale.appendChild(from);
    scale.appendChild(el("span", null, "Today"));
    card.appendChild(scale);

    var stats = el("div", "status-stats");
    stats.appendChild(stat("24 hours", pct(m.uptime.day)));
    stats.appendChild(stat("7 days", pct(m.uptime.week)));
    stats.appendChild(stat("30 days", pct(m.uptime.month)));
    stats.appendChild(stat("90 days", pct(m.uptime.quarter)));
    var rt = stat("Avg response", m.avgResponseMs == null ? "-" : m.avgResponseMs + " ms");
    rt.classList.add("status-stat-rt");
    rt.appendChild(sparkline(m.responseTimes));
    stats.appendChild(rt);
    card.appendChild(stats);
    return card;
  }

  function incidents(monitors) {
    var section = el("section", "status-incidents");
    section.appendChild(el("h2", null, "Recent incidents"));
    var rows = [];
    monitors.forEach(function (m) {
      (m.incidents || []).forEach(function (i) {
        rows.push({ name: m.name, start: i.start, duration: i.duration, reason: i.reason });
      });
    });
    rows.sort(function (a, b) {
      return b.start - a.start;
    });
    if (!rows.length) {
      section.appendChild(el("p", "status-empty", "No downtime recorded in the last 90 days."));
      return section;
    }
    var list = el("ul", "status-incident-list");
    rows.slice(0, 20).forEach(function (r) {
      var li = el("li");
      li.appendChild(el("strong", null, r.name));
      li.appendChild(el("span", null, "Down " + duration(r.duration) + (r.reason ? " - " + r.reason : "")));
      li.appendChild(el("time", null, when(r.start, true)));
      li.lastChild.setAttribute("datetime", new Date(r.start * 1000).toISOString());
      list.appendChild(li);
    });
    section.appendChild(list);
    return section;
  }

  function render(data) {
    var frag = document.createDocumentFragment();
    frag.appendChild(summary(data.monitors));
    var list = el("div", "status-list");
    data.monitors.forEach(function (m) {
      list.appendChild(monitorCard(m));
    });
    frag.appendChild(list);
    frag.appendChild(incidents(data.monitors));
    var intervals = data.monitors
      .map(function (m) {
        return m.interval;
      })
      .filter(Boolean);
    var minutes = intervals.length ? Math.round(Math.min.apply(null, intervals) / 60) : 5;
    var note =
      "Each site is checked every " +
      minutes +
      " minutes. Daily bars use UTC days. Last updated " +
      when(data.updated, true) +
      (data.stale ? " (showing the last saved data while live data reloads)" : "") +
      ". This page refreshes every minute.";
    frag.appendChild(el("p", "status-note", note));
    app.replaceChildren(frag);
    app.setAttribute("aria-busy", "false");
  }

  function fail() {
    // Keep the last good render on screen if there is one.
    if (app.querySelector(".status-list")) return;
    app.replaceChildren(el("p", "status-error", "Status data couldn't be loaded. Try again in a minute."));
    app.setAttribute("aria-busy", "false");
  }

  function load() {
    fetch("/api/status", { headers: { accept: "application/json" } })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.monitors) throw new Error("no data");
        render(data);
      })
      .catch(fail);
  }

  load();
  setInterval(load, REFRESH_MS);
})();
