/*
 * Homepage reliability band: swaps the band's static fallback text for the
 * live count from /api/status (functions/api/status.js, cached 60 seconds).
 * The request waits until the band is near the viewport so visitors who
 * never scroll that far don't trigger it. If it fails, the static text
 * stays and the band still links to /status.
 */
(function () {
  "use strict";

  var band = document.querySelector(".reliability-band");
  if (!band || !window.fetch) return;
  var headline = band.querySelector("[data-status-headline]");
  var detail = band.querySelector("[data-status-detail]");

  function render(data) {
    var active = data.monitors.filter(function (m) {
      return m.status !== "paused";
    });
    if (!active.length) return;
    var up = active.filter(function (m) {
      return m.status === "up";
    }).length;
    var down = active.filter(function (m) {
      return m.status === "down";
    }).length;
    band.classList.add(up === active.length ? "is-up" : down ? "is-down" : "is-warn");
    headline.textContent =
      up === active.length
        ? "All " + active.length + " sites operational right now"
        : up + " of " + active.length + " sites operational right now";
    var minutes = Math.round(
      Math.min.apply(
        null,
        active.map(function (m) {
          return m.interval || 300;
        }),
      ) / 60,
    );
    detail.textContent =
      "The sites Scott Labz runs and supports, checked every " + minutes + " minutes.";
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
