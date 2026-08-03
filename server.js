require("dotenv").config();

const express = require("express");
const path = require("path");
const Stripe = require("stripe");
const catalog = require("./lib/catalog");
const { createArtworkCheckout } = require("./lib/create-checkout");
const { submitInquiry } = require("./lib/inquiries");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

const stripeKey = (process.env.STRIPE_SECRET_KEY || "").trim();
const stripe = stripeKey ? new Stripe(stripeKey) : null;
const isLive = stripeKey.startsWith("sk_live_");

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, stripe: Boolean(stripe), live: isLive });
});

app.get("/api/site", (_req, res) => {
  res.json(catalog.getSite());
});

app.get("/api/artworks", (req, res) => {
  const filter = String(req.query.filter || "all");
  let list = catalog.getArtworks();
  if (filter === "available") list = catalog.listAvailable();
  else if (filter === "featured") list = catalog.listFeatured();
  else if (filter === "gallery") {
    list = catalog.getArtworks().filter((a) =>
      ["available", "sold", "portfolio"].includes(a.status)
    );
  }
  res.json({ artworks: list });
});

app.get("/api/artworks/:id", (req, res) => {
  const piece = catalog.getArtwork(req.params.id);
  if (!piece) return res.status(404).json({ error: "Artwork not found" });
  res.json(piece);
});

app.post("/api/checkout", async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      error: "Online purchase is not set up yet. Please use Contact to inquire.",
      code: "STRIPE_NOT_CONFIGURED",
    });
  }
  try {
    const result = await createArtworkCheckout(stripe, req.body || {});
    res.json(result);
  } catch (err) {
    console.error("checkout error:", err.message);
    res.status(err.statusCode || 500).json({
      error: err.message || "Checkout failed",
    });
  }
});

app.post("/api/contact", (req, res) => {
  try {
    const result = submitInquiry("contact", req.body || {});
    console.log("Contact inquiry:", result.id);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message || "Could not send message",
    });
  }
});

app.post("/api/commissions", (req, res) => {
  try {
    const result = submitInquiry("commission", req.body || {});
    console.log("Commission inquiry:", result.id);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message || "Could not send inquiry",
    });
  }
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Tonia Johnsen portfolio → http://localhost:${PORT}`);
  console.log(
    stripe
      ? `Stripe: ${isLive ? "LIVE" : "test"} mode`
      : "Stripe: not configured (Buy buttons ready when STRIPE_SECRET_KEY is set)"
  );
});
