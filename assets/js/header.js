(function () {
  const head = document.head;

  /*
   * HTML Language
   */
  document.documentElement.lang = "en-US";

  /*
   * Content Language
   * (Included for compatibility with SEO auditing tools.)
   */
  if (!head.querySelector('meta[http-equiv="content-language"]')) {
    const contentLanguage = document.createElement("meta");
    contentLanguage.setAttribute("http-equiv", "content-language");
    contentLanguage.setAttribute("content", "en-US");
    head.appendChild(contentLanguage);
  }

  /*
   * Critical CSS (moved out of main-min.css's @import rules
   * so the browser can fetch them in parallel instead of serially)
   *
   * No preconnect hints here on purpose: this script itself injects
   * these stylesheet links, so a preconnect added in the same pass
   * has no head start over the request it's meant to warm up for -
   * confirmed unused by Lighthouse.
   */
  if (!head.querySelector('link[href="/assets/css/fontawesome-all.min.css"]')) {
    const fontAwesome = document.createElement("link");
    fontAwesome.rel = "stylesheet";
    fontAwesome.href = "/assets/css/fontawesome-all.min.css";
    head.appendChild(fontAwesome);
  }

  if (
    !head.querySelector(
      'link[href^="https://fonts.googleapis.com/css?family=Source+Sans+Pro"]',
    )
  ) {
    const googleFonts = document.createElement("link");
    googleFonts.rel = "stylesheet";
    googleFonts.href =
      "https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,300i,400,400i&display=swap";
    head.appendChild(googleFonts);
  }
})();
