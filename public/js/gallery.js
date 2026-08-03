(async function () {
  const scroller = document.getElementById("gallery-snap");
  const progress = document.getElementById("snap-progress");
  const indexEl = document.getElementById("snap-index");
  const totalEl = document.getElementById("snap-total");
  if (!scroller) return;

  if (window.EJ && window.EJ.bindBuyButtons) {
    window.EJ.bindBuyButtons(scroller);
  }

  const isCoarse = () =>
    window.matchMedia("(max-width: 899px), (hover: none)").matches;

  function statusLabel(status) {
    if (status === "available") return "Available";
    if (status === "sold") return "Sold";
    return "Gallery";
  }

  function slideHTML(a, i, total, next) {
    const price = window.EJ.formatPrice(a.priceCents);
    const e = (s) => window.EJ.escape(s);
    const isFirst = i === 0;
    const canBuy = a.status === "available" && a.priceCents;
    const leadClass = isFirst ? " work-slide--lead" : "";

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

    const stage = window.EJ.views.stageHTML(a, {
      compact: true,
      className: `view-stage--slide${isFirst ? " view-stage--lead" : ""}`,
    });

    const metaBits = [
      a.dimensions || "",
      a.medium || "",
      statusLabel(a.status),
    ].filter(Boolean);

    const actions = canBuy
      ? `<div class="work-slide-actions">
           <button type="button" class="btn" data-buy="${e(a.id)}">Buy</button>
           <a class="btn btn-outline" href="/piece.html?id=${encodeURIComponent(a.id)}">Details</a>
         </div>`
      : `<div class="work-slide-actions">
           <a class="btn btn-outline" href="/piece.html?id=${encodeURIComponent(a.id)}">Details</a>
         </div>`;

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
            <h2 class="work-slide-title">${e(a.title)}</h2>
            <p class="work-slide-size">${e(metaBits.join(" · "))}</p>
            ${
              canBuy && price
                ? `<p class="work-slide-price">${price}</p>`
                : ""
            }
            ${actions}
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
    if (window.EJ && window.EJ.views) {
      window.EJ.views.bindStages(scroller);
    }
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
