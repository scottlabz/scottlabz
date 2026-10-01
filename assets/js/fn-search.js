/*
 * Field Notes search - field-notes/index.html, its topic pages
 * (/field-notes/topics/*) and any older-notes pages (/field-notes/page/*).
 *
 * Searches every note, not just the cards on the current page, by
 * loading the manifest generate_indexes.py writes (field-notes.json).
 * Every word typed must appear in a note's title or summary. While a
 * search is active, the page's own cards, filter bar and pager are
 * hidden and matching notes are shown in #fn-results instead; clearing
 * the box brings the page back as it was.
 *
 * The search box ships with [hidden] and is revealed here, so visitors
 * without JavaScript just see the normal listing. External file because
 * the site's CSP only allows a fixed set of inline-script hashes (the
 * manifest fetch is same-origin, which connect-src 'self' allows).
 */
(function () {
  var box = document.querySelector(".fn-search");
  var input = document.getElementById("fn-q");
  var status = document.getElementById("fn-search-status");
  var results = document.getElementById("fn-results");
  if (!box || !input || !status || !results) return;

  // Everything the search temporarily hides
  var pageParts = [
    document.getElementById("fn-grid"),
    document.querySelector("scott-filter-bar"),
    document.querySelector(".fn-pager"),
  ].filter(Boolean);

  var notes = null;
  var loading = null;

  function load() {
    if (!loading) {
      loading = fetch("/field-notes/field-notes.json")
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          return r.json();
        })
        .then(function (data) {
          notes = data.notes.map(function (n) {
            n._text = (n.title + " " + n.summary).toLowerCase();
            return n;
          });
        })
        .catch(function () {
          loading = null;
          status.textContent = "Search isn't available right now.";
        });
    }
    return loading;
  }

  function card(n) {
    var a = document.createElement("a");
    a.className = "fn-card-link";
    a.href = "/field-notes/" + n.slug;
    var section = document.createElement("section");
    section.className = "section-block";
    section.style.setProperty("--accent", n.accent);
    var icon = document.createElement("i");
    icon.className = "fas fa-arrow-right fn-card-icon";
    var h2 = document.createElement("h2");
    h2.textContent = n.title;
    var p = document.createElement("p");
    p.textContent = n.summary;
    section.appendChild(icon);
    section.appendChild(h2);
    section.appendChild(p);
    a.appendChild(section);
    return a;
  }

  function show(searching) {
    pageParts.forEach(function (el) {
      el.hidden = searching;
    });
    results.hidden = !searching;
  }

  function run() {
    var q = input.value.trim().toLowerCase();
    if (!q) {
      results.textContent = "";
      status.textContent = "";
      show(false);
      return;
    }
    load().then(function () {
      if (!notes || input.value.trim().toLowerCase() !== q) return;
      var words = q.split(/\s+/);
      var hits = notes.filter(function (n) {
        return words.every(function (w) {
          return n._text.indexOf(w) !== -1;
        });
      });
      results.textContent = "";
      hits.forEach(function (n) {
        results.appendChild(card(n));
      });
      status.textContent =
        hits.length === 0
          ? "No notes match \"" + input.value.trim() + "\"."
          : hits.length + (hits.length === 1 ? " note matches" : " notes match") +
            " \"" + input.value.trim() + "\".";
      show(true);
    });
  }

  var timer = 0;
  input.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(run, 150);
  });
  // Start loading the manifest as soon as someone shows intent
  input.addEventListener("focus", load, { once: true });

  box.hidden = false;
})();
