(async function () {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const root = document.getElementById("piece-root");
  if (!root) return;

  if (!id) {
    root.innerHTML = `<p class="empty">Artwork not found. <a href="/gallery.html">Return to gallery</a></p>`;
    return;
  }

  let piece;
  try {
    const res = await fetch(`/api/artworks/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("not found");
    piece = await res.json();
  } catch {
    root.innerHTML = `<p class="empty">Artwork not found. <a href="/gallery.html">Return to gallery</a></p>`;
    return;
  }

  document.title = `${piece.title} · Tonia Johnsen`;
  const price = window.EJ.formatPrice(piece.priceCents);
  const canBuy = piece.status === "available" && piece.priceCents;
  const e = (s) => window.EJ.escape(s);
  const stage = window.EJ.views.stageHTML(piece, { className: "view-stage--piece" });

  root.innerHTML = `
    <div class="piece-layout">
      <div class="piece-media">
        ${stage}
      </div>
      <div class="piece-info">
        <h1>${e(piece.title)}</h1>
        <p class="size-line">${e(piece.dimensions || "")}${
          piece.medium ? ` · ${e(piece.medium)}` : ""
        }</p>
        <p>${e(piece.description || "")}</p>
        <dl>
          <dt>Status</dt>
          <dd>${
            piece.status === "available"
              ? "Available"
              : piece.status === "sold"
                ? "Sold"
                : "Gallery"
          }</dd>
          ${piece.year ? `<dt>Year</dt><dd>${piece.year}</dd>` : ""}
        </dl>
        ${
          canBuy
            ? `<p class="price-lg">${price}</p>
               <button type="button" class="btn" data-buy="${e(piece.id)}">Buy</button>
               `
            : `<p class="faint" style="margin:1.5rem 0 1.25rem">${
                piece.status === "sold"
                  ? "This original has sold."
                  : "Not currently for sale."
              }</p>
               <a class="btn btn-outline" href="/available.html">Available work</a>`
        }
      </div>
    </div>`;

  window.EJ.views.bindStages(root);
  window.EJ.bindBuyButtons(root);
})();
