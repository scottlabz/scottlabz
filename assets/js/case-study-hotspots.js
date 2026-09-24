(function () {
  var popover = document.createElement("div");
  popover.className = "hotspot-popover";
  popover.setAttribute("role", "tooltip");
  document.body.appendChild(popover);
  var activePin = null;

  function closePopover() {
    popover.classList.remove("is-open");
    if (activePin) {
      activePin.setAttribute("aria-expanded", "false");
      activePin = null;
    }
  }

  function openPopover(pin) {
    var note = document.getElementById(pin.dataset.target);
    if (!note) return;
    popover.innerHTML = note.innerHTML;
    popover.classList.add("is-open");

    var pinRect = pin.getBoundingClientRect();
    var popRect = popover.getBoundingClientRect();
    var scrollX = window.scrollX;
    var scrollY = window.scrollY;

    var left = pinRect.left + scrollX + pinRect.width / 2 - popRect.width / 2;
    var minLeft = scrollX + 12;
    var maxLeft = scrollX + window.innerWidth - popRect.width - 12;
    if (maxLeft < minLeft) maxLeft = minLeft;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    var top = pinRect.bottom + scrollY + 12;
    if (pinRect.bottom + popRect.height + 24 > window.innerHeight) {
      top = pinRect.top + scrollY - popRect.height - 12;
    }

    popover.style.left = left + "px";
    popover.style.top = top + "px";

    if (activePin && activePin !== pin) {
      activePin.setAttribute("aria-expanded", "false");
    }
    activePin = pin;
    pin.setAttribute("aria-expanded", "true");
  }

  document.addEventListener("click", function (e) {
    var pin = e.target.closest(".hotspot-pin[data-target]");
    if (pin) {
      if (activePin === pin) {
        closePopover();
      } else {
        openPopover(pin);
      }
      return;
    }
    if (!e.target.closest(".hotspot-popover")) {
      closePopover();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePopover();
  });

  window.addEventListener("resize", closePopover);
})();
