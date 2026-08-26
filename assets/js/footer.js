class ScottFooter extends HTMLElement {
  connectedCallback() {
    const customDesc =
      this.getAttribute("description") ||
      "Modern analytics, scalable data platforms, and custom web development.";

    this.innerHTML = `
      <footer class="wrapper style1 align-center">

        <div class="inner"
          style="
            max-width:1100px;
            margin:0 auto;
            padding:2rem 1rem;
            border-top: 1px solid rgba(160, 160, 160, .2);
          ">

          <div
            class="footer-columns">

            <!-- BRAND -->

            <div style="flex:2;min-width:260px;">
              <div class="logo-wrapper" style="margin-bottom:.75rem;">
                <a href="/index.html" style="border-bottom:none;">
                  <span class="h3" style="display:inline-flex;align-items:center;">
                    <img
                      src="/images/scottlabz-clear.webp"
                      width="130"
                      height="170"
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
                    id="bbblink"
                    class="ruhzbum"
                    target="_blank"
                    rel="nofollow"
                    style="border-bottom:none;"
                  >
                    <img
                      src="https://seal-heartofillinois.bbb.org/logo/ruhzbum/bbb-1000039342.png"
                      width="300"
                      height="68"
                      alt="Scott Labz BBB Business Review"
                      title="Scott Labz BBB Business Review"
                    >
                  </a>
                </li>

                <li style="display:flex;align-items:center;">
                  
                    <a href="https://business.mcleancochamber.org/active-member-directory/Details/scott-labz-llc-4951023"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="
                      border-bottom:none;
                      display:flex;
                      align-items:center;
                    "
                    aria-label="McLean County Chamber of Commerce"
                    title="McLean County Chamber of Commerce"
                  >
                    <img
                      id="footer-chamber-img"
                      src="/images/Chamber-Member-Logo.webp"
                      width="260"
                      height="260"
                      alt="McLean County Chamber of Commerce"
                      title="McLean County Chamber of Commerce"
                      style="
                        display:block;
                        width:100%;
                        height:75px;
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
                  line-height:1.2;
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
                  <a href="/conversion-optimization.html">
                    Optimization
                  </a>
                </li>

                <li>
                  <a href="/services.html">
                    Services
                  </a>
                </li>

                <li>
                  <a href="/industries.html">
                    Industries
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
                  line-height:1.2;
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
                  <a href="/field-notes/">
                    Field Notes
                  </a>
                </li>

                <li>
                  <a href="/faq.html">
                    FAQ
                  </a>
                </li>

                <li>
                  <a href="/lab.html">
                    Lab
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
                  line-height:1.2;
                ">

                <li>
                  <a href="/about.html">
                    About
                  </a>
                </li>

                <li>
                  <a href="/why-us.html">
                    Why Us
                  </a>
                </li>

                <li>
                  <a href="/bbb.html">
                    Accreditation
                  </a>
                </li>

                <li>
                  <a href="/find-us.html">
                    Credentials
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
              Independent Analytics &amp; Digital Engineering Firm
              <br />
              <span style="font-size:small;">Bloomington-Normal, McLean County, Illinois, USA</span>
            </p>

            <p style="font-size: 0.85rem; opacity: 0.7; margin: 0 0 1.25rem;">
              <a href="/security-trust.html" style="color: inherit; text-decoration: underline;">Security &amp; Trust</a>
              <span style="margin: 0 0.5rem; opacity: 0.5;">&middot;</span>
              <a href="/legal.html" style="color: inherit; text-decoration: underline;">Legal &amp; Policies</a>
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
                      aria-label="GitHub"
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
                      aria-label="GitLab"
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
                    aria-label="LinkedIn"
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
    }

    // Responsive footer sizing — independent of the back-to-top button
    const socialGroups = this.querySelector("#footer-social-groups");

    const applyResponsiveFooterStyles = () => {
      const isMobile = window.innerWidth <= 736;

      if (socialGroups) {
        socialGroups.style.flexDirection = isMobile ? "column" : "row";
        socialGroups.style.gap = isMobile ? "1.5rem" : "2.5rem";
      }
    };

    applyResponsiveFooterStyles();
    window.addEventListener("resize", applyResponsiveFooterStyles);
  }
}

customElements.define("scott-footer", ScottFooter);
