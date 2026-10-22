(function () {
  "use strict";

  const { React, ReactDOM, Mu: Arrow, Yo: Left, Lo: Right, bf: Play,
    Jo: Pause, Ef: Close, Ko: Menu, Xo: Copy, Go: Check } = window.PortfolioRuntime;
  const { createElement: h, useState, useEffect, useRef } = React;
  const site = window.PORTFOLIO_CONFIG;
  const projects = window.PORTFOLIO_CATALOG;
  const count = projects.reduce(function (sum, project) { return sum + project.media.length; }, 0);
  const filters = [
    { id: "all", label: "Все" }, { id: "shorts", label: "Shorts / Reels" },
    { id: "real-estate", label: "Недвижимость" }, { id: "hotels", label: "Отели" },
    { id: "yoga", label: "Йога" },
  ];
  function mediaUrl(path) {
    return site.mediaBaseUrl && path.startsWith("assets/video/")
      ? site.mediaBaseUrl.replace(/\/$/, "") + "/" + path.slice("assets/video/".length) : path;
  }
  function time(seconds) {
    const total = Math.floor(seconds);
    const minutes = Math.floor(total / 60);
    return (minutes >= 60 ? Math.floor(minutes / 60) + ":" + String(minutes % 60).padStart(2, "0") : minutes) +
      ":" + String(total % 60).padStart(2, "0");
  }
  function projectCount(number) {
    const last = number % 10;
    const teen = number % 100 >= 11 && number % 100 <= 14;
    return number + " " + (teen ? "проектов" : last === 1 ? "проект" : last >= 2 && last <= 4 ? "проекта" : "проектов");
  }
  function icon(Icon, props) {
    return h(Icon, Object.assign({ "aria-hidden": true, weight: "light" }, props));
  }
  function IconButton(props) {
    const rest = Object.assign({}, props);
    delete rest.label;
    delete rest.children;
    return h("button", Object.assign({
      type: "button", className: "icon-button", "aria-label": props.label, title: props.label,
    }, rest), props.children);
  }
  function PlayMark(props) {
    return h("span", { className: "play-mark" + (props.small ? " small" : ""), "aria-hidden": true },
      icon(Play, { weight: "fill" }));
  }
  function useDialog(ref) {
    useEffect(function () {
      const dialog = ref.current;
      const previous = document.activeElement;
      const overflow = document.body.style.overflow;
      if (!dialog.open) dialog.showModal();
      document.body.style.overflow = "hidden";
      return function () {
        if (dialog.open) dialog.close();
        document.body.style.overflow = overflow;
        if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
      };
    }, [ref]);
  }
  function getMotionPreference() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    try { return localStorage.getItem("portfolio-motion") !== "off"; } catch (_) { return true; }
  }

  function AmbientBackdrop(props) {
    const background = useRef(null);
    const ribbon = useRef(null);
    const renderer = useRef(null);
    useEffect(function () {
      if (!window.PortfolioAmbient) return;
      renderer.current = window.PortfolioAmbient.create(background.current, ribbon.current);
      return function () { if (renderer.current) renderer.current.destroy(); };
    }, []);
    useEffect(function () {
      if (renderer.current) renderer.current.configure({ motion: props.motion, paused: props.paused });
    }, [props.motion, props.paused]);
    return h(React.Fragment, {},
      h("div", { className: "ambient-backdrop" + (props.motion ? "" : " is-static") +
        (props.paused ? " is-paused" : ""), "aria-hidden": true },
        h("div", { className: "ambient-glow ambient-glow-cyan" }),
        h("div", { className: "ambient-glow ambient-glow-violet" }),
        h("div", { className: "ambient-glow ambient-glow-teal" }),
        h("canvas", { ref: background, className: "ambient-contours" })),
      h("canvas", { ref: ribbon, className: "pointer-ribbon" +
        (!props.motion || props.paused ? " is-hidden" : ""), "aria-hidden": true }),
    );
  }

  function SiteMascot(props) {
    const element = useRef(null);
    const mascot = useRef(null);
    useEffect(function () {
      if (!window.PortfolioMascot) return;
      mascot.current = window.PortfolioMascot.create(element.current);
      return function () { if (mascot.current) mascot.current.destroy(); };
    }, []);
    useEffect(function () {
      if (mascot.current) mascot.current.configure({ motion: props.motion, paused: props.paused });
    }, [props.motion, props.paused]);
    const poses = { peek: "gennady-mascot-v2", work: "gennady-work-v1", wave: "gennady-wave-v1", contact: "gennady-contact-v1" };
    return h("div", { className: "site-mascot", ref: element, "aria-hidden": true, "data-pose": "peek" },
      Object.keys(poses).map(function (pose) {
        const image = { src: "assets/images/" + poses[pose] + ".webp", alt: "", width: 512, height: 512, draggable: false };
        return h("div", { key: pose, className: "mascot-pose mascot-pose-" + pose },
          h("div", { className: "mascot-body" }, h("img", image)),
          h("div", { className: "mascot-hands" }, h("img", image)));
      }));
  }

  function Orbit(props) {
    const featured = ["estate-talk", "estate-tours", "yoga-shorts", "hotels"].map(function (id) {
      return projects.find(function (project) { return project.id === id; });
    });
    const [selected, setSelected] = useState(0);
    const [drag, setDrag] = useState(0);
    const pointer = useRef(null);
    const dragged = useRef(false);
    const timer = useRef(null);
    useEffect(function () { return function () { clearTimeout(timer.current); }; }, []);
    const select = function (index) {
      setSelected((index + featured.length) % featured.length);
    };
    function pointerDown(event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      clearTimeout(timer.current);
      pointer.current = { x: event.clientX, y: event.clientY };
      dragged.current = false;
    }
    function pointerMove(event) {
      if (!pointer.current) return;
      const distance = event.clientX - pointer.current.x;
      const vertical = event.clientY - pointer.current.y;
      if (Math.abs(distance) > 10 && Math.abs(distance) > Math.abs(vertical)) {
        dragged.current = true;
        setDrag(Math.max(-100, Math.min(100, distance)));
      }
    }
    function pointerUp(event) {
      if (!pointer.current) return;
      const distance = event.clientX - pointer.current.x;
      if (dragged.current && Math.abs(distance) > 35) select(selected + (distance < 0 ? 1 : -1));
      pointer.current = null;
      setDrag(0);
      timer.current = setTimeout(function () { dragged.current = false; }, 0);
    }
    function keyDown(event) {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        select(selected + (event.key === "ArrowRight" ? 1 : -1));
      }
    }
    return h("div", {
      className: "carousel" + (props.motion ? "" : " motion-off"), role: "region",
      "aria-roledescription": "карусель", "aria-label": "Избранные работы", onKeyDown: keyDown,
    },
      h("div", {
        className: "orbit-track", style: { "--drag": drag + "px" },
        onPointerDown: pointerDown, onPointerMove: pointerMove, onPointerUp: pointerUp,
        onPointerCancel: function () { pointer.current = null; dragged.current = false; setDrag(0); },
        onPointerLeave: function (event) { if (event.pointerType === "mouse") pointerUp(event); },
      }, featured.map(function (project, index) {
        let offset = (index - selected + featured.length) % featured.length;
        if (offset > featured.length / 2) offset -= featured.length;
        const visible = Math.abs(offset) < 2;
        return h("button", {
          key: project.id, type: "button",
          className: "orbit-card" + (offset === 0 ? " is-active" : "") +
            (visible ? "" : " is-hidden") + (project.portrait ? "" : " wide-project"),
          style: { "--offset": offset, "--depth": Math.abs(offset) },
          tabIndex: visible ? 0 : -1, "aria-hidden": !visible,
          "aria-label": (offset === 0 ? "Открыть проект: " : "Выбрать проект: ") + project.title,
          onClick: function (event) {
            if (event.detail !== 0 && dragged.current) { dragged.current = false; return; }
            if (offset === 0) props.onOpen(project); else select(index);
          },
        },
          h("img", { src: project.poster, alt: "", style: { objectPosition: project.coverPosition }, draggable: false, fetchPriority: visible ? "high" : "auto" }),
          h(PlayMark, {}),
          h("span", { className: "orbit-label" }, project.title),
          h("span", { className: "orbit-count" }, project.media.length + " видео"),
        );
      })),
      h("div", { className: "carousel-controls" },
        h("p", { className: "selected-name", "aria-live": "polite" }, featured[selected].title),
        h("div", { className: "slider-controls" },
          h(IconButton, { label: "Предыдущая работа", onClick: function () { select(selected - 1); } }, icon(Left)),
          h("div", { className: "slider-rail" },
            h("input", {
              "aria-label": "Выбрать работу в карусели", type: "range", min: 0, max: featured.length - 1,
              value: selected, onChange: function (event) { select(Number(event.target.value)); },
            }),
            h("div", { className: "slider-ticks", "aria-hidden": true },
              featured.map(function (project) { return h("span", { key: project.id }); })),
          ),
          h(IconButton, { label: "Следующая работа", onClick: function () { select(selected + 1); } }, icon(Right)),
        ),
        h("p", { className: "drag-hint" }, String(selected + 1).padStart(2, "0") + " / 04"),
      ),
    );
  }

  function ProjectCard(props) {
    const project = props.project;
    return h("button", {
      type: "button", className: "project-card" + (props.featured ? " featured" : ""),
      onClick: function () { props.onOpen(project); }, "aria-label": "Открыть проект: " + project.title,
    },
      h("div", { className: "project-image", style: { "--aspect": project.aspect } },
        h("img", { src: project.poster, alt: "", style: { objectPosition: project.coverPosition }, loading: "lazy", decoding: "async" }),
        h(PlayMark, { small: !props.featured }),
        props.featured ? h("div", { className: "featured-title" },
          h("span", {}, "ОБЗОРЫ ОТЕЛЕЙ"), h("h3", {}, project.title)) : null,
        h("span", { className: "media-count" }, project.media.length === 1
          ? (project.media[0].isExcerpt ? "Фрагмент " + time(project.media[0].playbackDuration) : time(project.media[0].duration))
          : project.media.length + " видео"),
      ),
      !props.featured ? h("div", { className: "project-meta" },
        h("div", {}, h("h3", {}, project.title), h("p", {}, project.subtitle)), icon(Arrow)) : null,
    );
  }

  function ShowreelDialog(props) {
    const dialog = useRef(null);
    const video = useRef(null);
    const closeTimer = useRef(null);
    const closing = useRef(false);
    const [isClosing, setClosing] = useState(false);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);
    useDialog(dialog);
    useEffect(function () {
      const playback = video.current.play();
      if (playback) playback.catch(function () { /* Native controls remain available if autoplay is blocked. */ });
    }, [retry]);
    useEffect(function () { return function () { clearTimeout(closeTimer.current); }; }, []);
    function close() {
      if (closing.current) return;
      closing.current = true;
      video.current.pause();
      if (!props.motion) { props.onClose(); return; }
      setClosing(true);
      closeTimer.current = setTimeout(props.onClose, 220);
    }
    return h("dialog", {
      ref: dialog,
      className: "showreel-modal" + (isClosing ? " is-closing" : "") + (props.motion ? "" : " is-static"),
      "aria-label": "Шоурил Геннадия",
      onCancel: function (event) { event.preventDefault(); close(); },
      onClick: function (event) { if (event.target === dialog.current) close(); },
    },
      h("div", { className: "showreel-player" },
        h(IconButton, { label: "Закрыть шоурил", className: "icon-button showreel-close", onClick: close }, icon(Close)),
        h("video", {
          ref: video, key: retry, controls: true, autoPlay: true, playsInline: true, preload: "auto",
          src: mediaUrl(site.showreel), poster: site.showreelPoster, "aria-label": "Шоурил Геннадия",
          onError: function () { setError(true); },
        }),
        error ? h("div", { className: "showreel-error error-message", role: "alert" },
          h("p", {}, "Не удалось загрузить шоурил."),
          h("button", {
            type: "button", className: "soft-button", onClick: function () { setError(false); setRetry(retry + 1); },
          }, "Повторить загрузку")) : null,
      ),
    );
  }

  function ProjectDialog(props) {
    const project = props.project;
    const dialog = useRef(null);
    const [selected, setSelected] = useState(0);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);
    const current = project.media[selected];
    useDialog(dialog);
    function choose(index) { setSelected(index); setError(false); setRetry(0); }
    return h("dialog", {
      ref: dialog, className: "project-modal", "aria-labelledby": "project-title",
      onCancel: props.onClose, onClick: function (event) { if (event.target === dialog.current) props.onClose(); },
    },
      h("div", { className: "modal-shell" },
        h("div", { className: "modal-header" },
          h("span", {}, project.subtitle),
          h(IconButton, { label: "Закрыть просмотр", onClick: props.onClose }, icon(Close)),
        ),
        h("div", { className: "modal-body " + (current.portrait ? "portrait" : "landscape") },
          h("div", { className: "player-column" },
            h("div", { className: "media-stage", style: { "--media-aspect": current.aspect } },
              current.embedUrl ? h("iframe", {
                key: current.id + "-" + retry, src: current.embedUrl + "&autoplay=1", title: current.title,
                className: "external-player", allowFullScreen: true,
                allow: "autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock",
                referrerPolicy: "strict-origin-when-cross-origin",
                onError: function () { setError(true); },
              }) : h("video", {
                key: current.id + "-" + retry, controls: true, playsInline: true,
                autoPlay: true, preload: "metadata", poster: current.poster, src: mediaUrl(current.src),
                "aria-label": current.title, onError: function () { setError(true); },
              }),
            ),
            h("div", { className: "player-caption" },
              h("span", {}, current.title),
              h("span", {}, current.isExcerpt
                ? "Фрагмент " + time(current.playbackDuration) + " / " + time(current.duration)
                : time(current.duration)),
            ),
            current.isExcerpt ? h("p", { className: "excerpt-note" },
              "Фрагмент работы. Полная длительность — " + time(current.duration) + ".") : null,
            error ? h("div", { className: "error-message", role: "alert" },
              h("p", {}, "Не удалось загрузить видео. Попробуй ещё раз."),
              h("button", {
                type: "button", className: "soft-button",
                onClick: function () { setError(false); setRetry(retry + 1); },
              }, "Повторить загрузку")) : null,
          ),
          h("div", { className: "project-details" },
            h("h2", { id: "project-title" }, project.title),
            h("p", {}, project.summary),
            project.media.length > 1 ? h("div", { className: "episodes" },
              h("div", { className: "episode-heading" },
                h("span", {}, "РОЛИКИ"),
                h("span", {}, String(selected + 1).padStart(2, "0") + " / " + project.media.length),
              ),
              h("div", { className: "episode-list", "aria-label": "Ролики проекта" },
                project.media.map(function (item, index) {
                  return h("button", {
                    key: item.id, type: "button", className: selected === index ? "active" : "",
                    "aria-pressed": selected === index, onClick: function () { choose(index); },
                  },
                    h("img", { src: item.poster, alt: "", loading: "lazy" }),
                    h("span", {}, h("small", {}, String(index + 1).padStart(2, "0")),
                      item.title, h("small", { className: "episode-time" }, time(item.duration) +
                        (item.isExcerpt ? " · фрагмент " + time(item.playbackDuration) : ""))),
                    icon(Play, { weight: "fill" }),
                  );
                }),
              ),
              h("div", { className: "episode-navigation" },
                h(IconButton, {
                  label: "Предыдущий ролик", disabled: selected === 0,
                  onClick: function () { choose(selected - 1); },
                }, icon(Left)),
                h(IconButton, {
                  label: "Следующий ролик", disabled: selected === project.media.length - 1,
                  onClick: function () { choose(selected + 1); },
                }, icon(Right)),
              ),
            ) : null,
            h("a", { className: "project-contact", href: site.telegram, target: "_blank", rel: "noopener noreferrer" },
              "Обсудить проект", icon(Arrow)),
          ),
        ),
      ),
    );
  }

  function ContactDialog(props) {
    const dialog = useRef(null);
    const [format, setFormat] = useState("Shorts / Reels");
    const [task, setTask] = useState("");
    const [copied, setCopied] = useState(false);
    const [fallback, setFallback] = useState(false);
    useDialog(dialog);
    const brief = "Геннадий, привет! Хочу обсудить проект.\nФормат работы: " + format + ".\n" +
      (task.trim() || "Расскажу о задаче и пришлю материалы.");
    async function copyBrief() {
      try {
        if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(brief);
        else {
          const field = document.createElement("textarea");
          field.value = brief;
          field.style.cssText = "position:fixed;opacity:0";
          dialog.current.appendChild(field);
          field.select();
          const success = document.execCommand("copy");
          field.remove();
          if (!success) throw new Error("copy");
        }
        setCopied(true); setFallback(false);
      } catch (_) { setFallback(true); }
    }
    return h("dialog", {
      ref: dialog, className: "contact-modal", "aria-labelledby": "contact-title",
      onCancel: props.onClose, onClick: function (event) { if (event.target === dialog.current) props.onClose(); },
    },
      h("div", { className: "contact-modal-content" },
        h("div", { className: "modal-header" },
          h(IconButton, { label: "Закрыть контакты", onClick: props.onClose }, icon(Close))),
        h("h2", { id: "contact-title" }, "ОБСУДИМ ПРОЕКТ"),
        h("p", {}, "Расскажи о задаче и о том, какой контент хочешь выпускать."),
        h("a", { className: "primary-button telegram-button", href: site.telegram,
          target: "_blank", rel: "noopener noreferrer" }, "Написать в Telegram", icon(Arrow)),
        h("div", { className: "contact-alternatives" },
          h("a", { href: "tel:" + site.phone }, site.phoneLabel),
          h("a", { href: "mailto:" + site.email }, site.email)),
        h("form", { className: "brief-form", onSubmit: function (event) { event.preventDefault(); copyBrief(); } },
          h("p", { className: "brief-intro" }, "Подготовить сообщение"),
          h("label", {}, "Формат работы",
            h("select", { value: format, onChange: function (event) { setFormat(event.target.value); setCopied(false); } },
              ["Shorts / Reels", "Обзор / видео 16:9", "Серия роликов", "Полное ведение контента", "Событие / личная история"].map(function (label) {
                return h("option", { key: label }, label);
              }))),
          h("label", {}, "Задача",
            h("textarea", {
              rows: 3, maxLength: 4000, value: task,
              placeholder: "Что нужно сделать, для каких площадок и в какие сроки?",
              onChange: function (event) { setTask(event.target.value); setCopied(false); },
            })),
          h("button", { type: "submit", className: "soft-button copy-brief" },
            icon(copied ? Check : Copy), copied ? "Сообщение скопировано" : "Скопировать сообщение"),
          h("p", { className: "contact-note", role: "status" }, copied
            ? "Отправь сообщение в Telegram или по почте."
            : "Скопируй сообщение и отправь его в Telegram или по почте."),
          h("a", { className: "contact-privacy", href: "privacy.html", target: "_blank", rel: "noopener" }, "Политика конфиденциальности"),
          fallback ? h("label", { className: "copy-fallback" }, "Скопируй текст вручную",
            h("textarea", { readOnly: true, value: brief, rows: 4, onFocus: function (event) { event.target.select(); } })) : null,
        ),
      ),
    );
  }

  function ShowreelSection(props) {
    const video = useRef(null);
    const wrapper = useRef(null);
    useEffect(function () {
      const element = video.current;
      let visible = false;
      function updatePlayback() {
        if (visible && props.motion && !props.modalOpen && !document.hidden) {
          element.play().catch(function () {});
        } else element.pause();
      }
      const observer = new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        updatePlayback();
      }, { threshold: 0.2 });
      observer.observe(wrapper.current);
      document.addEventListener("visibilitychange", updatePlayback);
      return function () { observer.disconnect(); document.removeEventListener("visibilitychange", updatePlayback); element.pause(); };
    }, [props.motion, props.modalOpen]);
    return h("section", { className: "showreel-section section-container", id: "showreel", ref: wrapper },
      h("div", { className: "section-side" },
        h("h2", { className: "display-title smaller" }, "ШОУРИЛ"),
      ),
      h("button", { type: "button", className: "reel-card", onClick: props.onPlay,
        "aria-label": "Смотреть шоурил Геннадия" },
        h("video", { ref: video, muted: true, loop: true, playsInline: true, preload: "none",
          poster: site.showreelPoster, src: mediaUrl(site.showreelLoop), "aria-hidden": true, tabIndex: -1 }),
        h("div", { className: "reel-shade" }),
        h(PlayMark, {}),
        h("div", { className: "reel-caption" }, h("span", {}, time(site.showreelDuration)),
          h("span", { className: "reel-action" }, "Смотреть шоурил", icon(Arrow))),
      ),
    );
  }

  function App() {
    const [filter, setFilter] = useState("all");
    const [activeProject, setActiveProject] = useState(null);
    const [contact, setContact] = useState(false);
    const [menu, setMenu] = useState(false);
    const [motion, setMotion] = useState(getMotionPreference);
    const hero = useRef(null);
    const frame = useRef(null);
    const mainProjects = projects.filter(function (project) { return project.category !== "stories"; });
    const visible = mainProjects.filter(function (project) {
      return filter === "all" || (filter === "shorts" ? project.format === "shorts" : project.category === filter);
    });
    const featured = visible.find(function (project) { return project.id === "hotels"; });
    const stories = projects.filter(function (project) { return project.category === "stories"; });
    const closeMenu = function () { setMenu(false); };
    const showContact = function () { closeMenu(); setContact(true); };
    const playReel = function () { closeMenu(); setActiveProject({ id: "showreel" }); };
    useEffect(function () {
      document.documentElement.style.scrollBehavior = motion ? "smooth" : "auto";
      try { localStorage.setItem("portfolio-motion", motion ? "on" : "off"); } catch (_) {}
      return function () { cancelAnimationFrame(frame.current); };
    }, [motion]);
    useEffect(function () {
      // React creates section anchors after the browser's initial fragment navigation.
      const target = document.getElementById(window.location.hash.slice(1));
      if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
    }, []);
    useEffect(function () {
      const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
      const update = function (event) { if (event.matches) setMotion(false); };
      preference.addEventListener("change", update);
      return function () { preference.removeEventListener("change", update); };
    }, []);
    useEffect(function () {
      if (!menu) return;
      function closeOnEscape(event) { if (event.key === "Escape") setMenu(false); }
      document.addEventListener("keydown", closeOnEscape);
      return function () { document.removeEventListener("keydown", closeOnEscape); };
    }, [menu]);
    function moveHero(event) {
      if (!motion || event.pointerType === "touch") return;
      const rectangle = hero.current.getBoundingClientRect();
      const x = (event.clientX - rectangle.left) / rectangle.width - 0.5;
      const y = (event.clientY - rectangle.top) / rectangle.height - 0.5;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(function () {
        hero.current.style.setProperty("--pointer-x", x * 10 + "px");
        hero.current.style.setProperty("--pointer-y", y * 7 + "px");
      });
    }
    function resetHero() {
      if (!hero.current) return;
      hero.current.style.setProperty("--pointer-x", "0px");
      hero.current.style.setProperty("--pointer-y", "0px");
    }
    return h("div", { id: "top", className: "site-shell" + (motion ? "" : " reduce-motion") },
      h(AmbientBackdrop, { motion: motion, paused: !!activeProject || contact }),
      h(SiteMascot, { motion: motion, paused: !!activeProject || contact || menu }),
      h("a", { className: "skip-link", href: "#works" }, "Перейти к работам"),
      h("header", { className: "site-header" },
        h("h1", { className: "site-title", "aria-label": "Портфолио" },
          h("a", { className: "wordmark portfolio-wordmark", href: "#top", "aria-label": "Портфолио — наверх" }, "ПОРТФОЛИО")),
        h("nav", { id: "main-nav", "aria-label": "Основная навигация", className: menu ? "menu-open" : "" },
          h("a", { href: "#showreel", onClick: closeMenu }, "Шоурил"),
          h("a", { href: "#works", onClick: closeMenu }, "Работы"),
          h("a", { href: "#about", onClick: closeMenu }, "Обо мне"),
          h("button", { type: "button", className: "contact-button", onClick: showContact }, "Обсудить проект", icon(Arrow)),
        ),
        h(IconButton, {
          label: menu ? "Закрыть меню" : "Открыть меню", className: "icon-button mobile-menu-toggle",
          "aria-expanded": menu, "aria-controls": "main-nav", onClick: function () { setMenu(!menu); },
        }, icon(menu ? Close : Menu)),
      ),
      h("main", {},
        h("section", { className: "hero", ref: hero, onPointerMove: moveHero, onPointerLeave: resetHero },
          h("img", { className: "scene-background", src: "assets/original/be332bd3aa62.webp", alt: "", fetchPriority: "high" }),
          h(Orbit, { onOpen: setActiveProject, motion: motion }),
          h("div", { className: "hero-actions" },
            h("button", { type: "button", className: "hero-reel-button", onClick: playReel },
              icon(Play, { weight: "fill" }), "Смотреть шоурил", h("span", {}, time(site.showreelDuration))),
            h("a", { className: "hero-work-link", href: "#works" }, "Смотреть работы", icon(Arrow)),
          ),
          h("button", {
            type: "button", className: "motion-switch", "aria-pressed": !motion,
            onClick: function () { setMotion(!motion); resetHero(); },
          }, icon(motion ? Pause : Play), motion ? "Уменьшить движение" : "Включить движение"),
        ),
        h(ShowreelSection, { onPlay: playReel, motion: motion, modalOpen: !!activeProject || contact }),
        h("section", { className: "works-section section-container", id: "works" },
          h("div", { className: "section-side" },
            h("h2", { className: "display-title" }, "РАБОТЫ"),
            h("span", { className: "works-total" }, count + " видео"),
          ),
          h("div", { className: "works-content" },
            h("div", { className: "works-toolbar" },
              h("div", { className: "filters", role: "group", "aria-label": "Фильтр работ по направлению" },
                filters.map(function (item) {
                  return h("button", {
                    type: "button", key: item.id, className: filter === item.id ? "active" : "",
                    "aria-pressed": filter === item.id, onClick: function () { setFilter(item.id); },
                  }, item.label);
                })),
              h("p", { className: "filter-status", role: "status", "aria-live": "polite" },
                projectCount(visible.length)),
            ),
            h("div", { className: "filtered-projects", key: filter },
              featured ? h(ProjectCard, { project: featured, featured: true, onOpen: setActiveProject }) : null,
              h("div", { className: "portrait-grid" }, visible.filter(function (project) { return project.id !== "hotels"; })
                .map(function (project) { return h(ProjectCard, { key: project.id, project: project, onOpen: setActiveProject }); })),
            ),
          ),
        ),
        h("section", { className: "stories-section section-container", id: "stories" },
          h("div", { className: "section-side" },
            h("h2", { className: "display-title smaller" }, "ЛИЧНЫЕ", h("br"), "ИСТОРИИ"),
          ),
          h("div", { className: "story-grid" }, stories.map(function (project) {
            return h(ProjectCard, { key: project.id, project: project, onOpen: setActiveProject });
          })),
        ),
        h("section", { className: "about-section section-container", id: "about" },
          h("div", { className: "section-side" },
            h("h2", { className: "display-title smaller" }, "ОБО МНЕ"),
          ),
          h("div", { className: "about-content" },
            h("figure", { className: "about-portrait", "data-mascot": "wave" },
              h("img", {
                src: "assets/images/gennady-studio-v1-640.webp",
                srcSet: "assets/images/gennady-studio-v1-640.webp 640w, assets/images/gennady-studio-v1-1120.webp 1120w",
                sizes: "(max-width: 560px) calc(100vw - 40px), (max-width: 760px) 260px, 320px",
                width: 640, height: 800, loading: "lazy", decoding: "async",
                alt: "Студийный портрет Геннадия",
              }),
            ),
            h("div", { className: "about-copy" },
              h("h3", {}, site.name),
              h("p", {}, "Монтирую видео для соцсетей, обзоры недвижимости и отелей, занятия йогой и личные проекты."),
              h("p", {}, "Беру на себя полное ведение контента: подбираю идеи и референсы для съёмки, составляю контент-план и сопровождаю выпуск роликов."),
              h("ul", { className: "creative-tools", "aria-label": "Программы и инструменты" },
                [
                  { code: "Pr", name: "Premiere Pro", theme: "premiere" },
                  { code: "Ae", name: "After Effects", theme: "after-effects" },
                  { code: "Ps", name: "Photoshop", theme: "photoshop" },
                  { name: "Нейросети", theme: "ai" },
                ].map(function (tool) {
                  return h("li", { key: tool.theme, className: "creative-tool tool-" + tool.theme },
                    h("span", { className: "tool-icon", "aria-hidden": true }, tool.code ||
                      h("svg", { viewBox: "0 0 32 32", fill: "none" },
                        h("path", { d: "M17 6l2.9 8.1L28 17l-8.1 2.9L17 28l-2.9-8.1L6 17l8.1-2.9L17 6Z", stroke: "currentColor", strokeWidth: "1.5", strokeLinejoin: "round" }),
                        h("path", { d: "M7 2v8M3 6h8", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }))),
                    h("span", { className: "tool-name" },
                      tool.code ? h("span", { className: "tool-vendor" }, "Adobe") : null,
                      tool.name));
                })),
            ),
          ),
        ),
        h("section", { className: "contact-section", id: "contact", "data-mascot": "contact" },
          h("span", { className: "contact-mascot-edge", "aria-hidden": true }),
          h("h2", {}, "ОБСУДИМ", h("br"), h("span", {}, "ТВОЙ ПРОЕКТ")),
          h("button", { type: "button", className: "contact-hero-button", onClick: showContact }, "Обсудить проект", icon(Arrow)),
          h("div", { className: "direct-contacts" },
            h("a", { href: site.telegram, target: "_blank", rel: "noopener noreferrer" }, "Telegram", icon(Arrow)),
            h("a", { href: "mailto:" + site.email }, site.email),
            h("a", { href: "tel:" + site.phone }, site.phoneLabel)),
        ),
      ),
      h("footer", { className: "site-footer" },
        h("span", {}, site.name + " · " + new Date().getFullYear()),
        h("nav", { className: "footer-documents", "aria-label": "Документы" },
          h("a", { href: "offer.html" }, "Оферта"),
          h("a", { href: "privacy.html" }, "Политика конфиденциальности")),
        h("a", { href: "#top" }, "Наверх", icon(Arrow))),
      activeProject ? h(activeProject.id === "showreel" ? ShowreelDialog : ProjectDialog, {
        key: activeProject.id, project: activeProject, motion: motion,
        onClose: function () { setActiveProject(null); } }) : null,
      contact ? h(ContactDialog, { onClose: function () { setContact(false); } }) : null,
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(App));
})();
