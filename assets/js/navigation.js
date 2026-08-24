/*
 * Scott Labz - Primary Navigation
 * <scott-nav></scott-nav>
 *
 * Architecture mirrors footer.js: a light-DOM HTMLElement subclass that
 * injects its own markup in connectedCallback() and registers as a
 * custom element. One deliberate departure from footer.js - this
 * component injects a scoped <style> block (once, site-wide) because
 * hover/focus states and the responsive layout need real CSS, which
 * inline style="" strings can't express. Everything is still one
 * self-contained file, same as the footer.
 *
 * Concept: each nav item is a bar in a small ascending bar chart -
 * an extension of the bar-chart "S" in the logo, not a generic menu.
 * Each item also carries its own accent color, so the set reads as a
 * distinct row of items even before any page is active. The current
 * page is always the tallest, filled bar, marked three separate ways
 * (fill, height, arrow marker + bold underlined label) so the "you
 * are here" cue never depends on color alone.
 *
 * Accessibility / older-user notes:
 * - No hover-only menus, no hamburger, no hidden items.
 * - Every item's clickable zone is a full column, even when its bar
 *   is visually short - the bar is decorative, the <a> is the real
 *   target.
 * - Labels are always visible text, never icon-only.
 * - Skip link is the first focusable element on the page.
 * - prefers-reduced-motion disables the grow/hide transitions, not
 *   the state changes themselves.
 *
 * Scroll behavior: the nav hides on scroll-down and reappears the
 * moment the user scrolls up even slightly (a "smart" sticky nav),
 * so it doesn't compete for space with page content on small screens
 * but is never more than one upward scroll away.
 */

