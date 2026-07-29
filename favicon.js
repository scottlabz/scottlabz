(function () {
  const head = document.head;

  // Prevent duplicate injection
  if (head.querySelector('meta[name="theme-color"]')) return;

  const links = [
    // Apple Touch Icons
    {
      rel: "apple-touch-icon",
      sizes: "57x57",
      href: "images/favicon/apple-icon-57x57.png",
    },
    {
      rel: "apple-touch-icon",
      sizes: "60x60",
      href: "images/favicon/apple-icon-60x60.png",
    },
    {
      rel: "apple-touch-icon",
      sizes: "72x72",
      href: "images/favicon/apple-icon-72x72.png",
    },
    {
      rel: "apple-touch-icon",
      sizes: "76x76",
      href: "images/favicon/apple-icon-76x76.png",
    },
    {
      rel: "apple-touch-icon",
      sizes: "114x114",
      href: "images/favicon/apple-icon-114x114.png",
    },
    {
      rel: "apple-touch-icon",
      sizes: "120x120",
      href: "images/favicon/apple-icon-120x120.png",
    },
    {
      rel: "apple-touch-icon",
      sizes: "144x144",
      href: "images/favicon/apple-icon-144x144.png",
    },
    {
      rel: "apple-touch-icon",
      sizes: "152x152",
      href: "images/favicon/apple-icon-152x152.png",
    },
    {
      rel: "apple-touch-icon",
      sizes: "180x180",
      href: "images/favicon/apple-icon-180x180.png",
    },

    // Standard Favicons
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      href: "images/favicon/favicon-16x16.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      href: "images/favicon/favicon-32x32.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "96x96",
      href: "images/favicon/favicon-96x96.png",
    },

    // Web App Manifest
    { rel: "manifest", href: "images/favicon/manifest.json" },
  ];

  links.forEach((attrs) => {
    const link = document.createElement("link");

    Object.entries(attrs).forEach(([key, value]) => {
      link.setAttribute(key, value);
    });

    head.appendChild(link);
  });

  const themeColor = document.createElement("meta");
  themeColor.name = "theme-color";
  themeColor.content = "#1e3a5f"; // Matches your site's navy
  head.appendChild(themeColor);
})();
