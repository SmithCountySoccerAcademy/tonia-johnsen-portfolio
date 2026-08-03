(async function () {
  const scroller = document.getElementById("gallery-snap");
  const progress = document.getElementById("snap-progress");
  const indexEl = document.getElementById("snap-index");
  const totalEl = document.getElementById("snap-total");
  if (!scroller) return;

  const isCoarse = () =>
    window.matchMedia("(max-width: 899px), (hover: none)").matches;

  function statusLabel(status) {
    if (status === "available") return "Available";
    if (status === "sold") return "Sold";
    return "Gallery";
  }

  function slideHTML(a, i, total, next) {
    const e = (s) => window.EJ.escape(s);
    const isFirst = i === 0;
    const leadClass = isFirst ? " work-slide--lead" : "";
    const src = a.image || a.thumb || "";

    let peek = "";
    if (next) {
      peek = `
        <button type="button" class="slide-peek${isFirst ? " slide-peek--strong" : ""}" data-nudge aria-label="View next painting: ${e(next.title)}">
          <span class="slide-peek-fade" aria-hidden="true"></span>
          <span class="slide-peek-panel">
            <span class="slide-peek-thumb" aria-hidden="true">
              <img src="${next.image || next.thumb}" alt="" />
            </span>
            <span class="slide-peek-copy">
              <span class="slide-peek-title">${e(next.title)}</span>
            </span>
            <span class="slide-peek-chevron" aria-hidden="true"></span>
          </span>
        </button>`;
    }

    const metaBits = [
      a.dimensions || "",
      a.medium || "",
      statusLabel(a.status),
    ].filter(Boolean);

    // Simple artwork only — no room views / multi-view stage
    return `
      <section
        class="snap-slide work-slide gallery-slide${leadClass}"
        data-slide="${i}"
        aria-label="${e(a.title)} (${i + 1} of ${total})"
      >
        <div class="work-slide-inner">
          <a class="gallery-art" href="/piece.html?id=${encodeURIComponent(a.id)}">
            <img
              src="${src}"
              alt="${e(a.title)}"
              loading="${i < 2 ? "eager" : "lazy"}"
            />
          </a>
          <div class="work-slide-meta">
            <h2 class="work-slide-title">
              <a href="/piece.html?id=${encodeURIComponent(a.id)}">${e(a.title)}</a>
            </h2>
            <p class="work-slide-size">${e(metaBits.join(" · "))}</p>
          </div>
        </div>
        ${peek}
      </section>`;
  }

  function slideHeight() {
    return scroller.clientHeight || window.innerHeight || 1;
  }

  function updateProgress() {
    const slides = scroller.querySelectorAll(".snap-slide");
    if (!slides.length) return;
    const h = slideHeight();
    let idx = Math.round(scroller.scrollTop / h);
    idx = Math.max(0, Math.min(slides.length - 1, idx));
    if (indexEl) indexEl.textContent = String(idx + 1);
    if (totalEl) totalEl.textContent = String(slides.length);
    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === idx);
    });
  }

  function goToSlide(index) {
    const slides = scroller.querySelectorAll(".snap-slide");
    const target = slides[index];
    if (!target) return;
    target.scrollIntoView({
      behavior: isCoarse() ? "auto" : "smooth",
      block: "start",
    });
  }

  function bindNudge() {
    scroller.querySelectorAll("[data-nudge]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const slide = btn.closest(".snap-slide");
        const slides = [...scroller.querySelectorAll(".snap-slide")];
        const i = slides.indexOf(slide);
        if (i >= 0) goToSlide(i + 1);
      });
    });
  }

  try {
    const res = await fetch("/api/artworks?filter=gallery");
    const data = await res.json();
    const list = data.artworks || [];

    if (!list.length) {
      scroller.innerHTML = `
        <section class="snap-slide work-slide">
          <div class="work-slide-inner">
            <p class="empty" style="border:none">No works to show yet.</p>
          </div>
        </section>`;
      if (progress) progress.hidden = true;
      return;
    }

    scroller.innerHTML = list
      .map((a, i) => slideHTML(a, i, list.length, list[i + 1] || null))
      .join("");

    if (progress) {
      progress.hidden = false;
      if (totalEl) totalEl.textContent = String(list.length);
      if (indexEl) indexEl.textContent = "1";
    }

    bindNudge();
    scroller.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateProgress, {
        passive: true,
      });
    }
    updateProgress();
  } catch {
    scroller.innerHTML = `
      <section class="snap-slide work-slide">
        <div class="work-slide-inner">
          <p class="empty" style="border:none">Could not load gallery. Run the site with npm start.</p>
        </div>
      </section>`;
  }
})();
