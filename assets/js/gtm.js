(function (w, d, s, l, i) {
  w[l] = w[l] || [];
  w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  function load() {
    var f = d.getElementsByTagName(s)[0],
      j = d.createElement(s),
      dl = l != "dataLayer" ? "&l=" + l : "";
    j.async = true;
    j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
    f.parentNode.insertBefore(j, f);
  }
  function whenIdle() {
    if ("requestIdleCallback" in w) {
      w.requestIdleCallback(load, { timeout: 2000 });
    } else {
      setTimeout(load, 1);
    }
  }
  if (d.readyState === "complete") {
    whenIdle();
  } else {
    w.addEventListener("load", whenIdle, { once: true });
  }
})(window, document, "script", "dataLayer", "GTM-TTDLMNPL");

/*
 * Click data layer - one named dataLayer event for every meaningful click
 * on the site, for GTM to forward to GA4. Full reference, including the
 * GTM and GA4 setup: ANALYTICS-README.md.
 *
 * Why it lives here and not in GTM: the site's CSP has no 'unsafe-inline'
 * or 'unsafe-eval' for scripts, so GTM Custom HTML tags and Custom
 * JavaScript variables can't run. The classification happens in this
 * same-origin file; GTM only maps the pushed values (one trigger, one GA4
 * event tag, Data Layer Variables - none of which need custom code). Every
 * page that loads GTM loads this file, so new pages are covered
 * automatically.
 *
 * Events (first match wins):
 *   diagnostic_answer   answer buttons in the Diagnostics games
 *   filter_click        pills / "Clear filters" in <scott-filter-bar>
 *   faq_toggle          <summary> of a <details> (FAQ accordions)
 *   form_submit_click   submit buttons (attempt; the conversion is the
 *                       /thank-you page view)
 *   contact_click       mailto: and tel: links
 *   file_download       links to documents (pdf, zip, docx, ...)
 *   outbound_click      links to another domain
 *   jump_link_click     same-page #anchor links
 *   nav_click           links in <scott-nav>
 *   footer_click        internal links in <scott-footer>
 *   cta_click           internal links styled as buttons, or to /contact
 *   content_click       every other internal link
 *   button_click        every other button
 *
 * Every push carries the same keys (unused ones are undefined, which
 * clears the previous click's value in GTM's data model):
 *   click_text, click_url, click_path, click_domain, link_type,
 *   click_section, click_element, click_id, click_action, click_context,
 *   destination_group, page_group
 *
 * Per-element overrides (on the element or any ancestor):
 *   data-analytics-event="custom_name"   force the event name
 *   data-analytics-text="Label"          force click_text
 *   data-analytics-section="name"        force click_section
 *   data-analytics-ignore                don't track
 */
