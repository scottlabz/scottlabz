(function () {
  var body = document.body,
    mobile =
      /Android|iPhone|iPad|iPod|Windows Phone|BlackBerry/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  window.addEventListener("load", function () {
    setTimeout(function () {
      body.classList.remove("is-preload");
    }, 100);
  });

  function wrapInner(el) {
    var inner = document.createElement("div");
    inner.className = "inner";
    while (el.firstChild) inner.appendChild(el.firstChild);
    el.appendChild(inner);
    return inner;
  }

  var observer =
    "IntersectionObserver" in window &&
    new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var el = entry.target;
          if (entry.isIntersecting) el.classList.remove("is-inactive");
          else if (el.classList.contains("onscroll-bidirectional")) el.classList.add("is-inactive");
        });
      },
      { rootMargin: "-30% 0px -30% 0px" }
    );

  function reveal(el) {
    if (!observer) return;
    el.classList.add("is-inactive");
    observer.observe(el);
  }

  var wrapper = document.getElementById("wrapper");
  if (wrapper) Array.prototype.forEach.call(wrapper.children, reveal);

  document.querySelectorAll(".items").forEach(function (items) {
    reveal(items);
    Array.prototype.forEach.call(items.children, wrapInner);
  });

  document.querySelectorAll(".gallery").forEach(function (gallery) {
    var inner = wrapInner(gallery);

    reveal(gallery);

    inner.style.overflowY = mobile ? "visible" : "hidden";
    inner.style.overflowX = mobile ? "scroll" : "hidden";
    inner.scrollLeft = 0;

    inner.addEventListener(
      "wheel",
      function (event) {
        var delta = event.deltaX * 10;
        delta = delta > 0 ? Math.min(25, delta) : Math.max(-25, delta);
        inner.scrollLeft += delta;
      },
      { passive: true }
    );

    if (mobile) return;

    [
      ["backward", -1],
      ["forward", 1],
    ].forEach(function (pair) {
      var arrow = document.createElement("div"),
        intervalId;
      arrow.className = pair[0];
      arrow.addEventListener("mouseenter", function () {
        clearInterval(intervalId);
        intervalId = setInterval(function () {
          inner.scrollLeft += 5 * pair[1];
        }, 10);
      });
      arrow.addEventListener("mouseleave", function () {
        clearInterval(intervalId);
      });
      gallery.insertBefore(arrow, gallery.firstChild);
    });
  });
})();
