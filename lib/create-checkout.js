const { getArtwork, getSite, formatPrice } = require("./catalog");

function emailOk(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

/**
 * Build a Stripe Checkout Session for a single available original.
 * @param {import("stripe").Stripe} stripe
 * @param {{ artworkId: string, buyerEmail?: string, buyerName?: string }} input
 */
async function createArtworkCheckout(stripe, input) {
  const artworkId = String(input.artworkId || "").trim();
  const artwork = getArtwork(artworkId);

  if (!artwork) {
    const err = new Error("Artwork not found");
    err.statusCode = 404;
    throw err;
  }
  if (artwork.status !== "available") {
    const err = new Error(
      artwork.status === "sold"
        ? "This piece has sold"
        : "This piece is not available for purchase"
    );
    err.statusCode = 400;
    throw err;
  }
  if (!artwork.priceCents || artwork.priceCents < 50) {
    const err = new Error("This piece has no valid sale price");
    err.statusCode = 400;
    throw err;
  }

  const site = getSite();
  const base = (process.env.PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const successUrl =
    process.env.STRIPE_SUCCESS_URL ||
    `${base}/success.html?session_id={CHECKOUT_SESSION_ID}&piece=${encodeURIComponent(artwork.id)}`;
  const cancelUrl =
    process.env.STRIPE_CANCEL_URL ||
    `${base}/available.html`;

  const buyerEmail = (input.buyerEmail || "").trim();
  const buyerName = (input.buyerName || "").trim();

  const sessionParams = {
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    billing_address_collection: "required",
    shipping_address_collection: {
      allowed_countries: ["US"],
    },
    phone_number_collection: { enabled: true },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: artwork.priceCents,
          product_data: {
            name: artwork.title,
            description: [
              artwork.medium,
              artwork.dimensions,
              "Original artwork",
              site.shippingNote || "",
            ]
              .filter(Boolean)
              .join(" · ")
              .slice(0, 500),
            metadata: {
              artworkId: artwork.id,
            },
          },
        },
      },
    ],
    metadata: {
      type: "original",
      artworkId: artwork.id,
      artworkTitle: artwork.title,
      priceLabel: formatPrice(artwork.priceCents) || "",
      buyerName,
      artistName: site.artistName || "",
    },
  };

  if (buyerEmail && emailOk(buyerEmail)) {
    sessionParams.customer_email = buyerEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return { url: session.url, id: session.id };
}

module.exports = {
  createArtworkCheckout,
  emailOk,
};
