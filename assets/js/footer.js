class ScottFooter extends HTMLElement {
  connectedCallback() {
    const customDesc =
      this.getAttribute("description") ||
      "Modern analytics, scalable data platforms, and custom web development.";

    this.innerHTML = `
      <hr style="opacity: 0.2; max-width: 1200px; margin: 0 auto 2rem auto;" />

      <footer class="wrapper style1 align-center">
        <div class="inner" style="max-width: 1100px; margin: 0 auto; padding: 2rem 1rem;">

          <div class="footer-columns" style="display:flex;flex-direction:column;text-align:left;gap:2rem;margin-bottom:2rem;">

            <div style="width:100%;">

              <div class="logo-wrapper" style="margin-bottom: 0.75rem;">
                <a href="index.html" style="border-bottom: none;">
                  <span class="h3">
                    <img src="https://scottlabz.com/images/scottlabz-clear.png" alt="S" class="logo" style="height:1.2em;vertical-align:middle;">cott Labz
                  </span>
                </a>
              </div>

              <p style="font-size:.85rem;opacity:.8;margin-bottom:1rem;">
                ${customDesc}
              </p>


              <ul style="list-style:none;padding:0;margin:0 0 1.5rem 0;font-size:.9rem;">
                <li>

                  <span class="h3">
                  <a href="services.html">
                  <img src="https://scottlabz.com/images/scottlabz-clear.png" alt="S" class="logo" style="height: 1.2em; vertical-align: middle;">ervices</a>
                  </span>

                  &nbsp; | &nbsp;

                  <span class="h3">
                    <a href="/about.html">
                      About
                    </a>
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


                <li>
                  <a href="/contact.html"
                     class="icon style2 fa-envelope">
                    <span class="label">Contact Us</span>
                  </a>
                </li>

              </ul>

            </div>



            <div style="width:100%;">

              <h4 style="font-size:.9rem;text-transform:uppercase;">
                SOLUTIONS
              </h4>

              <ul style="list-style:none;padding:0;font-size:.85rem;line-height:1.8;">
                <li>
                  <a href="/analytics-data.html">
                    Analytics &amp; Data
                  </a>
                </li>

                <li>
                  <a href="/web-digital.html">
                    Web &amp; Digital
                  </a>
                </li>

                <li>
                  <a href="/case-studies.html">
                    Case Studies
                  </a>
                </li>

              </ul>

            </div>



            <div style="width:100%;">

              <h4 style="font-size:.9rem;text-transform:uppercase;">
                GOVERNANCE
              </h4>

              <ul style="list-style:none;padding:0;font-size:.85rem;line-height:1.8;">

                <li>
                  <a href="/security-trust.html">
                    Security &amp; Trust
                  </a>
                </li>

                <li>
                  <a href="/legal.html">
                    Legal &amp; Policies
                  </a>
                </li>

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

    loadScript("/assets/js/jquery.min.js")
      .then(() => loadScript("/assets/js/jquery.scrollex.min.js"))
      .then(() => loadScript("/assets/js/jquery.scrolly.min.js"))
      .then(() => loadScript("/assets/js/browser.min.js"))
      .then(() => loadScript("/assets/js/breakpoints.min.js"))
      .then(() => loadScript("/assets/js/util.js"))
      .then(() => loadScript("/assets/js/main.js"))
      .catch((error) => {
        console.error("Scott Labz script loading error:", error);
      });

    const yearSpan = this.querySelector("#footer-year");

    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }

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
