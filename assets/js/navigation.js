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
 * The current page is always the tallest, filled bar, marked three
 * separate ways (fill, height, dot + bold label) so the "you are
 * here" cue never depends on color alone.
 *
 * Accessibility / older-user notes:
 * - No hover-only menus, no hamburger, no hidden items.
 * - Every item's clickable zone is a full ~64px column, even when
 *   its bar is visually short - the bar is decorative, the <a> is
 *   the real target.
 * - Labels are always visible text, never icon-only.
 * - Skip link is the first focusable element on the page.
 * - prefers-reduced-motion disables the grow/transition, not the
 *   state change itself.
 */

class ScottNav extends HTMLElement {
  connectedCallback() {
    // Primary wayfinding only - the exhaustive list stays in the footer.
    const items = [
      { href: "/index.html", label: "Home", height: 26 },
      { href: "/services.html", label: "Services", height: 34 },
      { href: "/case-studies.html", label: "Work", height: 42 },
      { href: "/insights.html", label: "Insights", height: 50 },
      { href: "/about.html", label: "About", height: 58 },
      { href: "/contact.html", label: "Contact", height: 66 },
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
          background: var(--bg-color, #ffffff);
          border-bottom: 1px solid var(--border-color, #e5e5e5);
        }

        .sl-nav-inner {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .sl-nav-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
          padding: 0.75rem 0;
          border-bottom: none !important;
          color: var(--text-color, #111111);
          text-decoration: none;
          font-weight: 700;
          font-size: 1.05rem;
        }
        .sl-nav-brand img {
          display: block;
          height: 30px;
          width: auto;
        }

        .sl-nav-bars {
          display: flex;
          flex: 1;
          justify-content: center;
          align-items: flex-end;
          gap: 0.25rem;
          list-style: none;
          margin: 0;
          padding: 0.25rem 0 0 0;
          overflow-x: auto;
          scroll-snap-type: x proximity;
          -webkit-overflow-scrolling: touch;
        }
        .sl-nav-bars::-webkit-scrollbar {
          height: 5px;
        }
        .sl-nav-bars::-webkit-scrollbar-thumb {
          background: var(--border-color, #e5e5e5);
          border-radius: 4px;
        }

        .sl-bar-item {
          scroll-snap-align: start;
        }

        .sl-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 0.4rem;
          width: 78px;
          min-height: 68px;
          padding: 0.4rem 0.25rem 0.6rem;
          text-decoration: none;
          border-radius: 6px;
          border: 2px solid transparent;
        }
        .sl-bar:hover,
        .sl-bar:focus-visible {
          border-color: #1e3a5f;
        }
        .sl-bar:focus-visible {
          outline: 3px solid #1e3a5f;
          outline-offset: 2px;
        }

        .sl-bar-fill {
          width: 30px;
          border-radius: 3px 3px 0 0;
          background: #eef2f6;
          border-top: 3px solid #1e3a5f;
          position: relative;
        }
        @media (prefers-reduced-motion: no-preference) {
          .sl-bar-fill {
            transition: height 0.15s ease, background-color 0.15s ease;
          }
        }
        .sl-bar:hover .sl-bar-fill,
        .sl-bar:focus-visible .sl-bar-fill {
          background: #dbe4ec;
        }

        .sl-bar-label {
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text-color, #111111);
          white-space: nowrap;
        }

        /* Current page: tallest, filled solid, dot marker, bold label -
           three signals beyond color, per WCAG 1.4.1. */
        .sl-bar[aria-current="page"] .sl-bar-fill {
          background: #1e3a5f;
          height: 66px !important;
        }
        .sl-bar[aria-current="page"] .sl-bar-fill::after {
          content: "";
          position: absolute;
          top: -7px;
          left: 50%;
          transform: translateX(-50%);
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #1e3a5f;
        }
        .sl-bar[aria-current="page"] .sl-bar-label {
          font-weight: 700;
          color: #1e3a5f;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        @media screen and (max-width: 736px) {
          .sl-nav-brand span {
            display: none;
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
            <img src="/images/scottlabz-clear.webp" alt="" width="30" height="39" />
            <span>Scott Labz</span>
          </a>

          <ul class="sl-nav-bars" role="list">
            ${barsMarkup}
          </ul>
        </div>
      </nav>
    `;
  }
}

customElements.define("scott-nav", ScottNav);
