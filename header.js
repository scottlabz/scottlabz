(function () {
  const head = document.head;

  // Prevent duplicate injection
  if (head.querySelector("meta[charset]")) return;

  /*
   * Character Encoding
   */
  const charset = document.createElement("meta");
  charset.setAttribute("charset", "utf-8");
  head.appendChild(charset);

  /*
   * Language
   */
  document.documentElement.lang = "en-US";

  const contentLanguage = document.createElement("meta");
  contentLanguage.setAttribute("http-equiv", "content-language");
  contentLanguage.setAttribute("content", "en-US");
  head.appendChild(contentLanguage);

  /*
   * Viewport
   */
  const viewport = document.createElement("meta");
  viewport.name = "viewport";
  viewport.content = "width=device-width, initial-scale=1, user-scalable=yes";
  head.appendChild(viewport);

  /*
   * Main Stylesheet
   */
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "assets/css/main.css";
  head.appendChild(stylesheet);

  /*
   * NoScript Stylesheet
   */
  const noscript = document.createElement("noscript");
  noscript.innerHTML = '<link rel="stylesheet" href="assets/css/noscript.css">';
  head.appendChild(noscript);
})();
