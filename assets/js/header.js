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
})();
