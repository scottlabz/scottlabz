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