(function (w, d) {
  var ACTIONABLE =
    'a[href], button, summary, input[type="submit"], input[type="button"], [role="button"], [role="link"]';
  var DOWNLOAD_RE = /\.(pdf|zip|docx?|xlsx?|pptx?|csv|txt|vcf|ics|dmg|exe)$/i;
  var HOST = w.location.hostname.replace(/^www\./, "");

  function clean(text, max) {
    if (text == null) return undefined;
    var t = String(text).replace(/\s+/g, " ").trim();
    return t ? t.slice(0, max || 100) : undefined;
  }

  // snake_case, at most 40 characters, cut at a word boundary
  function slug(text) {
    var t = clean(text, 200);
    if (!t) return undefined;
    t = t
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (t.length > 40) t = t.slice(0, 41).replace(/_[^_]*$/, "");
    return t || undefined;
  }

  // Content group for a site path: where a page sits, or where a link goes
  function groupFor(path) {
    var p = (path || "/").replace(/\.html$/, "").replace(/\/index$/, "/");
    if (p === "/" || p === "") return "home";
    var rules = [
      [/^\/field-notes\/topics\//, "field_notes_topic"],
      [/^\/field-notes\/?$|^\/field-notes\/page\//, "field_notes_hub"],
      [/^\/field-notes\//, "field_note"],
      [/^\/insights\/?$/, "insights_hub"],
      [/^\/insights\//, "insight"],
      [/^\/signals\/?$/, "signals_hub"],
      [/^\/signals\//, "signal"],
      [/^\/case-studies\/?$/, "case_studies_hub"],
      [/^\/case-studies\//, "case_study"],
      [/^\/diagnostics\//, "diagnostics"],
      [/^\/markets\//, "market"],
      [/^\/trust\/|^\/legal$|^\/security-trust$/, "legal"],
      [/^\/(services|analytics-data|web-digital|conversion-optimization|advertising-media-buying)$/, "service"],
      [/^\/(about|founder|clients|why-us|industries|find-us|bbb)$/, "about"],
      [/^\/contact$/, "contact"],
      [/^\/thank-you$/, "thank_you"],
      [/^\/website-grant/, "website_grant"],
      [/^\/(faq|landing)$/, "other"],
    ];
    for (var k = 0; k < rules.length; k++) {
      if (rules[k][0].test(p)) return rules[k][1];
    }
    return "other";
  }

  // First matching ancestor, crossing out of open shadow roots
  function closest(el, selector) {
    while (el) {
      if (el.nodeType === 1 && el.matches(selector)) return el;
      el = el.parentNode || el.host;
    }
    return null;
  }

  function attrFrom(el, name) {
    var hit = closest(el, "[" + name + "]");
    return hit ? hit.getAttribute(name) : null;
  }

  // Page region: an explicit override, a shared component, the hero, or
  // the nearest section/article whose own heading is an h1/h2 (so a tile
  // with only an h3 reports the section it sits in).
  function sectionFor(el) {
    var forced = attrFrom(el, "data-analytics-section");
    if (forced) return slug(forced);
    if (closest(el, "scott-nav")) return "nav";
    if (closest(el, "scott-footer")) return "footer";
    if (closest(el, "scott-filter-bar")) return "filter_bar";
    if (closest(el, ".banner, .grant-hero")) return "hero";
    var node = el;
    while (node) {
      if (node.nodeType === 1 && /^(SECTION|ARTICLE|ASIDE|HEADER|NAV)$/.test(node.tagName)) {
        var h = node.querySelector("h1, h2");
        if (h) return slug(h.textContent);
      }
      node = node.parentNode || node.host;
    }
    return "body";
  }

  // Label for the clicked element. textContent (not innerText) keeps the
  // authored case rather than CSS uppercase; a card's headline beats its
  // whole text.
  function textFor(el) {
    var forced = attrFrom(el, "data-analytics-text");
    if (forced) return clean(forced);
    var heading = el.querySelector && el.querySelector("h1, h2, h3, h4");
    var img = el.querySelector && el.querySelector("img[alt]");
    return (
      clean(el.getAttribute("aria-label")) ||
      (heading && clean(heading.textContent)) ||
      clean(el.textContent) ||
      clean(el.getAttribute("title")) ||
      (img && clean(img.getAttribute("alt"))) ||
      clean(el.value)
    );
  }

  // Only the element's own text nodes (skips child badges and counts)
  function ownText(el) {
    var t = "";
    for (var k = 0; k < el.childNodes.length; k++) {
      if (el.childNodes[k].nodeType === 3) t += el.childNodes[k].nodeValue;
    }
    return clean(t);
  }

  function isButtonStyled(a) {
    return !!(
      (a.className && /\bbutton\b/.test(a.className)) ||
      a.querySelector(".button")
    );
  }

  function classify(el, e) {
    var data = {
      event: undefined,
      click_text: textFor(el),
      click_url: undefined,
      click_path: undefined,
      click_domain: undefined,
      link_type: undefined,
      click_section: sectionFor(el),
      click_element: el.tagName.toLowerCase(),
      click_id: el.id || undefined,
      click_action: undefined,
      click_context: undefined,
      destination_group: undefined,
      page_group: groupFor(w.location.pathname),
    };

    // Links
    if (el.tagName === "A" && el.hasAttribute("href")) {
      var raw = el.getAttribute("href");
      var url;
      try {
        url = new URL(raw, w.location.href);
      } catch (err) {
        return null;
      }
      data.click_url = url.href.slice(0, 100);
      if (url.protocol === "mailto:" || url.protocol === "tel:") {
        data.link_type = url.protocol === "mailto:" ? "email" : "phone";
        data.click_action = data.link_type;
        data.event = "contact_click";
        return data;
      }
      var host = url.hostname.replace(/^www\./, "");
      data.click_domain = host;
      if (host !== HOST) {
        data.link_type = "external";
        data.event = "outbound_click";
        return data;
      }
      data.click_path = url.pathname.slice(0, 100);
      if (DOWNLOAD_RE.test(url.pathname)) {
        data.link_type = "download";
        data.click_context = url.pathname.split("/").pop();
        data.event = "file_download";
        return data;
      }
      var samePage =
        url.pathname.replace(/\.html$/, "") === w.location.pathname.replace(/\.html$/, "");
      if (url.hash && samePage) {
        data.link_type = "anchor";
        data.click_context = url.hash.slice(1);
        data.event = "jump_link_click";
        return data;
      }
      data.link_type = "internal";
      data.destination_group = groupFor(url.pathname);
      if (data.click_section === "nav") data.event = "nav_click";
      else if (data.click_section === "footer") data.event = "footer_click";
      else if (isButtonStyled(el) || data.destination_group === "contact") data.event = "cta_click";
      else data.event = "content_click";
      return data;
    }

    // FAQ accordions: report the state the click moves to
    if (el.tagName === "SUMMARY") {
      var details = el.parentNode;
      data.click_action = details && details.open ? "close" : "open";
      data.event = "faq_toggle";
      return data;
    }

    // Filter bar (inside its shadow root)
    if (closest(el, "scott-filter-bar")) {
      data.click_text = ownText(el) || data.click_text;
      data.click_action = el.classList.contains("ff-clear") ? "clear" : "select";
      data.click_context = el.getAttribute("data-filter") || undefined;
      data.event = "filter_click";
      return data;
    }

    // Diagnostics games: answer choices (not the "Next case" button)
    if (closest(el, "#choices") && !el.classList.contains("next")) {
      var title = d.getElementById("title");
      data.click_context = title ? clean(title.textContent) : undefined;
      data.click_section = "case_file";
      data.event = "diagnostic_answer";
      return data;
    }

    // A <button> with no type reports "submit" even outside a form, so
    // only count it when it actually belongs to one
    if (el.type === "submit" && el.form) {
      var form = el.form;
      data.click_context = form.id || form.getAttribute("name") || data.page_group + "_form";
      data.event = "form_submit_click";
      return data;
    }

    data.event = "button_click";
    return data;
  }

  function push(data) {
    (w.dataLayer = w.dataLayer || []).push(data);
  }

  function onClick(e) {
    // Primary clicks, plus middle-clicks on links (open in new tab)
    if (e.type === "auxclick" && e.button !== 1) return;
    var path = e.composedPath ? e.composedPath() : [e.target];
    var el = null;
    for (var k = 0; k < path.length; k++) {
      var n = path[k];
      if (n.nodeType === 1 && n.matches && n.matches(ACTIONABLE)) {
        el = n;
        break;
      }
    }
    if (!el || closest(el, "[data-analytics-ignore]")) return;
    if (e.type === "auxclick" && el.tagName !== "A") return;
    var data;
    try {
      data = classify(el, e);
    } catch (err) {
      return; // tracking must never break a click
    }
    if (!data) return;
    var forced = attrFrom(el, "data-analytics-event");
    if (forced) data.event = slug(forced);
    if (data.event === "diagnostic_answer") {
      // The game marks the answer right/wrong in its own click handler,
      // which runs after this capture-phase listener
      setTimeout(function () {
        data.click_action = el.classList.contains("correct")
          ? "correct"
          : el.classList.contains("wrong")
            ? "wrong"
            : undefined;
        push(data);
      }, 0);
      return;
    }
    push(data);
  }

  // Capture phase, so clicks still count when a handler stops propagation
  d.addEventListener("click", onClick, true);
  d.addEventListener("auxclick", onClick, true);
})(window, document);
