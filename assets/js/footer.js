class ScottFooter extends HTMLElement {
  connectedCallback() {
    const customDesc =
      this.getAttribute("description") ||
      "Modern analytics, scalable data platforms, and custom web development.";

    this.innerHTML = `
      <hr style="opacity:0.2;max-width:1200px;margin:0 auto 2rem auto;" />

      <footer class="wrapper style1 align-center">

        <div class="inner"
          style="
            max-width:1100px;
            margin:0 auto;
            padding:2rem 1rem;
          ">

          <div
            class="footer-columns"
            style="
              display:flex;
              flex-direction:row;
              flex-wrap:wrap;
              text-align:left;
              gap:2rem;
              margin-bottom:2rem;
            ">

            <!-- BRAND -->

            <div style="flex:2;min-width:260px;">
              <div class="logo-wrapper" style="margin-bottom:.75rem;">
                <a href="/index.html" style="border-bottom:none;">
                  <span class="h3" style="display:inline-flex;align-items:center;">
                    <img
                      src="/images/scottlabz-clear.png"
                      alt="S"
                      class="logo"
                      style="display:block;max-height: 4vh;margin-right: 2px;">
                    <span style="font-size: x-large;">cott Labz</span>
                  </span>
                </a>
              </div>
              <p class="ftrmsg">
                ${customDesc}
              </p>

              <ul class="icons" style="
                display:flex;
                align-items:center;
                justify-content:flex-start;
                flex-wrap:wrap;
                gap:1.75rem;
                list-style:none;
                padding:0;
                margin:0;
              ">

                <li style="display:flex;align-items:center;">
                  
                    <a href="https://www.bbb.org/us/il/normal/profile/data-analytics/scott-labz-0724-1000039342/#sealclick"
                    target="_blank"
                    rel="nofollow"
                    style="
                      border-bottom:none;
                      display:flex;
                      align-items:center;
                    "
                  >
                    <img
                      id="footer-bbb-img"
                      src="https://seal-heartofillinois.bbb.org/seals/blue-seal-120-61-bbb-1000039342.png"
                      alt="Scott Labz BBB Business Review"
                      title="Scott Labz BBB Business Review"
                      style="
                        border: 0;
                        width:100px;
                        height:auto;
                      "
                    >
                  </a>
                </li>

                <li style="display:flex;align-items:center;">
                  
                    <a href="https://www.mcleancochamber.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="
                      border-bottom:none;
                      display:flex;
                      align-items:center;
                    "
                    alt="McLean County Chamber of Commerce"
                    title="McLean County Chamber of Commerce"
                  >
                    <img
                      id="footer-chamber-img"
                      src="/images/Chamber-Member-Logo.png"
                      alt="McLean County Chamber of Commerce"
                      title="McLean County Chamber of Commerce"
                      style="
                        display:block;
                        width:70px;
                        height:auto;
                      "
                    >
                  </a>
                </li>

              </ul>

            </div>

            <!-- SOLUTIONS -->

            <div style="flex:1;min-width:150px;">

              <h4 style="font-size:.9rem;text-transform:uppercase;margin:0;">
                SOLUTIONS
              </h4>

              <ul
                style="
                  list-style:none;
                  padding:0;
                  font-size:.85rem;
                  line-height:1.8;
                ">

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
                  <a href="/services.html">
                    Services
                  </a>
                </li>
              </ul>
            </div>

            <!-- RESOURCES -->

            <div style="flex:1;min-width:150px;">

              <h4 style="font-size:.9rem;text-transform:uppercase;margin:0;">
                RESOURCES
              </h4>

              <ul
                style="
                  list-style:none;
                  padding:0;
                  font-size:.85rem;
                  line-height:1.8;
                ">

                <li>
                  <a href="/case-studies.html">
                    Case Studies
                  </a>
                </li>

                <li>
                  <a href="/insights.html">
                    Insights
                  </a>
                </li>

                <li>
                  <a href="/faq.html">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <!-- SCOTT LABZ -->

            <div style="flex:1;min-width:150px;">

              <h4 style="font-size:.9rem;text-transform:uppercase;margin:0;">
                COMPANY
              </h4>

              <ul
                style="
                  list-style:none;
                  padding:0;
                  font-size:.85rem;
                  line-height:1.8;
                ">

                <li>
                  <a href="/about.html">
                    About
                  </a>
                </li>

                <li>
                  <a href="/bbb.html">
                    BBB Accreditation
                  </a>
                </li>

                <li>
                  <a href="/contact.html">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div class="copyright">

            <p style="margin: 0 0 0.7rem 0;">
              &copy;
              <span id="footer-year"></span>
              Scott Labz, LLC.
              All rights reserved.
              <br />
              Analytics &middot; Data &middot; Web Development &middot; Digital Infrastructure
              <br />
              Independent Analytics &amp; Digital Firm
            </p>

            <p style="font-size: 0.85rem; opacity: 0.7; margin: 0 0 1.25rem;">
              <a href="security-trust.html" style="color: inherit; text-decoration: underline;">Security &amp; Trust</a>
              <span style="margin: 0 0.5rem; opacity: 0.5;">&middot;</span>
              <a href="legal.html" style="color: inherit; text-decoration: underline;">Legal &amp; Policies</a>
            </p>

            <div id="footer-social-groups" style="
              display:flex;
              align-items:flex-start;
              justify-content:center;
              flex-wrap:wrap;
              gap:2.5rem;
              margin:0 auto;
            ">

              <ul class="icons" style="
                display:flex;
                align-items:center;
                justify-content:center;
                flex-wrap:wrap;
                gap:1.25rem;
                list-style:none;
                padding:0;
                margin:0;
              ">

                <li>
                  
                    <a href="https://github.com/scottlabz"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="icon brands style2 fa-github"
                      alt="GitHub"
                      title="GitHub"
                    >

                    <span class="label">
                      GitHub
                    </span>

                  </a>
                </li>

                <li>
                  
                    <a href="https://gitlab.com/scottlabz"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="icon brands style2 fa-gitlab"
                      alt="GitLab"
                      title="GitLab"
                    >

                    <span class="label">
                      GitLab
                    </span>

                  </a>
                </li>

                <li>
                  
                    <a href="https://www.linkedin.com/company/scottlabz"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="icon brands style2 fa-linkedin"
                    alt="LinkedIn"
                    title="LinkedIn"
                    >

                    <span class="label">
                      LinkedIn
                    </span>

                  </a>
                </li>

              </ul>

            </div>

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

    const yearSpan = this.querySelector("#footer-year");

    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }

    const topBtn = this.querySelector("#backToTop");

    if (topBtn) {
      window.addEventListener("scroll", () => {
        topBtn.style.display = window.scrollY > 300 ? "block" : "none";
      });

      topBtn.addEventListener("click", () => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      });

      const socialGroups = this.querySelector("#footer-social-groups");
      const divider = this.querySelector("#footer-divider");
      const bbbImg = this.querySelector("#footer-bbb-img");
      const chamberImg = this.querySelector("#footer-chamber-img");

      const applyResponsiveFooterStyles = () => {
        const isMobile = window.innerWidth <= 736;

        if (socialGroups) {
          socialGroups.style.flexDirection = isMobile ? "column" : "row";
          socialGroups.style.gap = isMobile ? "1.5rem" : "2.5rem";
        }

        if (divider) {
          divider.style.width = isMobile ? "60%" : "1px";
          divider.style.height = "1px";
          if (!isMobile) {
            divider.style.height = "36px";
          }
        }

        if (bbbImg) {
          bbbImg.style.width = isMobile ? "90px" : "100px";
        }

        if (chamberImg) {
          chamberImg.style.width = isMobile ? "65px" : "70px";
        }
      };

      applyResponsiveFooterStyles();
      window.addEventListener("resize", applyResponsiveFooterStyles);
    }
  }
}

customElements.define("scott-footer", ScottFooter);
