(async function () {
  const scroller = document.getElementById("available-snap");
  const progress = document.getElementById("snap-progress");
  const indexEl = document.getElementById("snap-index");
  const totalEl = document.getElementById("snap-total");
  if (!scroller) return;

  window.EJ.bindBuyButtons(scroller);

  const isCoarse = () =>
    window.matchMedia("(max-width: 899px), (hover: none)").matches;

  function slideHTML(a, i, total, next) {
    const price = window.EJ.formatPrice(a.priceCents);
    const e = (s) => window.EJ.escape(s);
    const isFirst = i === 0;
    const leadClass = isFirst ? " work-slide--lead" : "";

    let peek = "";
    if (next) {
      const hint = isFirst
        ? isCoarse()
          ? "Swipe up for the next original"
          : "Scroll — or click — to see the next original"
        : isCoarse()
          ? "Swipe up"
          : "Continue";

      peek = `
        <button type="button" class="slide-peek${isFirst ? " slide-peek--strong" : ""}" data-nudge aria-label="View next painting: ${e(next.title)}">
          <span class="slide-peek-fade" aria-hidden="true"></span>
          <span class="slide-peek-panel">
            <span class="slide-peek-thumb" aria-hidden="true">
              <img src="${next.image}" alt="" />
            </span>
            <span class="slide-peek-copy">
              <span class="slide-peek-kicker">${isFirst ? "There’s more" : "Next"}</span>
              <span class="slide-peek-title">${e(next.title)}</span>
              <span class="slide-peek-hint">${hint}</span>
            </span>
            <span class="slide-peek-chevron" aria-hidden="true"></span>
          </span>
        </button>`;
    }

    const stage = window.EJ.views.stageHTML(a, {
      compact: true,
      className: `view-stage--slide${isFirst ? " view-stage--lead" : ""}`,
    });

    return `
      <section
        class="snap-slide work-slide${leadClass}"
        data-slide="${i}"
        aria-label="${e(a.title)} (${i + 1} of ${total})"
      >
        <div class="work-slide-inner">
          <div class="work-slide-art${isFirst ? " work-slide-art--lead" : ""}">
            ${stage}
          </div>
          <div class="work-slide-meta">
            ${
              isFirst
                ? `<p class="work-slide-kicker">Featured available work</p>`
                : ""
            }
            <h2 class="work-slide-title">${e(a.title)}</h2>
            <p class="work-slide-size">${e(a.dimensions || "")}${
              a.medium ? ` · ${e(a.medium)}` : ""
            }</p>
            ${price ? `<p class="work-slide-price">${price}</p>` : ""}
            <div class="work-slide-actions">
              <button type="button" class="btn" data-buy="${e(a.id)}">Buy</button>
              <a class="btn btn-outline" href="/piece.html?id=${encodeURIComponent(a.id)}">Details</a>
            </div>
          </div>
        </div>
        ${peek}
      </section>`;
  }

  function slideHeight() {
    // Prefer measured scroller height — matches real mobile viewport better than 100vh
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
    // scrollIntoView is more reliable with CSS scroll-snap on iOS than scrollBy
    target.scrollIntoView({ behavior: isCoarse() ? "auto" : "smooth", block: "start" });
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
    const res = await fetch("/api/artworks?filter=available");
    const data = await res.json();
    const list = data.artworks || [];

    if (!list.length) {
      scroller.innerHTML = `
        <section class="snap-slide snap-intro" style="display:flex;align-items:center;justify-content:center">
          <div class="snap-intro-inner">
            <h1>Available Work</h1>
            <p class="empty" style="border:none;padding:0">No paintings are available right now.
              <a href="/commissions.html">Commission</a> or
              <a href="/gallery.html">browse the gallery</a>.
            </p>
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
    window.EJ.views.bindStages(scroller);
    scroller.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress, { passive: true });
    // iOS visual viewport changes when the URL bar shows/hides
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateProgress, {
        passive: true,
      });
    }
    updateProgress();
  } catch {
    scroller.innerHTML = `
      <section class="snap-slide snap-intro" style="display:flex;align-items:center;justify-content:center">
        <div class="snap-intro-inner">
          <p class="empty" style="border:none">Could not load available work.</p>
        </div>
      </section>`;
  }
})();
