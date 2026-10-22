(function () {
  "use strict";

  function create(element) {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let enabled = false, destroyed = false, card = null, point = null;
    let revealTimer = 0, hideTimer = 0, frame = 0, settleUntil = 0;

    function hide() {
      clearTimeout(revealTimer);
      clearTimeout(hideTimer);
      cancelAnimationFrame(frame);
      revealTimer = hideTimer = frame = 0;
      card = point = null;
      element.classList.remove("is-visible");
    }

    function position() {
      frame = 0;
      if (!card || !point || !enabled || !finePointer.matches || document.hidden || window.innerWidth <= 760) return hide();
      const surface = card.querySelector(".project-image") || card;
      const bounds = surface.getBoundingClientRect();
      const size = element.offsetWidth;
      if (!card.isConnected || card.classList.contains("is-hidden") || bounds.width < size + 16 || bounds.top < 64 ||
          bounds.top > window.innerHeight - 48) return hide();
      const left = Math.max(8, bounds.left + 8);
      const right = Math.min(window.innerWidth - size - 8, bounds.right - size - 8);
      const y = Math.max(8, bounds.top - size * 0.87);
      const candidates = [point.x - size / 2, bounds.left + bounds.width * 0.72 - size / 2,
        bounds.left + bounds.width * 0.28 - size / 2];
      const x = candidates.map(function (value) { return Math.max(left, Math.min(right, value)); })
        .find(function (value) { return canPlace(value, y, size); });
      if (x === undefined) return hide();
      const tilt = Math.max(-4, Math.min(4, (point.x - bounds.left - bounds.width / 2) / 35));
      element.style.transform = "translate3d(" + x + "px," + y + "px,0)";
      element.style.setProperty("--mascot-tilt", tilt + "deg");
      // Keep the character attached while the carousel finishes its slide.
      if (element.classList.contains("is-visible") && performance.now() < settleUntil) {
        frame = requestAnimationFrame(position);
      }
    }

    function canPlace(x, y, size) {
      return [[0.25,0.25],[0.75,0.25],[0.25,0.65],[0.75,0.65],[0.5,0.45]].every(function (sample) {
        const hit = document.elementFromPoint(x + size * sample[0], y + size * sample[1]);
        const control = hit && hit.closest("a,button,input,select,textarea,h1,h2,h3,p,.project-meta");
        return !control || control === card || card.contains(control);
      });
    }

    function schedulePosition() {
      if (!frame) frame = requestAnimationFrame(position);
    }

    function findCard(target) {
      return target instanceof Element ? target.closest(".orbit-card:not(.is-hidden), .project-card") : null;
    }

    function over(event) {
      if (!enabled || !finePointer.matches || event.pointerType !== "mouse") return;
      const next = findCard(event.target);
      if (!next) return;
      clearTimeout(hideTimer);
      hideTimer = 0;
      point = { x: event.clientX, y: event.clientY };
      if (next === card) return schedulePosition();
      hide();
      card = next;
      point = { x: event.clientX, y: event.clientY };
      settleUntil = performance.now() + 1200;
      position();
      if (!card) return;
      revealTimer = setTimeout(function () {
        revealTimer = 0;
        if (!card || !enabled || !finePointer.matches || document.hidden) return;
        element.classList.add("is-visible");
        cancelAnimationFrame(frame);
        position();
      }, 280);
    }

    function move(event) {
      if (!card || event.pointerType !== "mouse") return;
      point = { x: event.clientX, y: event.clientY };
      schedulePosition();
    }

    function out(event) {
      if (!card || findCard(event.relatedTarget) === card) return;
      clearTimeout(revealTimer);
      revealTimer = 0;
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hide, 120);
    }

    const events = [
      [document, "pointerover", over], [document, "pointermove", move],
      [document, "pointerout", out], [document, "pointerdown", hide],
      [document, "visibilitychange", hide], [document, "pointerleave", hide],
      [window, "scroll", hide], [window, "resize", hide], [window, "blur", hide],
      [finePointer, "change", hide],
    ];
    events.forEach(function (entry) { entry[0].addEventListener(entry[1], entry[2], { passive: true }); });

    return {
      configure: function (options) {
        enabled = !destroyed && options.motion && !options.paused;
        if (!enabled) hide();
      },
      destroy: function () {
        destroyed = true;
        enabled = false;
        hide();
        events.forEach(function (entry) { entry[0].removeEventListener(entry[1], entry[2]); });
      },
    };
  }

  window.PortfolioMascot = { create: create };
})();
