/*
 * Diagnostics "How it works" guide - shared by the four crime-scene pages.
 *
 * Adds a "How it works" button to the page header and a three-step dialog
 * (pick a case, read the evidence, name the culprit) with Back / Next and a
 * final "Start investigating" that closes it. It opens by itself the first
 * time someone visits any of the pages; after that only the button opens it.
 *
 * Lives in an external file because the site's CSP only allows a fixed set
 * of inline-script hashes. Styles are injected here (style-src permits
 * inline) and read the page's own color variables, with fallbacks.
 */
(function () {
  var SEEN_KEY = "sl-diagnostics-guide-seen";

  var STEPS = [
    {
      title: "Pick a case file",
      text:
        "Choose a case from the Case Files list. Each one is a simulated failure with a single hidden root cause. Use Prev and Next to page through all 32 - on a phone, swipe the list sideways.",
    },
    {
      title: "Read the evidence",
      text:
        "Work through the evidence panels for that case. Look for the mismatch between what should happen and what actually happens - that gap is where the culprit hides.",
    },
    {
      title: "Name the culprit",
      text:
        "Under Identify the Culprit, pick the root cause. The right answer closes the case, shows the full report, and adds 100 to your forensic score. A wrong pick costs 10, so read the hint under the choices if you get stuck.",
    },
  ];

  var CSS =
    ".slg-open-btn{display:inline-flex;align-items:center;gap:6px;background:transparent;color:var(--cyan,#5de0ff);border:1px solid var(--line,#263441);padding:7px 12px;border-radius:4px;cursor:pointer;font:800 11px ui-monospace,monospace;letter-spacing:.05em}" +
    ".slg-open-btn:hover{border-color:var(--cyan,#5de0ff);color:#fff}" +
    // The header is already tight on phones, so the button shrinks to "?".
    ".slg-open-btn{white-space:nowrap}@media (max-width:600px){.slg-open-btn .slg-label{display:none}.slg-open-btn{padding:7px 11px}}" +
    ".slg-open-btn:focus-visible,.slg-btn:focus-visible,.slg-x:focus-visible{outline:2px solid var(--cyan,#5de0ff);outline-offset:2px}" +
    ".slg-backdrop{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(3,6,10,.78);animation:slg-fade .15s ease-out}" +
    ".slg-dialog{position:relative;width:min(460px,100%);background:var(--p,#0d141c);color:var(--txt,#e8eef5);border:1px solid var(--line,#263441);border-top:3px solid var(--cyan,#5de0ff);border-radius:6px;padding:26px 24px 20px;box-shadow:0 20px 50px rgba(0,0,0,.55);font-family:Inter,system-ui,sans-serif}" +
    ".slg-eyebrow{font:11px ui-monospace,monospace;letter-spacing:.17em;color:var(--cyan,#5de0ff);margin:0 0 14px}" +
    ".slg-step{display:grid;grid-template-columns:44px 1fr;gap:14px;align-items:start;min-height:150px}" +
    ".slg-num{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid var(--cyan,#5de0ff);color:var(--cyan,#5de0ff);font:800 18px ui-monospace,monospace}" +
    ".slg-title{margin:4px 0 8px;font-size:20px;letter-spacing:-.02em}" +
    ".slg-text{margin:0;color:#9ba8b5;font-size:14px;line-height:1.6}" +
    ".slg-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px;padding-top:16px;border-top:1px solid var(--line,#263441)}" +
    ".slg-dots{display:flex;gap:6px}.slg-dot{width:8px;height:8px;border-radius:50%;background:var(--line,#263441)}.slg-dot.on{background:var(--cyan,#5de0ff)}" +
    ".slg-actions{display:flex;gap:8px}" +
    ".slg-btn{border:1px solid var(--line,#263441);background:transparent;color:#c8d3dd;padding:9px 14px;border-radius:4px;cursor:pointer;font:800 11px ui-monospace,monospace;letter-spacing:.05em}" +
    ".slg-btn:hover{border-color:#526677;color:#fff}" +
    ".slg-btn.primary{background:var(--accent,#2563eb);border-color:var(--accent,#2563eb);color:#fff}.slg-btn.primary:hover{filter:brightness(1.1)}" +
    ".slg-btn[hidden]{display:none}" +
    ".slg-x{position:absolute;top:10px;right:10px;width:32px;height:32px;border:0;background:transparent;color:#7d8b99;font-size:22px;line-height:1;cursor:pointer;border-radius:4px}.slg-x:hover{color:#fff}" +
    "@keyframes slg-fade{from{opacity:0}to{opacity:1}}" +
    "@media (prefers-reduced-motion:reduce){.slg-backdrop{animation:none}}";

  var step = 0,
    backdrop,
    lastFocus,
    els = {};

  function markSeen() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch (e) {}
  }

  function seenBefore() {
    try {
      return localStorage.getItem(SEEN_KEY) === "1";
    } catch (e) {
      // Storage blocked: skip the auto-open rather than show it on every visit.
      return true;
    }
  }

  function render() {
    var s = STEPS[step],
      last = step === STEPS.length - 1;
    els.count.textContent = "STEP " + (step + 1) + " OF " + STEPS.length;
    els.num.textContent = String(step + 1);
    els.title.textContent = s.title;
    els.text.textContent = s.text;
    els.back.hidden = step === 0;
    els.next.textContent = last ? "START INVESTIGATING" : "NEXT →";
    els.dots.forEach(function (d, i) {
      d.className = "slg-dot" + (i === step ? " on" : "");
    });
  }

  function build() {
    backdrop = document.createElement("div");
    backdrop.className = "slg-backdrop";
    backdrop.innerHTML =
      '<div class="slg-dialog" role="dialog" aria-modal="true" aria-labelledby="slg-title" aria-describedby="slg-text">' +
      '<button type="button" class="slg-x" aria-label="Close">×</button>' +
      '<p class="slg-eyebrow" id="slg-count"></p>' +
      '<div class="slg-step" aria-live="polite">' +
      '<div class="slg-num" aria-hidden="true"></div>' +
      '<div><h2 class="slg-title" id="slg-title"></h2><p class="slg-text" id="slg-text"></p></div>' +
      "</div>" +
      '<div class="slg-foot"><div class="slg-dots" aria-hidden="true">' +
      STEPS.map(function () {
        return '<span class="slg-dot"></span>';
      }).join("") +
      '</div><div class="slg-actions"><button type="button" class="slg-btn" data-act="back">← BACK</button>' +
      '<button type="button" class="slg-btn primary" data-act="next"></button></div></div>' +
      "</div>";
    els.dialog = backdrop.querySelector(".slg-dialog");
    els.count = backdrop.querySelector("#slg-count");
    els.num = backdrop.querySelector(".slg-num");
    els.title = backdrop.querySelector("#slg-title");
    els.text = backdrop.querySelector("#slg-text");
    els.back = backdrop.querySelector('[data-act="back"]');
    els.next = backdrop.querySelector('[data-act="next"]');
    els.close = backdrop.querySelector(".slg-x");
    els.dots = Array.prototype.slice.call(backdrop.querySelectorAll(".slg-dot"));

    els.back.addEventListener("click", function () {
      if (step > 0) {
        step--;
        render();
        // Back hides itself on step 1; don't leave focus on a hidden button.
        if (els.back.hidden) els.next.focus();
      }
    });
    els.next.addEventListener("click", function () {
      if (step < STEPS.length - 1) {
        step++;
        render();
      } else {
        close();
      }
    });
    els.close.addEventListener("click", close);
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) close();
    });
    backdrop.addEventListener("keydown", onKey);
  }

  function focusables() {
    return Array.prototype.filter.call(els.dialog.querySelectorAll("button"), function (b) {
      return !b.hidden;
    });
  }

  function onKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      // Keep keyboard focus inside the dialog while it is open.
      var f = focusables(),
        first = f[0],
        last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function open() {
    if (!backdrop) build();
    if (backdrop.parentNode) return;
    lastFocus = document.activeElement;
    step = 0;
    render();
    document.body.appendChild(backdrop);
    document.documentElement.style.overflow = "hidden";
    els.next.focus();
  }

  function close() {
    if (!backdrop || !backdrop.parentNode) return;
    backdrop.parentNode.removeChild(backdrop);
    document.documentElement.style.overflow = "";
    markSeen();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function init() {
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    // Header button: sits beside the "Diagnostics" back link.
    var anchor = document.querySelector(".top .backlink");
    if (anchor && anchor.parentNode) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slg-open-btn";
      btn.setAttribute("aria-haspopup", "dialog");
      btn.setAttribute("aria-label", "How it works");
      btn.innerHTML = '<span aria-hidden="true">?</span><span class="slg-label" aria-hidden="true">HOW IT WORKS</span>';
      btn.addEventListener("click", open);
      anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    }

    if (!seenBefore()) open();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
