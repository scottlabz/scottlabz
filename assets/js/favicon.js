(() => {
  const favicons = [
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      href: "/images/favicon/favicon-32x32.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      href: "/images/favicon/favicon-16x16.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "96x96",
      href: "/images/favicon/favicon-96x96.png",
    },
  ];

  favicons.forEach((icon) => {
    const link = document.createElement("link");

    Object.entries(icon).forEach(([key, value]) => {
      link.setAttribute(key, value);
    });

    document.head.appendChild(link);
  });
})();
