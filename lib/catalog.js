const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

function readJson(file, fallback) {
  const full = path.join(DATA_DIR, file);
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    return fallback;
  }
}

function getSite() {
  return readJson("site.json", {
    artistName: process.env.ARTIST_NAME || "Tonia Johnsen",
    studioName: "Tonia Johnsen",
    tagline: "Original works · Commissions · Portfolio",
    email: process.env.CONTACT_EMAIL || "hello@toniajohnsen.com",
  });
}

function getArtworks() {
  return readJson("artworks.json", []);
}

function getArtwork(id) {
  if (!id) return null;
  return getArtworks().find((a) => a.id === id) || null;
}

function listAvailable() {
  return getArtworks().filter((a) => a.status === "available");
}

function listFeatured() {
  return getArtworks().filter((a) => a.featured);
}

function listPortfolio() {
  // Everything visible in portfolio (available, sold, portfolio-only)
  return getArtworks().filter((a) =>
    ["available", "sold", "portfolio"].includes(a.status)
  );
}

function formatPrice(cents) {
  if (cents == null || Number.isNaN(Number(cents))) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(cents) / 100);
}

module.exports = {
  getSite,
  getArtworks,
  getArtwork,
  listAvailable,
  listFeatured,
  listPortfolio,
  formatPrice,
};
