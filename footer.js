class ScottFooter extends HTMLElement {
  connectedCallback() {
    // Read the unique description attribute from the tag, or use a default
    const customDesc =
      this.getAttribute("description") ||
      "Modern analytics, scalable data platforms, and custom web development.";

    this.innerHTML = `
      <hr style="opacity: 0.2; max-width: 1200px; margin: 0 auto 2rem auto;" />

      <footer class="wrapper style1 align-center">
        <div class="inner" style="max-width: 1100px; margin: 0 auto; padding: 2rem 1rem;">

          <div class="footer-columns" style="display: flex; flex-direction: column; text-align: left; gap: 2rem; margin-bottom: 2rem;">

            <!-- Brand -->
            <div style="width: 100%;">
              <div class="logo-wrapper" style="margin-bottom: 0.75rem;">
                <a href="index.html" style="border-bottom: none;">
                  <span class="h3">
                    <img src="images/scottlabz-clear.png" alt="S" class="logo" style="height:1.2em;vertical-align:middle;">
                    cott Labz
                  </span>
                </a>
              </div>

              <p style="font-size:0.85rem;opacity:0.8;margin-bottom:1rem;">
                ${customDesc}
              </p>

              <ul style="list-style:none;padding:0;margin:0 0 1.5rem 0;font-size:0.9rem;">
                <li>
                  <span class="h3">
                  <a href="services.html">
                  <img src="images/scottlabz-clear.png" alt="S" class="logo" style="height: 1.2em; vertical-align: middle;">ervices</a>
                  </span>
                  &nbsp; | &nbsp;
                  <span class="h3">
                    <a href="about.html">About</a>
                  </span>
                  &nbsp; | &nbsp;
                  <span class="h3">
                    <a href="faq.html">FAQ</a>
                  </span>
                </li>
              </ul>

              <ul class="icons" style="justify-content:flex-start;">
                <li>
                  <a href="https://github.com/scottlabz"
                     target="_blank"
                     rel="noopener noreferrer"
                     class="icon brands style2 fa-github">
                     <span class="label">GitHub</span>
                  </a>
                </li>

                <li>
                  <a href="https://www.linkedin.com/company/scottlabz"
                     target="_blank"
                     rel="noopener noreferrer"
                     class="icon brands style2 fa-linkedin">
                     <span class="label">LinkedIn</span>
                  </a>
                </li>
              </ul>
            </div>


            <!-- Security -->
            <div style="width:100%;">
              <h4 style="font-size:.9rem;text-transform:uppercase;">
                Security & Trust
              </h4>

              <ul style="list-style:none;padding:0;font-size:.85rem;line-height:1.8;">
                <li><a href="security.html">ISMS Standard</a></li>
                <li><a href="vdp.html">Vulnerability Disclosure</a></li>
                <li><a href="dpa.html">Data Processing Agreement</a></li>
                <li><a href="disclaimer.html">Operational Disclaimers</a></li>
                <li><a href="provenance.html">Data Provenance</a></li>

                <li>
                  <a href="https://stats.uptimerobot.com/XTnbfmM7Fi"
                     target="_blank"
                     rel="noopener noreferrer">
                     System Status
                  </a>
                </li>

                <li>
                  <a href="https://securityheaders.com/?q=scottlabz.com&followRedirects=on"
                     target="_blank"
                     rel="noopener noreferrer">
                     Edge Security
                  </a>
                </li>
              </ul>
            </div>


            <!-- Legal -->
            <div style="width:100%;">
              <h4 style="font-size:.9rem;text-transform:uppercase;">
                Legal
              </h4>

              <ul style="list-style:none;padding:0;font-size:.85rem;line-height:1.8;">
                <li><a href="privacy.html">Privacy Policy</a></li>
                <li><a href="terms.html">Terms & Conditions</a></li>
                <li><a href="cookies.html">Cookies Policy</a></li>
                <li><a href="accessibility.html">Accessibility Statement</a></li>
                <li><a href="ai-policy.html">AI Governance Policy</a></li>
                <li><a href="telemetry.html">Telemetry Policy</a></li>
                <li><a href="service-policy.html">Service Policy</a></li>
              </ul>
            </div>

          </div>


          <div style="
            border-top:1px solid rgba(160,160,160,.2);
            padding-top:1.5rem;
            font-size:.85rem;
            text-align:left;
          ">
            <p>
              &copy;
              <span id="footer-year"></span>
              Scott Labz, LLC.
              All rights reserved.
              <i class="fas fa-dragon"></i>
            </p>
          </div>

        </div>
      </footer>


      <!-- Back To Top -->
      <button
        id="backToTop"
        aria-label="Back to top"
        style="
          display:none;
          position:fixed;
          bottom:24px;
          right:24px;
          z-index:99;
        ">
        ↑ Top
      </button>
    `;

    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        // Prevent duplicate loading
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }

        const script = document.createElement("script");

        script.src = src;
        script.defer = true;

        script.onload = resolve;
        script.onerror = reject;

        document.body.appendChild(script);
      });
    };

    /*
       Load site JavaScript in dependency order
    */

    loadScript("assets/js/jquery.min.js")
      .then(() => loadScript("assets/js/jquery.scrollex.min.js"))
      .then(() => loadScript("assets/js/jquery.scrolly.min.js"))
      .then(() => loadScript("assets/js/browser.min.js"))
      .then(() => loadScript("assets/js/breakpoints.min.js"))
      .then(() => loadScript("assets/js/util.js"))
      .then(() => loadScript("assets/js/main.js"))
      .catch((error) => {
        console.error("Scott Labz script loading error:", error);
      });

    /*
       Dynamic Year
    */

    const yearSpan = this.querySelector("#footer-year");

    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }

    /*
       Back To Top
    */

    const topBtn = this.querySelector("#backToTop");

    if (topBtn) {
      window.addEventListener("scroll", () => {
        if (window.scrollY > 300) {
          topBtn.style.display = "block";
        } else {
          topBtn.style.display = "none";
        }
      });

      topBtn.addEventListener("click", () => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      });
    }
  }
}

customElements.define("scott-footer", ScottFooter);
