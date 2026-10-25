(function () {
  "use strict";

  function create(element) {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const automatic = window.matchMedia("(max-width: 760px), (hover: none), (pointer: coarse)");
    const shown = new WeakSet();
    let enabled = false, destroyed = false, card = null, point = null;
    let revealTimer = 0, hideTimer = 0, frame = 0, settleUntil = 0;
    let autoTimer = 0, nextAutoAt = 0;

    function hide() {
      clearTimeout(revealTimer);
      clearTimeout(hideTimer);
      clearTimeout(autoTimer);
      cancelAnimationFrame(frame);
      revealTimer = hideTimer = autoTimer = frame = 0;
      card = point = null;
      element.classList.remove("is-visible");
    }

    function position() {
      frame = 0;
      if (!card || !point || !enabled || document.hidden || (!automatic.matches && !finePointer.matches)) return hide();
      const surface = card.querySelector(".contact-mascot-edge, .project-image") || card;
      const bounds = surface.getBoundingClientRect();
      const size = element.offsetWidth;
      if (!card.isConnected || card.classList.contains("is-hidden") || bounds.width < size + 16 || bounds.top < size * 0.87 + 8 ||
          bounds.top > window.innerHeight - 48) return hide();
      const left = Math.max(8, bounds.left + 8);
      const right = Math.min(window.innerWidth - size - 8, bounds.right - size - 8);
      const y = bounds.top - size * 0.87;
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
      return target instanceof Element ? target.closest(".orbit-card:not(.is-hidden), .project-card, [data-mascot]") : null;
    }

    function setPose(next) {
      const pose = next.getAttribute("data-mascot") || (next.classList.contains("orbit-card") ? "peek" : "work");
      element.setAttribute("data-pose", ["peek", "work", "wave", "contact"].includes(pose) ? pose : "peek");
    }

    function scheduleAuto(delay) {
      clearTimeout(autoTimer);
      autoTimer = 0;
      if (!enabled || !automatic.matches || document.hidden) return;
      autoTimer = setTimeout(autoPeek, delay);
    }

    function autoPeek() {
      autoTimer = 0;
      if (!enabled || !automatic.matches || document.hidden) return;
      const remaining = nextAutoAt - performance.now();
      if (remaining > 0) return scheduleAuto(remaining);
      // Scan only after scrolling settles; the catalogue has a small number of cards.
      const candidates = Array.from(document.querySelectorAll(".orbit-card.is-active, .project-card, [data-mascot]"))
        .filter(function (next) { return !shown.has(next); })
        .map(function (next) {
          const surface = next.querySelector(".contact-mascot-edge, .project-image") || next;
          return { next: next, bounds: surface.getBoundingClientRect() };
        })
        .filter(function (item) {
          return item.bounds.width > 0 && item.bounds.top > 0 && item.bounds.top < window.innerHeight * 0.78;
        })
        .sort(function (a, b) {
          return Math.abs(a.bounds.top - window.innerHeight * 0.45) - Math.abs(b.bounds.top - window.innerHeight * 0.45);
        });
      for (const candidate of candidates) {
        hide();
        card = candidate.next;
        point = { x: candidate.bounds.left + candidate.bounds.width * 0.72, y: candidate.bounds.top };
        setPose(card);
        settleUntil = performance.now() + 1200;
        position();
        if (!card) continue;
        const next = card;
        const image = element.querySelector(".mascot-pose-" + element.getAttribute("data-pose") + " .mascot-body img");
        const ready = image && image.decode ? image.decode() : Promise.resolve();
        ready.then(function () {
          if (card !== next || !enabled || !automatic.matches || document.hidden) return;
          revealTimer = setTimeout(function () {
            revealTimer = 0;
            if (card !== next || !enabled || !automatic.matches || document.hidden) return;
            position();
            if (!card) return;
            element.classList.add("is-visible");
            shown.add(next);
            nextAutoAt = performance.now() + 7000;
            hideTimer = setTimeout(hide, 2200);
          }, 140);
        }, function () { if (card === next) hide(); });
        break;
      }
    }

    function scroll() {
      hide();
      scheduleAuto(450);
    }

    function wake() {
      hide();
      scheduleAuto(600);
    }

    function release() {
      if (automatic.matches) scheduleAuto(650);
    }

    function leave() {
      // Touch pointers leave the document when the finger lifts after scrolling.
      if (!automatic.matches) hide();
    }

    function over(event) {
      if (!enabled || automatic.matches || !finePointer.matches || event.pointerType !== "mouse") return;
      const next = findCard(event.target);
      if (!next) return;
      clearTimeout(hideTimer);
      hideTimer = 0;
      point = { x: event.clientX, y: event.clientY };
      if (next === card) return schedulePosition();
      hide();
      card = next;
      setPose(next);
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
      if (!card || automatic.matches || event.pointerType !== "mouse") return;
      point = { x: event.clientX, y: event.clientY };
      schedulePosition();
    }

    function out(event) {
      if (!card || automatic.matches || findCard(event.relatedTarget) === card) return;
      clearTimeout(revealTimer);
      revealTimer = 0;
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hide, 120);
    }

    const events = [
      [document, "pointerover", over], [document, "pointermove", move],
      [document, "pointerout", out], [document, "pointerdown", hide],
      [document, "pointerup", release], [document, "pointercancel", release],
      [document, "visibilitychange", wake], [document, "pointerleave", leave],
      [window, "scroll", scroll], [window, "resize", wake], [window, "blur", hide], [window, "focus", wake],
      [finePointer, "change", wake], [automatic, "change", wake],
    ];
    events.forEach(function (entry) { entry[0].addEventListener(entry[1], entry[2], { passive: true }); });

    return {
      configure: function (options) {
        enabled = !destroyed && options.motion && !options.paused;
        if (!enabled) hide();
        else scheduleAuto(600);
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
