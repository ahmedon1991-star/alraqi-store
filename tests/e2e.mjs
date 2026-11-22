// End-to-end security + functional checks.
//
// Usage (needs a built app and an EMPTY test database):
//   npm run build
//   DATABASE_URL=postgres://... npx drizzle-kit push
//   DATABASE_URL=postgres://... npm test
//
// The script starts the production server (dist/index.cjs) itself, runs the checks over HTTP
// and stops it. Never point DATABASE_URL at the real store: the tests create users, products
// and orders, and change the admin password.
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import pg from "pg";

const PORT = process.env.TEST_PORT || "5099";
const B = `http://127.0.0.1:${PORT}`;
const ADMIN_PW = process.env.TEST_ADMIN_PASSWORD || "CI-Admin-Pass-2026";
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required (use an empty test database)");
  process.exit(2);
}

const ssl = process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false };
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl });
const q = (sql, params) => pool.query(sql, params).then((r) => r.rows);

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
}
async function api(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(B + path, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = undefined; }
  return { status: res.status, json, text };
}

// ---------- start the server ----------
let serverLog = "";
const server = spawn(process.execPath, ["dist/index.cjs"], {
  env: { ...process.env, NODE_ENV: "production", PORT, ADMIN_PASSWORD: ADMIN_PW, ADMIN_USERNAME: "admin" },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (d) => { serverLog += d; });
server.stderr.on("data", (d) => { serverLog += d; });
const stop = () => { try { server.kill(); } catch {} };
process.on("exit", stop);

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${B}/api/categories`)).ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function run() {
  if (!(await waitForServer())) {
    console.error("Server did not start:\n" + serverLog);
    process.exit(1);
  }

  console.log("\n[Admin credentials]");
  const [adminRow] = await q("select password from admin_settings where id=1");
  check("admin password is stored hashed", /^[0-9a-f]+:[0-9a-f]{128}$/.test(adminRow?.password || ""));
  let r = await api("/api/admin/login", { method: "POST", body: { username: "admin", password: "admin12345" } });
  check("old default admin12345 is rejected", r.status === 401, r.status);
  r = await api("/api/admin/login", { method: "POST", body: { username: "admin", password: ADMIN_PW } });
  check("ADMIN_PASSWORD logs in", r.status === 200, r.status);
  const A = { "x-admin-token": r.json?.token };
  r = await api("/api/admin/settings", { headers: A });
  check("admin settings do not expose the password hash", r.status === 200 && !("password" in (r.json || {})));
  r = await api("/api/settings");
  check("public settings work without login and hide secrets", r.status === 200 && !("password" in (r.json || {})) && !("revenueResetCode" in (r.json || {})));

  console.log("\n[Unauthenticated destructive/debug endpoints]");
  r = await api("/api/seed?force=true", { method: "POST" });
  check("seed?force=true needs admin", r.status === 401, r.status);
  r = await api("/api/public-debug");
  check("public-debug no longer returns server info", !(r.json && r.json.cwd), r.status);
  r = await api("/api/admin/debug-storage");
  check("admin debug-storage needs admin", r.status === 401, r.status);
  r = await api("/api/admin/orders");
  check("admin orders need admin", r.status === 401, r.status);

  console.log("\n[Catalogue setup via admin]");
  r = await api("/api/admin/products", { method: "POST", headers: A, body: {
    name: "منتج اختبار", category: "spices", price: 5000, stock: 3, inStock: true,
    description: "وصف المنتج للاختبار",
    variants: JSON.stringify([{ name: "1 كيلو", price: "9000", originalPrice: "", image: "", stock: "" }]),
  } });
  check("admin can create product", r.status === 201, r.status);
  const prod = r.json;
  r = await api("/api/admin/products", { method: "POST", headers: A, body: { name: "مخفي", category: "spices", price: 100, isVisible: false } });
  const hidden = r.json;
  r = await api("/api/products");
  check("hidden product not in public list", r.status === 200 && !r.json.some((p) => p.id === hidden.id));
  r = await api(`/api/products/${hidden.id}`);
  check("hidden product detail is 404", r.status === 404, r.status);

  console.log("\n[Link previews]");
  r = await api(`/product/${prod.id}`);
  check("product page has its own share title with price", r.status === 200 && r.text.includes("<title>منتج اختبار — 5,000 ج.س"));
  check("og:image is an absolute URL", /og:image" content="https?:\/\//.test(r.text));
  r = await api(`/product/${hidden.id}`);
  check("hidden product does not leak in previews", !r.text.includes("مخفي"));
  r = await api(`/product/%22%3E%3Cscript%3Ealert(1)%3C%2Fscript%3E`);
  check("preview tags are not injectable", !r.text.includes("<script>alert(1)"));

  console.log("\n[Price tampering]");
  const S1 = { "x-session-id": "sess-attacker-" + Date.now() };
  r = await api("/api/cart", { method: "POST", headers: S1, body: { productId: prod.id, price: 1, quantity: 2, sessionId: S1["x-session-id"] } });
  check("cart ignores client price", r.status === 200 && r.json.item.price === 5000, JSON.stringify(r.json?.item));
  r = await api("/api/cart", { method: "POST", headers: S1, body: { productId: prod.id, size: "1 كيلو", price: 1, sessionId: S1["x-session-id"] } });
  check("variant price comes from server (9000)", r.status === 200 && r.json.item.price === 9000, JSON.stringify(r.json?.item));
  await q("update cart_items set price = 1 where session_id = $1", [S1["x-session-id"]]);
  r = await api("/api/orders", { method: "POST", headers: S1, body: { name: "Attacker", phone: "0912345678", address: "Khartoum street 1", sessionId: S1["x-session-id"] } });
  check("order total recomputed: 2×5000 + 1×9000 = 19000", r.status === 200 && r.json.total === 19000, `${r.status} total=${r.json?.total} ${r.json?.message || ""}`);
  check("WhatsApp invoice has no literal %0A", r.json?.whatsappUrl && !decodeURIComponent(r.json.whatsappUrl).includes("%0A"));
  const [{ stock }] = await q("select stock from products where id=$1", [prod.id]);
  check("stock decremented atomically (3 → 0)", stock === 0, `stock=${stock}`);

  console.log("\n[Stock / availability]");
  const S2 = { "x-session-id": "sess-buyer-" + Date.now() };
  r = await api("/api/cart", { method: "POST", headers: S2, body: { productId: prod.id, sessionId: S2["x-session-id"] } });
  check("sold-out product cannot be added", r.status === 404, r.status);
  r = await api("/api/admin/products", { method: "POST", headers: A, body: { name: "كمية", category: "spices", price: 200, stock: 2, inStock: true } });
  const limited = r.json;
  await api("/api/cart", { method: "POST", headers: S2, body: { productId: limited.id, quantity: 5, sessionId: S2["x-session-id"] } });
  r = await api("/api/orders", { method: "POST", headers: S2, body: { name: "Buyer", phone: "0912345678", address: "Omdurman 22", sessionId: S2["x-session-id"] } });
  check("ordering more than stock is refused", r.status === 409, `${r.status} ${r.json?.message}`);

  console.log("\n[Cart ownership]");
  const cart2 = (await api("/api/cart", { headers: S2 })).json;
  const itemId = cart2.items[0].id;
  r = await api(`/api/cart/${itemId}`, { method: "PATCH", headers: { "x-session-id": "someone-else" }, body: { quantity: 999 } });
  check("other session cannot change my cart item", r.status === 404, r.status);
  await api(`/api/cart/${itemId}`, { method: "DELETE", headers: { "x-session-id": "someone-else" } });
  check("other session cannot delete my cart item", (await api("/api/cart", { headers: S2 })).json.items.length === 1);
  r = await api(`/api/cart/${itemId}`, { method: "PATCH", headers: S2, body: { quantity: 2 } });
  check("owner can change quantity", r.status === 200 && r.json.quantity === 2, r.status);
  r = await api("/api/orders", { method: "POST", headers: S2, body: { name: "Buyer", phone: "0912345678", address: "Omdurman 22", sessionId: S2["x-session-id"] } });
  check("normal order works (2×200 = 400)", r.status === 200 && r.json.total === 400, `${r.status} ${r.json?.total}`);

  console.log("\n[Password reset]");
  const email = `victim${Date.now()}@example.com`;
  r = await api("/api/auth/register", { method: "POST", body: { name: "Victim", email, password: "secret123", phone: "0911111111" } });
  check("register works", r.status === 201, r.status);
  const victimToken = r.json.token;
  r = await api("/api/auth/reset-password", { method: "POST", body: { email, token: "anything", password: "hacked123" } });
  check("reset with a fake token is refused", r.status === 400, r.status);
  r = await api("/api/auth/login", { method: "POST", body: { email, password: "hacked123" } });
  check("attacker password does not work", r.status === 401, r.status);
  r = await api("/api/auth/forgot-password", { method: "POST", body: { email: "nobody-here@example.com" } });
  const unknownMsg = r.json?.message;
  r = await api("/api/auth/forgot-password", { method: "POST", body: { email } });
  check("forgot-password answers the same for unknown emails", r.status === 200 && r.json.message === unknownMsg);
  const [u] = await q("select id, reset_token_hash from users where email=$1", [email]);
  check("only a hash of the reset token is stored", /^[0-9a-f]{64}$/.test(u.reset_token_hash || ""));
  const known = "known-reset-token-for-test";
  await q("update users set reset_token_hash=$1 where id=$2", [crypto.createHash("sha256").update(known).digest("hex"), u.id]);
  r = await api("/api/auth/reset-password", { method: "POST", body: { email, token: known, password: "newpass123" } });
  check("reset with the real token works", r.status === 200, r.status);
  r = await api("/api/auth/reset-password", { method: "POST", body: { email, token: known, password: "again1234" } });
  check("reset token is single-use", r.status === 400, r.status);
  r = await api("/api/auth/me", { headers: { "x-customer-token": victimToken } });
  check("old sessions are logged out after reset", r.status === 401, r.status);
  r = await api("/api/auth/login", { method: "POST", body: { email, password: "newpass123" } });
  check("login with new password", r.status === 200, r.status);
  const C = { "x-customer-token": r.json.token };

  console.log("\n[Ratings]");
  r = await api(`/api/products/${limited.id}/rate`, { method: "POST", headers: C, body: { rating: 5 } });
  check("first rating accepted", r.status === 200 && r.json.reviews === 1 && r.json.rating === 5, `${r.status}`);
  r = await api(`/api/products/${limited.id}/rate`, { method: "POST", headers: C, body: { rating: 1 } });
  check("second rating by same user refused", r.status === 409, r.status);

  console.log("\n[Biometric]");
  r = await api("/api/auth/biometric/enable", { method: "POST", headers: C, body: { token: "weak" } });
  const deviceToken = r.json?.deviceToken;
  check("server issues a strong device token", r.status === 200 && /^[0-9a-f]{64}$/.test(deviceToken || ""));
  r = await api("/api/auth/biometric/login", { method: "POST", body: { email, deviceToken: "weak" } });
  check("client-chosen token is not accepted", r.status === 401, r.status);
  r = await api("/api/auth/biometric/login", { method: "POST", body: { email, deviceToken } });
  check("biometric login with issued token works", r.status === 200, r.status);

  console.log("\n[Sessions]");
  await q("update sessions set created_at = now() - interval '40 days' where token = $1", [C["x-customer-token"]]);
  r = await api("/api/auth/me", { headers: C });
  check("30+ day old session is rejected", r.status === 401, r.status);

  console.log("\n[Admin password change persists]");
  r = await api("/api/admin/security", { method: "POST", headers: A, body: { currentPassword: ADMIN_PW, password: "PanelPass-2026" } });
  check("admin changes password from panel", r.status === 200, `${r.status} ${r.json?.message}`);
  r = await api("/api/admin/login", { method: "POST", body: { username: "admin", password: "PanelPass-2026" } });
  check("new panel password works", r.status === 200, r.status);
  r = await api("/api/admin/login", { method: "POST", body: { username: "admin", password: "PanelPass-2026" } });
  check("…and still works on the next request (no env re-sync)", r.status === 200, r.status);

  console.log("\n[Admin data endpoints]");
  r = await api("/api/admin/notifications", { headers: A });
  check("notifications counts", r.status === 200 && typeof r.json.orders === "number" && typeof r.json.pendingOrders === "number");
  r = await api("/api/admin/orders?search=buyer", { headers: A });
  check("orders search (SQL, case-insensitive)", r.status === 200 && r.json.length >= 1 && r.json.every((o) => /buyer/i.test(o.name)), r.status);
  r = await api("/api/admin/overview", { headers: A });
  check("overview works", r.status === 200 && typeof r.json.stats.orders.all === "number", r.status);

  console.log("\n[Logs]");
  check("server log contains no login tokens", !/"token"\s*:/.test(serverLog));

  console.log("\n[Rate limiting]");
  let last;
  for (let i = 0; i < 12; i++) {
    last = await api("/api/admin/login", { method: "POST", body: { username: "admin", password: "wrong-" + i } });
  }
  check("repeated wrong admin logins get 429", last.status === 429, last.status);
}

try {
  await run();
} catch (err) {
  fail++;
  console.error("Test run crashed:", err);
  console.error("Server log:\n" + serverLog);
} finally {
  await pool.end();
  stop();
}
console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