class ScottNav extends HTMLElement {
  connectedCallback() {
    // Primary wayfinding only - the exhaustive list stays in the footer.
    // Each item's color is used even when it isn't the current page, so
    // the row reads as distinct items rather than a wall of navy.
    const items = [
      { href: "/index.html", label: "Home", height: 15, color: "#1e3a5f" },
      { href: "/services.html", label: "Services", height: 20, color: "#2563eb" },
      { href: "/case-studies.html", label: "Work", height: 25, color: "#ca8a04" },
      { href: "/insights.html", label: "Insights", height: 30, color: "#b45309" },
      { href: "/about.html", label: "About", height: 35, color: "#7c3aed" },
      { href: "/contact.html", label: "Contact", height: 40, color: "#15803d" },
    ];

    const currentPath =
      window.location.pathname.replace(/index\.html$/, "").replace(/\/$/, "") ||
      "/";

    // Most pages need id="main-content" added to their <main> for this to
    // work. A few pages already carry a different id that's referenced
    // elsewhere (e.g. contact.html's id="contact", or #first used by
    // existing smooth-scroll buttons) - for those, set skip-target
    // instead of touching the existing id:
    //   <scott-nav skip-target="#first"></scott-nav>
    const skipTarget = this.getAttribute("skip-target") || "#main-content";

    const normalize = (href) =>
      href.replace(/index\.html$/, "").replace(/\/$/, "") || "/";

    // Style is injected once, even if <scott-nav> somehow appears twice.
    if (!document.getElementById("scott-nav-style")) {
      const style = document.createElement("style");
      style.id = "scott-nav-style";
      style.textContent = `
        .sl-skip-link {
          position: absolute;
          left: -9999px;
          top: 0;
          background: #1e3a5f;
          color: #fff;
          padding: 0.85rem 1.25rem;
          font-size: 1rem;
          font-weight: 600;
          z-index: 1000;
          border-radius: 0 0 6px 0;
        }
        .sl-skip-link:focus {
          left: 0;
        }

        .sl-nav {
          position: sticky;
          top: 0;
          z-index: 500;
          /* A faint dot grid layered under the glass gradient - a
             monitor/dashboard screen texture instead of a flat white
             stripe, subtle enough to still blend rather than stand out. */
          background-color: rgba(255, 255, 255, 0.78);
          background-image: linear-gradient(
              160deg,
              rgba(255, 255, 255, 0.85) 0%,
              rgba(255, 255, 255, 0.6) 45%,
              rgba(255, 255, 255, 0.78) 100%
            ),
            radial-gradient(rgba(30, 58, 95, 0.05) 1px, transparent 1px);
          background-size:
            100% 100%,
            14px 14px;
          backdrop-filter: blur(16px) saturate(140%);
          -webkit-backdrop-filter: blur(16px) saturate(140%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            0 4px 20px rgba(15, 23, 42, 0.06);
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: no-preference) {
          .sl-nav {
            transition: transform 0.25s ease;
          }
        }
        .sl-nav.sl-nav-hidden {
          transform: translateY(-100%);
        }

        /* px, not rem - this site's own html font-size is not fixed
           (main.css steps it from 18pt down to 10pt across breakpoints),
           so a rem value here would drift with it instead of holding a
           steady 75px. Mobile keeps its own auto-height wrapped grid
           below. */
        @media screen and (min-width: 737px) {
          .sl-nav {
            height: 75px;
          }
          .sl-nav-inner {
            height: 100%;
          }
        }

        /* px, not rem, here too - same reason as the height and bars
           below: this site's html font-size isn't fixed, and the demo
           preview (which doesn't load main.css) only ever sees the
           browser's plain 16px default, so rem would render smaller
           there than on the real, wider-breakpoint site pages. */
        .sl-nav-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 16px;
        }

        .sl-nav-brand {
          display: block;
          flex-shrink: 0;
          border-bottom: none !important;
        }
        .sl-nav-brand img {
          display: block;
          height: 40px;
          width: auto;
        }

        /* px throughout this row (not rem) for the same reason as the
           fixed 75px nav height above: it has to actually fit inside
           that fixed box on every page, and rem would grow past it at
           this site's wider breakpoints. */
        .sl-nav-bars {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          list-style: none;
          margin: 0;
          padding: 2px 0 0 0;
        }

        .sl-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 3px;
          width: 48px;
          min-height: 40px;
          padding: 3px 3px 4px;
          text-decoration: none;
          border-radius: 6px;
          border: 2px solid transparent;
        }
        .sl-bar:focus-visible {
          border-color: var(--bar-color, #1e3a5f);
          outline: 3px solid var(--bar-color, #1e3a5f);
          outline-offset: 2px;
        }

        .sl-bar-fill {
          width: 16px;
          border-radius: 3px 3px 0 0;
          background: color-mix(in srgb, var(--bar-color, #1e3a5f) 12%, white);
          border-top: 3px solid var(--bar-color, #1e3a5f);
        }
        @media (prefers-reduced-motion: no-preference) {
          .sl-bar-fill {
            transition: height 0.15s ease, background-color 0.15s ease;
          }
        }
        .sl-bar:hover .sl-bar-fill,
        .sl-bar:focus-visible .sl-bar-fill {
          background: color-mix(in srgb, var(--bar-color, #1e3a5f) 25%, white);
        }

        .sl-bar-label {
          font-size: 12px;
          line-height: 1.1;
          font-weight: 500;
          color: var(--text-color, #111111);
          white-space: nowrap;
        }

        /* Current page: tallest, filled with a modest embossed gradient
           instead of flat color, bold underlined label - three signals
           beyond color, per WCAG 1.4.1. */
        .sl-bar[aria-current="page"] .sl-bar-fill {
          background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--bar-color, #1e3a5f) 75%, white) 0%,
            var(--bar-color, #1e3a5f) 50%,
            color-mix(in srgb, var(--bar-color, #1e3a5f) 80%, black) 100%
          );
          border-top-color: color-mix(in srgb, var(--bar-color, #1e3a5f) 75%, white);
          box-shadow:
            inset 0 1px 1px rgba(255, 255, 255, 0.4),
            0 2px 4px rgba(15, 23, 42, 0.18);
          height: 40px !important;
        }
        .sl-bar[aria-current="page"] .sl-bar-label {
          font-weight: 700;
          color: var(--bar-color, #1e3a5f);
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        /* Below the breakpoint, the bars wrap into a centered grid
           instead of staying in one row, so every item stays visible
           without needing to shrink below a usable tap-target size. */
        @media screen and (max-width: 736px) {
          .sl-nav-inner {
            flex-direction: column;
            justify-content: center;
            gap: 5px;
            padding: 6px 16px;
          }
          .sl-nav-bars {
            flex-wrap: wrap;
            justify-content: center;
            width: 100%;
          }
          .sl-bar {
            width: 46px;
            min-height: 40px;
            padding: 4px 2px 6px;
          }
          .sl-bar-label {
            font-size: 11px;
          }
        }
      `;
      document.head.appendChild(style);
    }

    const barsMarkup = items
      .map((item) => {
        const isCurrent = normalize(item.href) === currentPath;
        return `
          <li class="sl-bar-item">
            <a
              href="${item.href}"
              class="sl-bar"
              style="--bar-color:${item.color};"
              ${isCurrent ? 'aria-current="page"' : ""}
            >
              <span class="sl-bar-fill" style="height:${item.height}px;"></span>
              <span class="sl-bar-label">${item.label}</span>
            </a>
          </li>
        `;
      })
      .join("");

    this.innerHTML = `
      <a href="${skipTarget}" class="sl-skip-link">Skip to main content</a>

      <nav class="sl-nav" aria-label="Primary">
        <div class="sl-nav-inner">
          <a href="/index.html" class="sl-nav-brand">
            <img
              src="/images/scottlabz-clear.webp"
              alt="Scott Labz"
              width="31"
              height="40" />
          </a>

          <ul class="sl-nav-bars" role="list">
            ${barsMarkup}
          </ul>
        </div>
      </nav>
    `;

    this._setUpScrollHide();
  }

  // Hides the nav on scroll-down, reveals it the moment the user scrolls
  // up (even slightly). Always visible near the top of the page so it
  // doesn't flicker away during the first small scroll. rAF-throttled and
  // a passive listener to stay cheap on scroll. Looks up .sl-nav fresh on
  // every tick rather than caching it once, so this keeps working even if
  // a subclass/consumer ever re-renders the element's contents.
  _setUpScrollHide() {
    const REVEAL_ZONE = 80; // px from top where the nav always stays visible
    const MIN_DELTA = 6; // ignore sub-pixel/trackpad jitter

    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const nav = this.querySelector(".sl-nav");
        const y = window.scrollY;
        const delta = y - lastY;

        if (nav) {
          if (y <= REVEAL_ZONE) {
            nav.classList.remove("sl-nav-hidden");
          } else if (delta > MIN_DELTA) {
            nav.classList.add("sl-nav-hidden");
          } else if (delta < -MIN_DELTA) {
            nav.classList.remove("sl-nav-hidden");
          }
        }

        lastY = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
  }
}

customElements.define("scott-nav", ScottNav);
