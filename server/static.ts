import express, { type Express, type Request } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { escapeHtml, getPublicBaseUrl } from "./security";

const SITE_TITLE = "متجر الراقي | للمنتجات السودانية والأغذية الأصيلة";
const SITE_DESCRIPTION =
  "وجهتك الأولى للمنتجات السودانية الأصيلة. تسوق التوابل، الأغذية، والمنتجات الطبيعية بجودة عالية وتوصيل سريع.";

type PageMeta = { title: string; description: string; image: string; url: string; type: "website" | "product" };

/** A WhatsApp/Facebook-friendly version of a Cloudinary image (JPEG, ~800px). */
function shareImage(url: string) {
  const marker = "/image/upload/";
  const i = url.indexOf(marker);
  if (!url.includes("res.cloudinary.com") || i === -1) return url;
  const rest = url.slice(i + marker.length).replace(/^[a-z]{1,3}_[^/]*\//, "");
  return `${url.slice(0, i + marker.length)}f_jpg,q_auto,c_pad,b_white,w_800,h_800/${rest}`;
}

function absolute(base: string, value: string) {
  return /^https?:\/\//i.test(value) ? value : `${base}${value.startsWith("/") ? "" : "/"}${value}`;
}

function metaTags(meta: PageMeta) {
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  const img = escapeHtml(meta.image);
  const url = escapeHtml(meta.url);
  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:site_name" content="متجر الراقي" />`,
    `<meta property="og:locale" content="ar_AR" />`,
    `<meta property="og:type" content="${meta.type === "product" ? "product" : "website"}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${img}" />`,
  ].join("\n  ");
}

/** Replace the static title/description/OG tags of index.html with page-specific ones. */
function renderIndex(template: string, meta: PageMeta) {
  const cleaned = template
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
    .replace(/<meta\s+name="description"[\s\S]*?\/>\s*/i, "")
    .replace(/<meta\s+property="og:[^"]*"[\s\S]*?\/>\s*/gi, "")
    .replace(/<meta\s+name="twitter:(?:card|title|description|image)"[\s\S]*?\/>\s*/gi, "");
  return cleaned.replace(/<head>/i, `<head>\n  ${metaTags(meta)}`);
}

async function pageMeta(req: Request, base: string): Promise<PageMeta> {
  const fallback: PageMeta = {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    image: absolute(base, "/opengraph.jpg"),
    url: `${base}${req.path === "/" ? "/" : req.path}`,
    type: "website",
  };

  const match = req.path.match(/^\/product\/([A-Za-z0-9-]{1,64})\/?$/);
  if (!match) return fallback;

  try {
    const product = await storage.getProductById(match[1]);
    if (!product || product.isVisible === false) return fallback;
    const price = `${product.price.toLocaleString("en-US")} ج.س`;
    const desc = (product.description || "").replace(/\s+/g, " ").trim();
    return {
      title: `${product.name} — ${price} | متجر الراقي`,
      description: (desc ? `${price} • ${desc}` : `${price} • اطلبه الآن من متجر الراقي`).slice(0, 200),
      image: product.image ? absolute(base, shareImage(product.image)) : fallback.image,
      url: `${base}/product/${product.id}`,
      type: "product",
    };
  } catch (err) {
    console.error("Product preview meta error:", err);
    return fallback;
  }
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const indexPath = path.resolve(distPath, "index.html");
  const template = fs.readFileSync(indexPath, "utf8");

  // index: false so "/" also goes through the handler below and gets proper share tags
  app.use(express.static(distPath, { index: false }));

  // Serve index.html for all non-API/uploads routes (SPA client-side routing),
  // with link-preview tags (WhatsApp, Facebook, …) for the requested page.
  app.use(async (req, res, next) => {
    if ((req.method !== "GET" && req.method !== "HEAD") ||
        req.path.startsWith("/api") ||
        req.path.startsWith("/uploads") ||
        req.path === "/sitemap.xml" ||
        req.path === "/robots.txt") {
      return next();
    }
    const base = getPublicBaseUrl(`${req.protocol}://${req.get("host")}`);
    const meta = await pageMeta(req, base);
    res.setHeader("Cache-Control", "no-cache");
    res.type("html").send(renderIndex(template, meta));
  });
}
