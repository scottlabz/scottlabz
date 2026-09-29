/*
 * Diagnostics "How it works" tour - shared by the four crime-scene pages.
 *
 * Adds a "How it works" button to the page header and a three-step guided
 * tour. Each step dims the page, spotlights the real area it describes
 * (case list, evidence panels, answer choices), and anchors the step card
 * beside that area with an arrow pointing at it. Back / Next move between
 * steps; the last step's "Start investigating" ends the tour. It opens by
 * itself the first time someone visits any of the pages; after that only
 * the button opens it.
 *
 * Lives in an external file because the site's CSP only allows a fixed set
 * of inline-script hashes. Styles are injected here (style-src permits
 * inline) and read the page's own color variables, with fallbacks.
 */
(function () {
  var SEEN_KEY = "sl-diagnostics-guide-seen";

  var STEPS = [
    {
      target: ".sidebar",
      title: "Pick a case file",
      text:
        "Start here. Choose a case from the Case Files list - each one is a simulated failure with a single hidden root cause. Prev and Next page through all 32; on a phone, swipe the list sideways.",
    },
    {
      target: "#scene",
      title: "Read the evidence",
      text:
        "The case opens here. Work through each evidence panel and look for the mismatch between what should happen and what actually happens - that gap is where the culprit hides.",
    },
    {
      target: ".diagnose",
      title: "Name the culprit",
      text:
        "Then pick the root cause here. The right answer closes the case, shows the full report, and adds 100 to your forensic score. A wrong pick costs 10, so read the hint under the choices if you get stuck.",
    },
  ];

  var PAD = 8; // spotlight padding around the target
  var GAP = 16; // space between spotlight and card
  var EDGE = 12; // minimum distance from the viewport edge

  var CSS =
    ".slg-open-btn{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;background:transparent;color:var(--cyan,#5de0ff);border:1px solid var(--line,#263441);padding:7px 12px;border-radius:4px;cursor:pointer;font:800 11px ui-monospace,monospace;letter-spacing:.05em}" +
    ".slg-open-btn:hover{border-color:var(--cyan,#5de0ff);color:#fff}" +
    // The header is already tight on phones, so the button shrinks to "?".
    "@media (max-width:600px){.slg-open-btn .slg-label{display:none}.slg-open-btn{padding:7px 11px}}" +
    ".slg-open-btn:focus-visible,.slg-btn:focus-visible,.slg-x:focus-visible{outline:2px solid var(--cyan,#5de0ff);outline-offset:2px}" +
    // Transparent layer that catches clicks outside the card.
    ".slg-layer{position:fixed;inset:0;z-index:10000}" +
    // The spotlight: its huge shadow dims everything except the hole.
    ".slg-spot{position:fixed;z-index:10001;pointer-events:none;border:2px solid var(--cyan,#5de0ff);border-radius:6px;box-shadow:0 0 0 9999px rgba(3,6,10,.8),0 0 24px rgba(93,224,255,.35);transition:left .3s ease,top .3s ease,width .3s ease,height .3s ease}" +
    ".slg-card{position:fixed;z-index:10002;width:340px;max-width:calc(100vw - 24px);background:var(--p,#0d141c);color:var(--txt,#e8eef5);border:1px solid var(--line,#263441);border-top:3px solid var(--cyan,#5de0ff);border-radius:6px;padding:22px 20px 16px;box-shadow:0 20px 50px rgba(0,0,0,.6);font-family:Inter,system-ui,sans-serif;transition:left .3s ease,top .3s ease}" +
    ".slg-arrow{position:absolute;width:14px;height:14px;background:var(--p,#0d141c);transform:rotate(45deg)}" +
    ".slg-arrow[data-side=left]{left:-8px;border-left:1px solid var(--line,#263441);border-bottom:1px solid var(--line,#263441)}" +
    ".slg-arrow[data-side=right]{right:-8px;border-right:1px solid var(--line,#263441);border-top:1px solid var(--line,#263441)}" +
    ".slg-arrow[data-side=top]{top:-9px;background:var(--cyan,#5de0ff)}" +
    ".slg-arrow[data-side=bottom]{bottom:-8px;border-right:1px solid var(--line,#263441);border-bottom:1px solid var(--line,#263441)}" +
    ".slg-arrow[hidden]{display:none}" +
    ".slg-eyebrow{font:11px ui-monospace,monospace;letter-spacing:.17em;color:var(--cyan,#5de0ff);margin:0 0 12px}" +
    ".slg-step{display:grid;grid-template-columns:36px 1fr;gap:12px;align-items:start}" +
    ".slg-num{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid var(--cyan,#5de0ff);color:var(--cyan,#5de0ff);font:800 15px ui-monospace,monospace}" +
    ".slg-title{margin:2px 0 6px;font-size:18px;letter-spacing:-.02em}" +
    ".slg-text{margin:0;color:#9ba8b5;font-size:13.5px;line-height:1.6}" +
    ".slg-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line,#263441)}" +
    ".slg-dots{display:flex;gap:6px}.slg-dot{width:8px;height:8px;border-radius:50%;background:var(--line,#263441)}.slg-dot.on{background:var(--cyan,#5de0ff)}" +
    ".slg-actions{display:flex;gap:8px}" +
    ".slg-btn{border:1px solid var(--line,#263441);background:transparent;color:#c8d3dd;padding:9px 12px;border-radius:4px;cursor:pointer;font:800 11px ui-monospace,monospace;letter-spacing:.05em;white-space:nowrap}" +
    ".slg-btn:hover{border-color:#526677;color:#fff}" +
    ".slg-btn.primary{background:var(--accent,#2563eb);border-color:var(--accent,#2563eb);color:#fff}.slg-btn.primary:hover{filter:brightness(1.1)}" +
    ".slg-btn[hidden]{display:none}" +
    ".slg-x{position:absolute;top:8px;right:8px;width:30px;height:30px;border:0;background:transparent;color:#7d8b99;font-size:22px;line-height:1;cursor:pointer;border-radius:4px}.slg-x:hover{color:#fff}" +
    "@media (prefers-reduced-motion:reduce){.slg-spot,.slg-card{transition:none}}";

  var step = 0,
    open = false,
    lastFocus,
    savedScroll = 0,
    els = {};

  function reducedMotion() {
    return window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

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

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function build() {
    els.layer = document.createElement("div");
    els.layer.className = "slg-layer";
    els.spot = document.createElement("div");
    els.spot.className = "slg-spot";
    els.card = document.createElement("div");
    els.card.className = "slg-card";
    els.card.setAttribute("role", "dialog");
    els.card.setAttribute("aria-modal", "true");
    els.card.setAttribute("aria-labelledby", "slg-title");
    els.card.setAttribute("aria-describedby", "slg-text");
    els.card.innerHTML =
      '<span class="slg-arrow" aria-hidden="true"></span>' +
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
      '<button type="button" class="slg-btn primary" data-act="next"></button></div></div>';

    els.arrow = els.card.querySelector(".slg-arrow");
    els.count = els.card.querySelector("#slg-count");
    els.num = els.card.querySelector(".slg-num");
    els.title = els.card.querySelector("#slg-title");
    els.text = els.card.querySelector("#slg-text");
    els.back = els.card.querySelector('[data-act="back"]');
    els.next = els.card.querySelector('[data-act="next"]');
    els.close = els.card.querySelector(".slg-x");
    els.dots = Array.prototype.slice.call(els.card.querySelectorAll(".slg-dot"));

    els.back.addEventListener("click", function () {
      if (step > 0) go(step - 1);
      // Back hides itself on step 1; don't leave focus on a hidden button.
      if (els.back.hidden) els.next.focus();
    });
    els.next.addEventListener("click", function () {
      if (step < STEPS.length - 1) go(step + 1);
      else close();
    });
    els.close.addEventListener("click", close);
    els.layer.addEventListener("click", close);
    els.card.addEventListener("keydown", onKey);
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

  function target() {
    return document.querySelector(STEPS[step].target);
  }

  // Scroll the step's target into view, leaving room for the card on
  // narrow screens where it has to sit above or below the target.
  function scrollToTarget() {
    var t = target();
    if (!t) return;
    var r = t.getBoundingClientRect(),
      vw = window.innerWidth,
      vh = window.innerHeight,
      cw = els.card.offsetWidth,
      // Wide targets (and everything on phones) leave no room beside them,
      // so the card goes below and needs its own share of the screen.
      sideFits =
        vw >= 760 &&
        (r.right + PAD + GAP + cw <= vw - EDGE || r.left - PAD - GAP - cw >= EDGE),
      reserve = sideFits ? 0 : els.card.offsetHeight + GAP + PAD,
      y;
    if (r.height + reserve + 2 * EDGE <= vh) {
      // Fits with the card: center the pair.
      y = window.scrollY + r.top - (vh - r.height - reserve) / 2;
    } else {
      // Taller than the screen: show its top edge.
      y = window.scrollY + r.top - EDGE - PAD - 40;
    }
    window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
  }

  function position() {
    if (!open) return;
    var t = target(),
      vw = window.innerWidth,
      vh = window.innerHeight,
      cw = els.card.offsetWidth,
      ch = els.card.offsetHeight;

    if (!t) {
      // Target missing: center the card with no spotlight hole.
      setSpot(vw / 2, vh / 2, 0, 0);
      setCard((vw - cw) / 2, (vh - ch) / 2, null, 0);
      return;
    }

    var r = t.getBoundingClientRect();
    // Spotlight, clipped to the viewport so tall targets still read.
    var sx = clamp(r.left - PAD, 4, vw - 4),
      sy = clamp(r.top - PAD, 4, vh - 4),
      sr = clamp(r.right + PAD, 4, vw - 4),
      sb = clamp(r.bottom + PAD, 4, vh - 4);
    setSpot(sx, sy, sr - sx, sb - sy);

    var cx = (sx + sr) / 2,
      cy = (sy + sb) / 2,
      narrow = vw < 760,
      order = narrow ? ["bottom", "top"] : ["right", "left", "bottom", "top"],
      pick = null,
      x,
      y;

    for (var i = 0; i < order.length && !pick; i++) {
      var side = order[i];
      if (side === "right" && sr + GAP + cw <= vw - EDGE) {
        pick = side;
        x = sr + GAP;
        y = clamp(cy - ch / 2, EDGE, vh - ch - EDGE);
      } else if (side === "left" && sx - GAP - cw >= EDGE) {
        pick = side;
        x = sx - GAP - cw;
        y = clamp(cy - ch / 2, EDGE, vh - ch - EDGE);
      } else if (side === "bottom" && sb + GAP + ch <= vh - EDGE) {
        pick = side;
        y = sb + GAP;
        x = clamp(cx - cw / 2, EDGE, vw - cw - EDGE);
      } else if (side === "top" && sy - GAP - ch >= EDGE) {
        pick = side;
        y = sy - GAP - ch;
        x = clamp(cx - cw / 2, EDGE, vw - cw - EDGE);
      }
    }

    if (!pick) {
      // The target is taller than the space left for the card: spotlight
      // just its top portion and put the card underneath, pointing up.
      sb = Math.max(sy + 80, vh - ch - GAP - EDGE);
      setSpot(sx, sy, sr - sx, sb - sy);
      cx = (sx + sr) / 2;
      x = clamp(cx - cw / 2, EDGE, vw - cw - EDGE);
      y = Math.min(sb + GAP, vh - ch - EDGE);
      pick = "bottom";
    }
    setCard(x, y, pick, pick === "right" || pick === "left" ? cy - y : cx - x);
  }

  function setSpot(x, y, w, h) {
    var s = els.spot.style;
    s.left = x + "px";
    s.top = y + "px";
    s.width = w + "px";
    s.height = h + "px";
  }

  // Place the card and aim its arrow at the target. `side` is where the
  // card sits relative to the target; the arrow goes on the opposite edge.
  function setCard(x, y, side, aim) {
    els.card.style.left = Math.round(x) + "px";
    els.card.style.top = Math.round(y) + "px";
    var a = els.arrow,
      cw = els.card.offsetWidth,
      ch = els.card.offsetHeight;
    a.style.left = a.style.top = "";
    var arrowSide = { right: "left", left: "right", bottom: "top", top: "bottom", overlay: "top" }[side];
    if (!arrowSide) {
      a.hidden = true;
      return;
    }
    a.hidden = false;
    a.setAttribute("data-side", arrowSide);
    if (arrowSide === "left" || arrowSide === "right") a.style.top = clamp(aim - 7, 14, ch - 28) + "px";
    else a.style.left = clamp(aim - 7, 14, cw - 28) + "px";
  }

  function go(n) {
    step = n;
    render();
    scrollToTarget();
    position();
  }

  function focusables() {
    return Array.prototype.filter.call(els.card.querySelectorAll("button"), function (b) {
      return !b.hidden;
    });
  }

  function onKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      // Keep keyboard focus inside the card while the tour is open.
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

  function onViewportChange() {
    position();
  }

  function start() {
    if (open) return;
    if (!els.card) build();
    open = true;
    lastFocus = document.activeElement;
    savedScroll = window.scrollY;
    // Temporary room below the page, so targets near the bottom can still
    // be scrolled high enough to fit the card underneath them.
    els.spacer = els.spacer || document.createElement("div");
    els.spacer.style.height = "100vh";
    document.body.appendChild(els.spacer);
    document.body.appendChild(els.layer);
    document.body.appendChild(els.spot);
    document.body.appendChild(els.card);
    // Scrolling is driven by the tour, so block the wheel/touch scroll
    // that would slide the page out from under the spotlight.
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("resize", onViewportChange);
    go(0);
    els.next.focus();
  }

  function close() {
    if (!open) return;
    open = false;
    [els.layer, els.spot, els.card, els.spacer].forEach(function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
    document.documentElement.style.overflow = "";
    window.removeEventListener("resize", onViewportChange);
    window.scrollTo({ top: savedScroll, behavior: reducedMotion() ? "auto" : "smooth" });
    markSeen();
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
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
      btn.addEventListener("click", start);
      anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    }

    // Wait for the case script to render the first case, so the evidence
    // and choices exist (and have their real size) before spotlighting them.
    if (!seenBefore()) {
      if (document.readyState === "complete") start();
      else window.addEventListener("load", start);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
