/**
 * Artwork display views — flat portrait + in-room mockups.
 * Timed carousel + click-to-expand fullscreen modal.
 *
 * Custom photos: add to artworks.json
 *   "views": [{ "id": "home", "label": "Client home", "image": "/assets/..." }]
 */
(function () {
  const INTERVAL_MS = 4200;
  const REDUCED_MOTION =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ROOM_SCENES = [
    {
      id: "living-room",
      label: "Living room",
      short: "Living",
      description: "Above a sofa",
    },
    {
      id: "dining",
      label: "Dining room",
      short: "Dining",
      description: "On a dining wall",
    },
    {
      id: "office",
      label: "Office",
      short: "Office",
      description: "Workspace wall",
    },
    {
      id: "bedroom",
      label: "Bedroom",
      short: "Bedroom",
      description: "Above a headboard",
    },
  ];

  let uid = 0;
  let activeModal = null;

  function escape(s) {
    return window.EJ ? window.EJ.escape(s) : String(s);
  }

  function getViews(piece) {
    const src = piece.image || piece.thumb || "";
    const title = piece.title || "Artwork";
    const views = [
      {
        id: "artwork",
        label: "Artwork",
        short: "Art",
        type: "flat",
        image: src,
        title,
      },
    ];

    for (const scene of ROOM_SCENES) {
      views.push({
        id: scene.id,
        label: scene.label,
        short: scene.short,
        type: "room",
        scene: scene.id,
        image: src,
        title,
        description: scene.description,
      });
    }

    const custom = Array.isArray(piece.views) ? piece.views : [];
    for (const v of custom) {
      if (!v || !v.image) continue;
      const id = String(v.id || `custom-${views.length}`).replace(/\s+/g, "-");
      if (views.some((x) => x.id === id)) continue;
      views.push({
        id,
        label: v.label || "View",
        short: v.short || v.label || "View",
        type: "flat",
        image: v.image,
        title,
        custom: true,
      });
    }

    return views;
  }

  function roomHTML(view) {
    const src = escape(view.image);
    const alt = escape(`${view.title} in ${view.label}`);
    const scene = escape(view.scene || "living-room");
    return `
      <div class="room room--${scene}">
        <div class="room-wall">
          <div class="room-hang">
            <div class="room-frame">
              <img src="${src}" alt="${alt}" draggable="false" />
            </div>
          </div>
        </div>
        <div class="room-floor"></div>
        <div class="room-props" aria-hidden="true"></div>
      </div>`;
  }

  function flatHTML(view) {
    return `
      <div class="view-flat-wrap">
        <img class="view-flat-img" src="${escape(view.image)}" alt="${escape(view.title)}" draggable="false" />
      </div>`;
  }

  function panelBody(view) {
    return view.type === "room" ? roomHTML(view) : flatHTML(view);
  }

  function stageHTML(piece, opts = {}) {
    const views = getViews(piece);
    const className = opts.className || "";
    const idBase = `vs${++uid}`;
    const title = escape(piece.title || "Artwork");

    const panels = views
      .map((v, i) => {
        const pid = `${idBase}-${escape(v.id)}`;
        return `
          <div
            class="view-panel${i === 0 ? " is-active" : ""}"
            data-view-panel="${escape(v.id)}"
            role="tabpanel"
            id="${pid}"
            ${i === 0 ? "" : "hidden"}
          >${panelBody(v)}</div>`;
      })
      .join("");

    const tabs = views
      .map((v, i) => {
        const name = escape(v.label || v.id);
        const pid = `${idBase}-${escape(v.id)}`;
        return `
          <button
            type="button"
            class="view-dot${i === 0 ? " is-active" : ""}${v.type === "room" ? " view-dot--room" : " view-dot--art"}"
            role="tab"
            data-view-set="${escape(v.id)}"
            aria-selected="${i === 0 ? "true" : "false"}"
            aria-controls="${pid}"
            aria-label="${name}"
            title="${name}"
          ></button>`;
      })
      .join("");

    const viewIds = views.map((v) => v.id).join(",");

    return `
      <div
        class="view-stage ${className}"
        data-view-stage
        data-view-ids="${escape(viewIds)}"
        data-piece-title="${title}"
      >
        <button type="button" class="view-canvas" data-view-canvas aria-label="View ${title} fullscreen">
          ${panels}
          <span class="view-expand-hint" aria-hidden="true"></span>
        </button>
        <div class="view-switcher" role="tablist" aria-label="Display views">
          ${tabs}
        </div>
      </div>`;
  }

  function viewIdsOf(stage) {
    return (stage.dataset.viewIds || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function currentIndex(stage) {
    const ids = viewIdsOf(stage);
    const active = stage.querySelector(".view-panel.is-active");
    const id = active && active.getAttribute("data-view-panel");
    const i = ids.indexOf(id);
    return i < 0 ? 0 : i;
  }

  function setView(stage, viewId) {
    if (!stage) return;
    const panels = stage.querySelectorAll("[data-view-panel]");
    const dots = stage.querySelectorAll("[data-view-set]");
    panels.forEach((panel) => {
      const on = panel.getAttribute("data-view-panel") === viewId;
      panel.classList.toggle("is-active", on);
      if (on) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    });
    dots.forEach((dot) => {
      const on = dot.getAttribute("data-view-set") === viewId;
      dot.classList.toggle("is-active", on);
      dot.setAttribute("aria-selected", on ? "true" : "false");
    });
    // Restart progress bar animation
    stage.classList.remove("is-advancing");
    // Force reflow so animation restarts
    void stage.offsetWidth;
    if (stage._carouselPlaying) stage.classList.add("is-advancing");
  }

  function nextView(stage) {
    const ids = viewIdsOf(stage);
    if (ids.length < 2) return;
    const i = currentIndex(stage);
    setView(stage, ids[(i + 1) % ids.length]);
  }

  function prevView(stage) {
    const ids = viewIdsOf(stage);
    if (ids.length < 2) return;
    const i = currentIndex(stage);
    setView(stage, ids[(i - 1 + ids.length) % ids.length]);
  }

  function stopCarousel(stage) {
    if (!stage) return;
    stage._carouselPlaying = false;
    stage.classList.remove("is-advancing");
    if (stage._carouselTimer) {
      clearInterval(stage._carouselTimer);
      stage._carouselTimer = null;
    }
  }

  function startCarousel(stage) {
    if (!stage || REDUCED_MOTION) return;
    const ids = viewIdsOf(stage);
    if (ids.length < 2) return;
    stopCarousel(stage);
    stage.style.setProperty("--view-interval", `${INTERVAL_MS}ms`);
    stage._carouselPlaying = true;
    stage._carouselPaused = false;
    stage.classList.remove("is-paused");
    stage.classList.add("is-advancing");
    stage._carouselTimer = setInterval(() => {
      if (stage._carouselPaused) return;
      nextView(stage);
    }, INTERVAL_MS);
  }

  function pauseCarousel(stage) {
    if (!stage) return;
    stage._carouselPaused = true;
    stage.classList.add("is-paused");
  }

  function resumeCarousel(stage) {
    if (!stage) return;
    stage._carouselPaused = false;
    stage.classList.remove("is-paused");
    // restart progress feel
    if (stage._carouselPlaying) {
      stage.classList.remove("is-advancing");
      void stage.offsetWidth;
      stage.classList.add("is-advancing");
    }
  }

  /* —— Fullscreen modal —— */
  function ensureModal() {
    let el = document.getElementById("view-modal");
    if (el) return el;
    el = document.createElement("div");
    el.id = "view-modal";
    el.className = "view-modal";
    el.hidden = true;
    el.innerHTML = `
      <div class="view-modal-backdrop" data-modal-close tabindex="-1"></div>
      <div class="view-modal-dialog" role="dialog" aria-modal="true" aria-label="Artwork view">
        <button type="button" class="view-modal-close" data-modal-close aria-label="Close">
          <span aria-hidden="true"></span>
        </button>
        <div class="view-modal-stage" data-modal-stage></div>
        <div class="view-modal-nav">
          <button type="button" class="view-modal-arrow view-modal-prev" data-modal-prev aria-label="Previous view"></button>
          <div class="view-switcher view-switcher--modal" role="tablist" aria-label="Display views" data-modal-dots></div>
          <button type="button" class="view-modal-arrow view-modal-next" data-modal-next aria-label="Next view"></button>
        </div>
      </div>`;
    document.body.appendChild(el);

    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-modal-close]")) {
        closeModal();
        return;
      }
      if (e.target.closest("[data-modal-next]")) {
        if (activeModal) nextView(activeModal);
        return;
      }
      if (e.target.closest("[data-modal-prev]")) {
        if (activeModal) prevView(activeModal);
        return;
      }
      const dot = e.target.closest("[data-view-set]");
      if (dot && activeModal && activeModal.contains(dot)) {
        setView(activeModal, dot.getAttribute("data-view-set"));
        // brief pause then resume
        pauseCarousel(activeModal);
        clearTimeout(activeModal._resumeT);
        activeModal._resumeT = setTimeout(() => resumeCarousel(activeModal), 5000);
      }
    });

    return el;
  }

  function closeModal() {
    const el = document.getElementById("view-modal");
    if (!el) return;
    if (activeModal) stopCarousel(activeModal);
    activeModal = null;
    el.hidden = true;
    el.classList.remove("is-open");
    document.body.classList.remove("view-modal-open");
    if (el._returnFocus && typeof el._returnFocus.focus === "function") {
      try {
        el._returnFocus.focus();
      } catch {
        /* ignore */
      }
    }
    document.removeEventListener("keydown", onModalKey);
  }

  function onModalKey(e) {
    if (!activeModal) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextView(activeModal);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevView(activeModal);
    }
  }

  function openModal(fromStage) {
    const views = viewIdsOf(fromStage).map((id) => {
      const panel = fromStage.querySelector(`[data-view-panel="${id}"]`);
      const img = panel && panel.querySelector("img");
      const isRoom = panel && panel.querySelector(".room");
      const roomEl = isRoom && panel.querySelector(".room");
      const roomClass =
        roomEl &&
        [...roomEl.classList].find((c) => c.startsWith("room--"));
      const scene = roomClass ? roomClass.replace("room--", "") : null;
      const title = fromStage.dataset.pieceTitle || "Artwork";
      return {
        id,
        label: id.replace(/-/g, " "),
        type: isRoom ? "room" : "flat",
        scene: scene || id,
        image: img ? img.getAttribute("src") : "",
        title,
      };
    });

    if (!views.length) return;

    const modal = ensureModal();
    const stageHost = modal.querySelector("[data-modal-stage]");
    const dotsHost = modal.querySelector("[data-modal-dots]");
    const idBase = `vm${++uid}`;
    const activePanel = fromStage.querySelector(".view-panel.is-active");
    const startId =
      (activePanel && activePanel.getAttribute("data-view-panel")) ||
      views[0].id;

    stageHost.innerHTML = views
      .map((v) => {
        const on = v.id === startId;
        return `
          <div
            class="view-panel${on ? " is-active" : ""}"
            data-view-panel="${escape(v.id)}"
            id="${idBase}-${escape(v.id)}"
            ${on ? "" : "hidden"}
          >${panelBody(v)}</div>`;
      })
      .join("");

    dotsHost.innerHTML = views
      .map((v) => {
        const on = v.id === startId;
        const name = escape(v.label || v.id);
        return `
          <button
            type="button"
            class="view-dot${on ? " is-active" : ""}${v.type === "room" ? " view-dot--room" : " view-dot--art"}"
            data-view-set="${escape(v.id)}"
            aria-selected="${on ? "true" : "false"}"
            aria-label="${name}"
            title="${name}"
          ></button>`;
      })
      .join("");

    // Dialog acts as the carousel "stage" (contains panels + dots)
    const wrap = modal.querySelector(".view-modal-dialog");
    wrap.dataset.viewIds = views.map((v) => v.id).join(",");
    wrap.dataset.pieceTitle = fromStage.dataset.pieceTitle || "";
    activeModal = wrap;
    setView(wrap, startId);

    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add("is-open"));
    document.body.classList.add("view-modal-open");
    modal._returnFocus = document.activeElement;
    document.addEventListener("keydown", onModalKey);
    const closeBtn = modal.querySelector(".view-modal-close");
    if (closeBtn) closeBtn.focus();

    if (!REDUCED_MOTION && views.length > 1) {
      startCarousel(wrap);
    }
  }

  function bindStages(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-view-stage]").forEach((stage) => {
      if (stage.dataset.boundViews === "1") return;
      stage.dataset.boundViews = "1";

      stage.addEventListener("click", (e) => {
        const chip = e.target.closest("[data-view-set]");
        if (chip && stage.contains(chip)) {
          e.preventDefault();
          e.stopPropagation();
          setView(stage, chip.getAttribute("data-view-set"));
          pauseCarousel(stage);
          clearTimeout(stage._resumeT);
          stage._resumeT = setTimeout(() => resumeCarousel(stage), 6000);
          return;
        }

        const canvas = e.target.closest("[data-view-canvas]");
        if (canvas && stage.contains(canvas)) {
          e.preventDefault();
          e.stopPropagation();
          openModal(stage);
        }
      });

      // Pause autoplay while interacting / when off-screen
      stage.addEventListener("pointerenter", () => pauseCarousel(stage));
      stage.addEventListener("pointerleave", () => resumeCarousel(stage));
      stage.addEventListener("focusin", () => pauseCarousel(stage));
      stage.addEventListener("focusout", (e) => {
        if (!stage.contains(e.relatedTarget)) resumeCarousel(stage);
      });

      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && entry.intersectionRatio > 0.45) {
                if (!stage._carouselPlaying) startCarousel(stage);
                else resumeCarousel(stage);
              } else {
                pauseCarousel(stage);
              }
            });
          },
          { threshold: [0, 0.45, 0.75] }
        );
        io.observe(stage);
        stage._io = io;
      } else {
        startCarousel(stage);
      }
    });
  }

  window.EJ = window.EJ || {};
  window.EJ.views = {
    ROOM_SCENES,
    INTERVAL_MS,
    getViews,
    stageHTML,
    setView,
    nextView,
    prevView,
    bindStages,
    openModal,
    closeModal,
  };
})();
