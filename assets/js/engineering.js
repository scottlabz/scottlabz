/*
  ScottLabz Engineering Approach
  Interactive behaviors
*/

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    /*
      =========================================
      Scroll Reveal
    =========================================
    */

    const steps = document.querySelectorAll(".engineering-step");

    if (steps.length) {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReducedMotion) {
        steps.forEach(function (step) {
          step.style.opacity = "1";

          step.style.transform = "none";
        });
      } else {
        const observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");

                observer.unobserve(entry.target);
              }
            });
          },
          {
            threshold: 0.25,
          },
        );

        steps.forEach(function (step, index) {
          step.style.opacity = "0";

          step.style.transform = "translateY(25px)";

          step.style.transition =
            "opacity .5s ease " +
            index * 100 +
            "ms, transform .5s ease " +
            index * 100 +
            "ms";

          observer.observe(step);
        });
      }

      /*
        Step selection
      */

      steps.forEach(function (step) {
        step.addEventListener("click", function () {
          steps.forEach(function (item) {
            item.classList.remove("active");
          });

          step.classList.add("active");
        });
      });
    }

    /*
      =========================================
      Digital Engineering Ecosystem
    =========================================
    */

    const nodes = document.querySelectorAll(".ecosystem-node[data-title]");

    const lines = document.querySelectorAll(".ecosystem-lines line");

    const center = document.querySelector(".ecosystem-center");

    const centerTitle = document.querySelector("#centerTitle");

    const centerDescription = document.querySelector("#centerDescription");

    const centerPanel = document.querySelector(".center-panel");

    if (!nodes.length || !centerTitle || !centerDescription || !centerPanel) {
      return;
    }

    const defaultTitle = "Connected";

    const defaultDescription = "Hover a capability to learn more.";

    function clearLines() {
      lines.forEach(function (line) {
        line.classList.remove("active");
      });
    }

    function resetCenter() {
      centerTitle.textContent = defaultTitle;

      centerDescription.textContent = defaultDescription;

      centerPanel.style.stroke = "#e2e8f0";

      clearLines();

      if (center) {
        center.classList.remove("active");
      }
    }

    function activateNode(node) {
      const title = node.dataset.title;

      const description = node.dataset.description;

      const lineId = node.dataset.line;

      const color = node.dataset.color;

      centerTitle.textContent = title;

      centerDescription.textContent = description;

      centerDescription.style.opacity = "0";

      setTimeout(function () {
        centerDescription.style.opacity = "1";
      }, 100);

      clearLines();

      const activeLine = document.getElementById(lineId);

      if (activeLine) {
        activeLine.classList.add("active");
      }

      centerPanel.style.stroke = color;

      if (center) {
        center.classList.add("active");
      }
    }

    nodes.forEach(function (node) {
      node.setAttribute("tabindex", "0");

      node.addEventListener("mouseenter", function () {
        activateNode(node);
      });

      node.addEventListener("mouseleave", function () {
        resetCenter();
      });

      node.addEventListener("focus", function () {
        activateNode(node);
      });

      node.addEventListener("blur", function () {
        resetCenter();
      });
    });
  });
})();
