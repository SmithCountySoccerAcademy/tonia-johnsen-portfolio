const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "inquiries.json");

function emailOk(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}

function save(rows) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(rows, null, 2), "utf8");
}

/**
 * Store contact or commission inquiry.
 * @param {"contact"|"commission"} type
 */
function submitInquiry(type, body) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const message = String(body.message || "").trim();
  const phone = String(body.phone || "").trim();

  if (!name) {
    const err = new Error("Name is required");
    err.statusCode = 400;
    throw err;
  }
  if (!emailOk(email)) {
    const err = new Error("A valid email is required");
    err.statusCode = 400;
    throw err;
  }
  if (!message || message.length < 5) {
    const err = new Error("Please include a short message");
    err.statusCode = 400;
    throw err;
  }

  const row = {
    id: `inq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    type: type === "commission" ? "commission" : "contact",
    createdAt: new Date().toISOString(),
    name,
    email,
    phone,
    message,
    status: "new",
  };

  const rows = load();
  rows.unshift(row);
  save(rows.slice(0, 300));
  return { id: row.id, ok: true };
}

module.exports = { submitInquiry, emailOk };
