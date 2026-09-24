(function () {
  var slides = document.querySelectorAll(".hero-carousel-slide");
  if (slides.length < 2) return;
  var i = 0;
  setInterval(function () {
    slides[i].classList.remove("is-active");
    i = (i + 1) % slides.length;
    slides[i].classList.add("is-active");
  }, 4000);
})();
