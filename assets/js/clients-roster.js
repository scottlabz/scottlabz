/*
 * Client roster search - clients.html.
 *
 * <scott-filter-bar> narrows the roster by group (it hides chips with
 * .ff-hide); this adds a live text search on top (.rs-miss) and hides any
 * group or subgroup whose chips are all hidden, so no empty headings are
 * left behind. The search box ships with [hidden] and is revealed here,
 * so visitors without JavaScript just see the full list.
 *
 * External file because the site's CSP only allows a fixed set of
 * inline-script hashes.
 */
(function () {
  var roster = document.getElementById("roster");
  var box = document.querySelector(".roster-search");
  var input = document.getElementById("roster-q");
  var status = document.getElementById("roster-status");
  if (!roster || !box || !input) return;

  var chips = Array.prototype.slice.call(roster.querySelectorAll(".roster-chips li"));
  var groups = Array.prototype.slice.call(roster.querySelectorAll(".roster-subgroup, .roster-section"));

  // Match on the visible name only, ignoring the "Partner since" note and
  // differences in case or accents.
  function norm(s) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }
  chips.forEach(function (li) {
    li._name = norm(li.firstChild ? li.firstChild.textContent : li.textContent);
  });

  function shown(li) {
    return !li.classList.contains("ff-hide") && !li.classList.contains("rs-miss");
  }

  function refresh() {
    groups.forEach(function (g) {
      var any = Array.prototype.some.call(g.querySelectorAll(".roster-chips li"), shown);
      g.classList.toggle("rs-empty", !any);
    });
    var q = input.value.trim();
    var n = chips.filter(shown).length;
    status.textContent = q ? n + (n === 1 ? " match" : " matches") : "";
  }

  var pending = 0;
  function schedule() {
    if (pending) return;
    pending = requestAnimationFrame(function () {
      pending = 0;
      refresh();
    });
  }

  input.addEventListener("input", function () {
    var q = norm(input.value.trim());
    chips.forEach(function (li) {
      li.classList.toggle("rs-miss", !!q && li._name.indexOf(q) === -1);
    });
    schedule();
  });

  // The filter bar swaps classes after a short exit transition, so watch
  // the chips themselves rather than timing off its change event.
  new MutationObserver(schedule).observe(roster, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  box.hidden = false;
})();
