/*
 * Homepage reliability band: colors each listed site's dot and swaps the
 * band's static fallback text for a live count, from /api/status
 * (functions/api/status.js, cached 60 seconds).
 *
 * Only the monitors named in the band's data-monitors attribute are shown
 * and counted (names as on the monitoring account, separated by "|");
 * /status shows every monitor. The request waits until the band is near
 * the viewport, and if it fails the static text stays and the band still
 * links to /status.
 */
(function () {
  "use strict";

  var band = document.querySelector(".reliability-band");
  if (!band || !window.fetch) return;
  var headline = band.querySelector("[data-status-headline]");
  var detail = band.querySelector("[data-status-detail]");
  var chips = band.querySelectorAll(".reliability-site");
  var wanted = (band.getAttribute("data-monitors") || "").split("|").map(function (name) {
    return name.trim();
  });

  function stateOf(status) {
    return status === "up" ? "is-up" : status === "down" ? "is-down" : "is-warn";
  }

  function render(data) {
    var byName = {};
    data.monitors.forEach(function (m) {
      byName[m.name] = m;
    });
    var shown = [];
    wanted.forEach(function (name, i) {
      var m = byName[name];
      if (!m || m.status === "paused") return;
      shown.push(m);
      if (chips[i]) chips[i].classList.add(stateOf(m.status));
    });
    if (!shown.length) return;

    var up = shown.filter(function (m) {
      return m.status === "up";
    }).length;
    var down = shown.filter(function (m) {
      return m.status === "down";
    }).length;
    band.classList.add(up === shown.length ? "is-up" : down ? "is-down" : "is-warn");
    headline.textContent =
      up === shown.length
        ? "All " + shown.length + " sites operational right now"
        : up + " of " + shown.length + " sites operational right now";
    var minutes = Math.round(
      Math.min.apply(
        null,
        shown.map(function (m) {
          return m.interval || 300;
        }),
      ) / 60,
    );
    detail.textContent = "Client storefronts and this site, checked every " + minutes + " minutes.";
  }

  function load() {
    fetch("/api/status", { headers: { accept: "application/json" } })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data && data.monitors) render(data);
      })
      .catch(function () {});
  }

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(band);
  } else {
    load();
  }
})();
