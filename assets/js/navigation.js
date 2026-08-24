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
      { href: "/index.html", label: "Home", height: 18, color: "#1e3a5f" },
      { href: "/services.html", label: "Services", height: 24, color: "#0e7490" },
      { href: "/case-studies.html", label: "Work", height: 30, color: "#15803d" },
      { href: "/insights.html", label: "Insights", height: 36, color: "#b45309" },
      { href: "/about.html", label: "About", height: 42, color: "#7c3aed" },
      { href: "/contact.html", label: "Contact", height: 48, color: "#be123c" },
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
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.88) 0%,
            rgba(255, 255, 255, 0.78) 100%
          );
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--border-color, #e5e5e5);
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

        /* 75px at the default 16px root font-size. rem rather than px so
           it stays proportional to the user's font-size/zoom setting -
           mobile keeps its own auto-height wrapped grid below. */
        @media screen and (min-width: 737px) {
          .sl-nav {
            height: 4.6875rem;
          }
          .sl-nav-inner {
            height: 100%;
          }
        }

        .sl-nav-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.25rem;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .sl-nav-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
          padding: 0.6rem 0;
          border-bottom: none !important;
          color: var(--text-color, #111111);
          text-decoration: none;
          font-weight: 700;
          font-size: 0.95rem;
        }
        .sl-nav-brand img {
          display: block;
          height: 24px;
          width: auto;
        }

        .sl-nav-bars {
          display: flex;
          align-items: flex-end;
          gap: 0.2rem;
          list-style: none;
          margin: 0;
          padding: 0.2rem 0 0 0;
        }

        .sl-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 0.3rem;
          width: 56px;
          min-height: 48px;
          padding: 0.3rem 0.2rem 0.45rem;
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
          width: 20px;
          border-radius: 3px 3px 0 0;
          background: color-mix(in srgb, var(--bar-color, #1e3a5f) 12%, white);
          border-top: 3px solid var(--bar-color, #1e3a5f);
          position: relative;
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
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-color, #111111);
          white-space: nowrap;
        }

        /* Current page: tallest, filled solid, arrow marker, bold
           underlined label - three signals beyond color, per WCAG 1.4.1. */
        .sl-bar[aria-current="page"] .sl-bar-fill {
          background: var(--bar-color, #1e3a5f);
          height: 48px !important;
        }
        .sl-bar[aria-current="page"] .sl-bar-fill::after {
          content: "";
          position: absolute;
          top: -7px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-bottom: 5px solid var(--bar-color, #1e3a5f);
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
          .sl-nav-brand span {
            display: none;
          }
          .sl-nav-inner {
            flex-direction: column;
            justify-content: center;
            gap: 0.3rem;
            padding: 0.4rem 1rem;
          }
          .sl-nav-bars {
            flex-wrap: wrap;
            justify-content: center;
            width: 100%;
          }
          .sl-bar {
            width: 46px;
            min-height: 40px;
            padding: 0.25rem 0.15rem 0.35rem;
          }
          .sl-bar-label {
            font-size: 0.7rem;
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
            <img src="/images/scottlabz-clear.webp" alt="" width="24" height="31" />
            <span>Scott Labz</span>
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
