(function () {
  "use strict";

  function create(background, ribbon) {
    const context = background.getContext("2d", { alpha: true });
    const ink = ribbon.getContext("2d", { alpha: true });
    if (!context || !ink) return null;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const scene = background.parentElement;
    const points = [];
    const lifetime = 850;
    let width = 1, height = 1, frame = 0, elapsed = 0, previousTime = 0;
    let lastBackground = -Infinity, motion = false, paused = false, destroyed = false;
    let cursor = null, distance = 0, targetX = 0, targetY = 0, offsetX = 0, offsetY = 0;

    function size(canvas, maximumPixels) {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5,
        Math.sqrt(maximumPixels / (width * height)));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      canvas.getContext("2d").setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    }

    function clearRibbon() {
      points.length = 0;
      cursor = null;
      ink.clearRect(0, 0, width, height);
    }

    function resize() {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      size(background, 1600000);
      size(ribbon, 2200000);
      clearRibbon();
      drawBackground();
    }

    function drawBackground() {
      context.clearRect(0, 0, width, height);
      const time = elapsed * 0.00013;
      const compact = width < 760;
      const lines = compact ? 7 : 12;
      const steps = compact ? 30 : 54;
      context.lineWidth = 0.8;
      // Two translucent contour bands, with open space between them for the work.
      for (let band = 0; band < 2; band++) {
        for (let line = 0; line < lines; line++) {
          const spread = line / (lines - 1) - 0.5;
          const gradient = context.createLinearGradient(0, 0, width, height);
          const alpha = (band ? 0.075 : 0.11) * (1 - Math.abs(spread) * 0.8);
          gradient.addColorStop(0, "rgba(92, 208, 224, 0)");
          gradient.addColorStop(0.25, "rgba(104, 208, 232, " + alpha + ")");
          gradient.addColorStop(0.62, "rgba(151, 134, 226, " + alpha * 1.1 + ")");
          gradient.addColorStop(1, "rgba(100, 174, 206, 0)");
          context.strokeStyle = gradient;
          context.beginPath();
          for (let step = 0; step <= steps; step++) {
            const x = width * step / steps;
            const u = step / steps;
            const y = height * (band ? 0.75 : 0.28)
              + Math.sin(u * 4.5 + time + band * 2.4) * height * 0.17
              + Math.sin(u * 7.5 - time * 0.7 + band) * height * 0.045
              + spread * (42 + Math.sin(u * Math.PI) * height * 0.13)
              + offsetY * 18 + Math.sin(u * Math.PI) * offsetX * 22;
            if (step) context.lineTo(x, y); else context.moveTo(x, y);
          }
          context.stroke();
        }
      }
    }

    function pointerMove(event) {
      if (!motion || paused || document.hidden || event.pointerType === "touch" || !finePointer.matches) return;
      targetX = event.clientX / width - 0.5;
      targetY = event.clientY / height - 0.5;
      // Keep photographs, video playback and typing surfaces free of the ribbon.
      if (event.target instanceof Element && event.target.closest(
        "dialog, video, iframe, input, textarea, select, .project-image, .about-portrait, .orbit-card, .reel-card")) {
        cursor = null;
        if (points.length) points[points.length - 1].end = true;
        return;
      }
      const now = performance.now();
      if (!cursor || now - cursor.time > 160) {
        if (points.length) points[points.length - 1].end = true;
        cursor = { x: event.clientX, y: event.clientY, time: now };
        return;
      }
      const length = Math.hypot(event.clientX - cursor.x, event.clientY - cursor.y);
      if (length < 2) return;
      if (length > Math.max(width, height) * 0.7) { cursor = null; return; }
      if (!points.length || points[points.length - 1].end) {
        points.push({ x: cursor.x, y: cursor.y, time: now, hue: (205 + distance * 0.32) % 360 });
      }
      distance += length;
      points.push({ x: event.clientX, y: event.clientY, time: now, hue: (205 + distance * 0.32) % 360 });
      if (points.length > 72) points.splice(0, points.length - 72);
      cursor = { x: event.clientX, y: event.clientY, time: now };
    }

    function leave() {
      cursor = null;
      if (points.length) points[points.length - 1].end = true;
      targetX = 0;
      targetY = 0;
    }

    function drawRibbon(now) {
      ink.clearRect(0, 0, width, height);
      while (points.length && now - points[0].time > lifetime) points.shift();
      if (points.length < 2) return;
      ink.globalCompositeOperation = "lighter";
      ink.lineCap = "round";
      ink.lineJoin = "round";
      for (let index = 1; index < points.length; index++) {
        const from = points[index - 1], to = points[index];
        if (from.end) continue;
        const fade = Math.pow(Math.max(0, 1 - (now - to.time) / lifetime), 1.7);
        const gradient = ink.createLinearGradient(from.x, from.y, to.x + 0.01, to.y + 0.01);
        gradient.addColorStop(0, "hsla(" + from.hue + ", 88%, 72%, " + fade * 0.65 + ")");
        gradient.addColorStop(1, "hsla(" + to.hue + ", 88%, 72%, " + fade * 0.65 + ")");
        ink.strokeStyle = gradient;
        ink.globalAlpha = 0.15;
        ink.lineWidth = 11 * fade + 1;
        ink.beginPath();
        ink.moveTo(from.x, from.y);
        ink.lineTo(to.x, to.y);
        ink.stroke();
        ink.globalAlpha = 0.95;
        ink.lineWidth = 1.4 * fade + 0.2;
        ink.stroke();
      }
      ink.globalAlpha = 1;
      ink.globalCompositeOperation = "source-over";
    }

    function animate(now) {
      frame = 0;
      if (!motion || paused || document.hidden || destroyed) return;
      elapsed += previousTime ? Math.min(now - previousTime, 50) : 0;
      previousTime = now;
      offsetX += (targetX - offsetX) * 0.035;
      offsetY += (targetY - offsetY) * 0.035;
      if (now - lastBackground >= (width < 760 ? 50 : 33)) {
        drawBackground();
        lastBackground = now;
      }
      if (finePointer.matches && points.length) drawRibbon(now);
      frame = requestAnimationFrame(animate);
    }

    function sync() {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      scene.style.setProperty("--ambient-play-state", motion && !paused && !document.hidden ? "running" : "paused");
      if (motion && !paused && !document.hidden && !destroyed) {
        lastBackground = -Infinity;
        frame = requestAnimationFrame(animate);
      } else {
        clearRibbon();
        if (!motion) { elapsed = 0; offsetX = 0; offsetY = 0; drawBackground(); }
      }
    }

    function pointerOut(event) { if (!event.relatedTarget) leave(); }
    function changePointer() { clearRibbon(); }
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", pointerMove, { passive: true });
    window.addEventListener("blur", leave);
    document.addEventListener("pointerout", pointerOut, { passive: true });
    document.addEventListener("visibilitychange", sync);
    finePointer.addEventListener("change", changePointer);
    resize();

    return {
      configure: function (options) {
        motion = !!options.motion;
        paused = !!options.paused;
        sync();
      },
      destroy: function () {
        destroyed = true;
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", pointerMove);
        window.removeEventListener("blur", leave);
        document.removeEventListener("pointerout", pointerOut);
        document.removeEventListener("visibilitychange", sync);
        finePointer.removeEventListener("change", changePointer);
        clearRibbon();
        context.clearRect(0, 0, width, height);
      },
    };
  }

  window.PortfolioAmbient = { create: create };
})();
