(function () {
  function scrollToTarget(link, anchor) {
    var href = link.getAttribute("href");
    if (!href || href.charAt(0) !== "#" || href.length < 2) return false;

    var target = document.getElementById(href.slice(1));
    if (!target) return false;

    var targetTop = target.getBoundingClientRect().top + window.scrollY;
    var top;

    if (anchor === "middle") {
      top =
        targetTop - (window.innerHeight - target.offsetHeight) / 2;
    } else {
      top = Math.max(targetTop, 0);
    }

    window.scrollTo({ top: top, behavior: "smooth" });
    return true;
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest(".smooth-scroll, .smooth-scroll-middle");
    if (!link) return;

    if (scrollToTarget(link, link.classList.contains("smooth-scroll-middle") ? "middle" : "top"))
      event.preventDefault();
  });
})();
