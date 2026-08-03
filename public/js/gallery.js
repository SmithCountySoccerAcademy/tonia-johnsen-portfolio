(async function () {
  const root = document.getElementById("gallery-grid");
  if (!root) return;

  try {
    const res = await fetch("/api/artworks?filter=gallery");
    const data = await res.json();
    const list = data.artworks || [];
    if (!list.length) {
      root.innerHTML = `<p class="empty">No works to show yet.</p>`;
      return;
    }
    root.innerHTML = list.map((a) => window.EJ.galleryCard(a)).join("");
  } catch {
    root.innerHTML = `<p class="empty">Could not load gallery. Run the site with npm start.</p>`;
  }
})();
