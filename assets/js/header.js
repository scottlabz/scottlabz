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
   */
  if (
    !head.querySelector(
      'link[rel="preconnect"][href="https://fonts.googleapis.com"]',
    )
  ) {
    const preconnectGoogleFonts = document.createElement("link");
    preconnectGoogleFonts.rel = "preconnect";
    preconnectGoogleFonts.href = "https://fonts.googleapis.com";
    head.appendChild(preconnectGoogleFonts);
  }

  if (
    !head.querySelector(
      'link[rel="preconnect"][href="https://fonts.gstatic.com"]',
    )
  ) {
    const preconnectGstatic = document.createElement("link");
    preconnectGstatic.rel = "preconnect";
    preconnectGstatic.href = "https://fonts.gstatic.com";
    preconnectGstatic.crossOrigin = "anonymous";
    head.appendChild(preconnectGstatic);
  }

  if (!head.querySelector('link[href="/assets/css/fontawesome-all.min.css"]')) {
    const fontAwesome = document.createElement("link");
    fontAwesome.rel = "stylesheet";
    fontAwesome.href = "css/fontawesome-all.min.css";
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
      "https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,300i,400,400i";
    head.appendChild(googleFonts);
  }

  /*
   * Umami Analytics
   */
  if (
    !head.querySelector(
      'script[data-website-id="62eae9b2-24e3-41bf-8f07-021c1cc97cdd"]',
    )
  ) {
    const umamiScript = document.createElement("script");
    umamiScript.defer = true;
    umamiScript.src = "https://cloud.umami.is/script.js";
    umamiScript.setAttribute(
      "data-website-id",
      "62eae9b2-24e3-41bf-8f07-021c1cc97cdd",
    );
    head.appendChild(umamiScript);
  }
})();
