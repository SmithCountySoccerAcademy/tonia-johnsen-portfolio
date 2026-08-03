(async function () {
  const img = document.getElementById("hero-image");
  const cap = document.getElementById("hero-caption");
  if (!img) return;

  function apply(piece) {
    if (!piece) return;
    const src = piece.image || piece.thumb;
    if (src) img.src = src;
    img.alt = piece.title || "Featured painting";
    if (cap) {
      cap.textContent = [piece.title, piece.dimensions].filter(Boolean).join(" · ");
    }
    document.body.classList.add("hero-ready");
  }

  async function loadFrom(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("bad response");
    const data = await res.json();
    const list = data.artworks;
    if (Array.isArray(list) && list.length) return list[0];
    return null;
  }

  try {
    // Prefer featured available work; fall back to any gallery piece
    let piece = null;
    try {
      piece = await loadFrom("/api/artworks?filter=featured");
    } catch {
      /* try next */
    }
    if (!piece || !piece.image) {
      piece = await loadFrom("/api/artworks?filter=available");
    }
    if (!piece || !piece.image) {
      piece = await loadFrom("/api/artworks?filter=gallery");
    }
    apply(piece);
  } catch {
    /* keep static fallback in the HTML */
    document.body.classList.add("hero-ready");
  }
})();
