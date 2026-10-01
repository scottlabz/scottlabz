/*
 * Website Grant - keeps the cycle year current on website-grant.html,
 * in the .grant-callout blocks that link to it, and on the grant
 * version of the thank-you page.
 *
 * Each grant cycle is named for the year its applications close:
 * applications close March 31, winners are announced May 1, and
 * sites launch by July 31. From April 1 on, the page rolls forward
 * to the next cycle, so the 2027 grant becomes the 2028 grant on
 * April 1, 2027 with no edits.
 *
 * The HTML ships with the current year filled in, so visitors without
 * JavaScript (and the first paint) still see a sensible page. This only
 * replaces the year when the cycle has rolled over.
 *
 * Markup hooks:
 *   [data-grant-year]        text set to the cycle year (e.g. 2028)
 *   [data-grant-next-year]   text set to the year after that (e.g. 2029)
 *   time[data-grant-date]    datetime set to "<year>-<value>", where the
 *                            value is "03-31", "04", "05-01", etc.
 *   input[data-grant-subject] value set to "Website Grant application (<year>)"
 *
 * External file because the site's CSP only allows a fixed set of
 * inline-script hashes.
 */
(function () {
  // Deadlines are in Central time, so compute "today" there rather than
  // in the visitor's own time zone.
  function centralToday() {
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        year: "numeric",
        month: "numeric",
        day: "numeric",
      }).formatToParts(new Date());
      var get = function (type) {
        for (var i = 0; i < parts.length; i++) {
          if (parts[i].type === type) return parseInt(parts[i].value, 10);
        }
        return 0;
      };
      return { y: get("year"), m: get("month"), d: get("day") };
    } catch (e) {
      var now = new Date();
      return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
    }
  }

  var t = centralToday();
  // Through March 31 the cycle closing this year is still open;
  // from April 1 applications go to next year's cycle.
  var CLOSE_MONTH = 3;
  var CLOSE_DAY = 31;
  var year = t.m <= CLOSE_MONTH ? t.y : t.y + 1;

  function each(selector, fn) {
    var els = document.querySelectorAll(selector);
    for (var i = 0; i < els.length; i++) fn(els[i]);
  }

  each("[data-grant-year]", function (el) {
    el.textContent = String(year);
  });
  each("[data-grant-next-year]", function (el) {
    el.textContent = String(year + 1);
  });
  each("time[data-grant-date]", function (el) {
    el.setAttribute("datetime", year + "-" + el.getAttribute("data-grant-date"));
  });
  each("input[data-grant-subject]", function (el) {
    el.value = "Website Grant application (" + year + ")";
  });

  // Countdown in the final 3 weeks: "- 12 days left" after the status
  // line, "- last day to apply" on March 31. Hidden the rest of the year.
  var DAY = 86400000;
  var daysLeft = Math.round(
    (Date.UTC(year, CLOSE_MONTH - 1, CLOSE_DAY) - Date.UTC(t.y, t.m - 1, t.d)) / DAY
  );
  each("[data-grant-countdown]", function (el) {
    if (daysLeft < 0 || daysLeft > 21) return;
    el.textContent =
      daysLeft === 0
        ? " - last day to apply"
        : " - " + daysLeft + (daysLeft === 1 ? " day left" : " days left");
    el.hidden = false;
  });
})();
