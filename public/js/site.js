(function () {
  const path = location.pathname.replace(/\\/g, "/");
  const page = path.split("/").pop() || "index.html";

  document.querySelectorAll("[data-nav]").forEach((a) => {
    const target = (a.getAttribute("href") || "").split("/").pop() || "index.html";
    if (
      target === page ||
      (page === "" && target === "index.html") ||
      (page === "piece.html" && target === "gallery.html")
    ) {
      a.setAttribute("aria-current", "page");
    }
  });

  const toggle = document.getElementById("nav-toggle");
  const links = document.getElementById("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // Close mobile menu after a nav tap
    links.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const header = document.querySelector(".site-header");
  if (header) {
    const onScroll = () =>
      header.classList.toggle("is-scrolled", window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();

window.EJ = {
  formatPrice(cents) {
    if (cents == null || Number.isNaN(Number(cents))) return null;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(cents) / 100);
  },

  escape(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  /** Gallery card: image, title, size */
  galleryCard(a) {
    const sold = a.status === "sold";
    return `
      <a class="work-card" href="/piece.html?id=${encodeURIComponent(a.id)}">
        <div class="work-media">
          <img src="${a.thumb || a.image}" alt="${this.escape(a.title)}" loading="lazy" />
        </div>
        <div class="work-meta">
          <p class="title">${this.escape(a.title)}</p>
          <p class="size">${this.escape(a.dimensions || "")}</p>
          ${sold ? `<p class="status">Sold</p>` : ""}
        </div>
      </a>`;
  },

  /** Available card: image, title, size, price, Buy */
  availableCard(a) {
    const price = this.formatPrice(a.priceCents);
    return `
      <article class="work-card available-card">
        <a href="/piece.html?id=${encodeURIComponent(a.id)}">
          <div class="work-media">
            <img src="${a.thumb || a.image}" alt="${this.escape(a.title)}" loading="lazy" />
          </div>
          <div class="work-meta">
            <p class="title">${this.escape(a.title)}</p>
            <p class="size">${this.escape(a.dimensions || "")}</p>
            ${price ? `<p class="price">${price}</p>` : ""}
          </div>
        </a>
        <div class="work-actions">
          <button type="button" class="btn" data-buy="${this.escape(a.id)}">Buy</button>
        </div>
      </article>`;
  },

  async buy(artworkId, btn) {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "…";
    }
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artworkId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "STRIPE_NOT_CONFIGURED") {
          alert(
            "Online checkout will connect to Stripe soon. For now, please use the Contact page to purchase."
          );
          location.href = "/contact.html";
          return;
        }
        throw new Error(data.error || "Purchase unavailable");
      }
      if (data.url) {
        location.href = data.url;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (err) {
      alert(err.message || "Could not start checkout");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Buy";
      }
    }
  },

  bindBuyButtons(root) {
    if (!root) return;
    root.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-buy]");
      if (!btn) return;
      e.preventDefault();
      this.buy(btn.getAttribute("data-buy"), btn);
    });
  },
};
