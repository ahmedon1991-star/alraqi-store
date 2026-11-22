import type { Express, NextFunction, Request, Response } from "express";
import { type Server } from "http";
import { type Category, type InsertProduct, type InsertUser, type Order, type Product, type User, type InsertAdminSettings, type AdminSettings, insertMessageSchema, insertBankSchema } from "@shared/schema";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { storage, getDbLastError } from "./storage";
import { sendPasswordResetEmail } from "./email";
import {
  KNOWN_DEFAULT_ADMIN_PASSWORD,
  MIN_ADMIN_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PASSWORD_RESET_TTL_MS,
  createToken,
  getEnvAdminCredentials,
  getPublicBaseUrl,
  hashPassword,
  safeEqual,
  sha256,
  verifyPassword,
} from "./security";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp"; // Optimization: Resize & Compress programmatic
import { v2 as cloudinary } from "cloudinary"; // Cloud Storage

// Cloud Storage (Cloudinary) — credentials come ONLY from environment variables.
// Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET on Render.
const cloudinaryEnabled = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);
if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} else {
  console.warn("⚠️  CLOUDINARY: credentials not set — uploaded images will be stored on the local disk only.");
}

// Permanent Disk Backup (Mount Path for Render)
const uploadDir = path.resolve(process.cwd(), "public", "uploads");

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`📁 SUCCESS: Permanent upload directory ensured at: ${uploadDir}`);
  }
} catch (err) {
  console.error(`❌ CRITICAL: Directory access failure: ${err}`);
}

const storageMemory = multer.memoryStorage();
const ALLOWED_IMAGE_EXT = /^\.(jpe?g|png|webp)$/;
const ALLOWED_IMAGE_MIME = /^image\/(jpeg|png|webp)$/;

const upload = multer({
  storage: storageMemory,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for mobile high-res photos
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_IMAGE_EXT.test(ext) && ALLOWED_IMAGE_MIME.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("صيغة الملف غير مدعومة. يسمح بـ JPG, PNG, WEBP فقط."));
    }
  }
});

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";
const ADMIN_SESSION_USER_ID = "admin-1";
const MAX_CART_QUANTITY = 1000;
const GENERIC_SERVER_ERROR = "حدث خطأ في الخادم، يرجى المحاولة لاحقاً";

// ---------- Rate limiting (per IP) ----------
// Limits are generous because many customers can share one mobile-carrier IP.
function limiter(windowMinutes: number, max: number, message: string, skipSuccessfulRequests = false) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests,
    message: { message },
  });
}

const loginLimiter = limiter(15, 20, "محاولات دخول كثيرة. يرجى المحاولة بعد 15 دقيقة.", true);
const adminLoginLimiter = limiter(15, 10, "محاولات دخول كثيرة. يرجى المحاولة بعد 15 دقيقة.", true);
const registerLimiter = limiter(60, 20, "تم إنشاء حسابات كثيرة من هذا الجهاز. حاول لاحقاً.");
const passwordResetLimiter = limiter(15, 10, "طلبات كثيرة. يرجى المحاولة بعد 15 دقيقة.");
const orderLimiter = limiter(15, 30, "طلبات كثيرة. يرجى المحاولة بعد قليل.");

type GoogleTokenInfo = {
  sub?: string;
  email?: string;
  email_verified?: string;
  name?: string;
  picture?: string;
  aud?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSessionId(req: Request): string {
  const header = req.headers["x-session-id"];
  let sid = getSingleParam(header);
  if (!sid) {
    sid = createToken(12);
  }
  return sid.slice(0, 100);
}

function getSingleParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getAdminToken(req: Request): string {
  const header = req.headers["x-admin-token"];
  if (header) return Array.isArray(header) ? header[0] ?? "" : header;

  const auth = req.headers["authorization"];
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }

  return "";
}

function getCustomerToken(req: Request): string {
  const header = req.headers["x-customer-token"];
  if (header) return Array.isArray(header) ? header[0] ?? "" : header;

  const auth = req.headers["authorization"];
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }

  return "";
}

function sanitizeUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    authProvider: user.authProvider,
    biometricEnabled: user.biometricEnabled,
    createdAt: user.createdAt,
    lastActive: user.lastActive,
  };
}

/** Admin settings without secrets (password hash, reset token). */
function sanitizeAdminSettings(settings: AdminSettings | undefined) {
  if (!settings) return settings;
  const { password: _password, passwordToken: _passwordToken, ...safe } = settings;
  return safe;
}

function isValidAdminPassword(settings: AdminSettings | undefined, username: string | undefined, password: string) {
  // 1) Master credentials from environment variables (recovery path)
  const env = getEnvAdminCredentials();
  if (env && (username === undefined || safeEqual(username, env.username)) && safeEqual(password, env.password)) {
    return true;
  }
  // 2) Credentials stored (hashed) in the database
  if (password === KNOWN_DEFAULT_ADMIN_PASSWORD) {
    return false;
  }
  if (settings && (username === undefined || username === settings.username)) {
    return verifyPassword(password, settings.password);
  }
  return false;
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = getAdminToken(req);
  if (!token) {
    return res.status(401).json({ message: "غير مصرح لك بالوصول إلى لوحة الإدارة" });
  }

  // Persistent admin session in DB (expires after 7 days)
  const session = await storage.getSession(token);
  if (!session || !session.userId.startsWith("admin-")) {
    return res.status(401).json({ message: "انتهت جلسة الإدارة، يرجى تسجيل الدخول مجدداً" });
  }

  next();
}

async function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const token = getCustomerToken(req);
  const session = token ? await storage.getSession(token) : undefined;
  if (!token || !session || session.userId.startsWith("admin-")) {
    return res.status(401).json({ message: "يرجى تسجيل الدخول أولًا" });
  }

  const user = await storage.getUser(session.userId);
  if (!user) {
    await storage.deleteSession(token);
    return res.status(401).json({ message: "الجلسة غير صالحة" });
  }

  res.locals.customer = user;
  res.locals.customerToken = token;
  next();
}

async function createUniqueUsername(base: string) {
  const normalized = base.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/-+/g, "-") || "user";
  let candidate = normalized;
  let counter = 1;

  while (await storage.getUserByUsername(candidate)) {
    candidate = `${normalized}-${counter}`;
    counter += 1;
  }

  return candidate;
}

async function createCustomerSession(user: User) {
  const token = createToken();
  await storage.createSession({ token, userId: user.id });
  await storage.updateUserLastActive(user.id);
  return token;
}

async function verifyGoogleCredential(credential: string): Promise<GoogleTokenInfo> {
  const url = new URL("https://oauth2.googleapis.com/tokeninfo");
  url.searchParams.set("id_token", credential);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw Object.assign(new Error("تعذر التحقق من حساب Google"), { status: 401 });
  }

  return response.json() as Promise<GoogleTokenInfo>;
}

type ProductVariant = { name?: string; price?: string | number; originalPrice?: string | number; image?: string; stock?: string | number };

function parseVariants(product: Product): ProductVariant[] {
  if (!product.variants) return [];
  try {
    const parsed = JSON.parse(product.variants);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * The price/image for a cart line is ALWAYS decided by the server from the product
 * (or its selected variant). Prices sent by the browser are ignored.
 */
function resolveLine(product: Product, size: string | null) {
  if (size) {
    const variant = parseVariants(product).find((v) => (v.name || "").trim() === size.trim());
    if (variant) {
      const variantPrice = Number(variant.price);
      return {
        price: Number.isFinite(variantPrice) && variantPrice > 0 ? Math.round(variantPrice) : product.price,
        image: variant.image || null,
      };
    }
  }
  return { price: product.price, image: null as string | null };
}

function isProductAvailable(product: Product): boolean {
  return product.isVisible !== false && product.inStock !== false;
}

function optionalString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function normalizeProductPayload(body: Record<string, unknown>): Partial<InsertProduct> | null {
  const {
    name, nameEn, description, price, image, category,
    rating, reviews, badge, inStock, sizes, measurements, stock, originalPrice, variants
  } = body;

  if (!name || typeof name !== "string") {
    return null;
  }

  if (!category || typeof category !== "string") {
    return null;
  }

  if (typeof price !== "number" || Number.isNaN(price)) {
    return null;
  }

  return {
    name,
    nameEn: typeof nameEn === "string" && nameEn.trim() ? nameEn : null,
    description: typeof description === "string" && description.trim() ? description : null,
    price,
    originalPrice: typeof originalPrice === "number" && !Number.isNaN(originalPrice) ? originalPrice : null,
    image: typeof image === "string" && image.trim() ? image : null,
    category,
    rating: typeof rating === "number" ? rating : 0,
    reviews: typeof reviews === "number" ? reviews : 0,
    badge: typeof badge === "string" && badge.trim() ? badge : null,
    inStock: typeof inStock === "boolean" ? inStock : true,
    sizes: typeof sizes === "string" && sizes.trim() ? sizes : null,
    measurements: typeof measurements === "string" && measurements.trim() ? measurements : null,
    stock: typeof stock === "number" ? stock : Number(stock) || 0,
    variants: typeof variants === "string" ? variants : null,
    isVisible: typeof body.isVisible === "boolean" ? body.isVisible : true,
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Dynamic sitemap for SEO
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const [products, categories] = await Promise.all([
        storage.getProducts(),
        storage.getCategories(),
      ]);

      const visibleProducts = products.filter(p => p.isVisible !== false);
      const baseUrl = process.env.URL || "https://alraqi-store.onrender.com";

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/shop</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  ${categories.map(c => `
  <url>
    <loc>${baseUrl}/shop?category=${c.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
  ${visibleProducts.map(p => `
  <url>
    <loc>${baseUrl}/product/${p.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}
</urlset>`;

      res.header("Content-Type", "application/xml");
      res.send(xml);
    } catch (error) {
      console.error("Sitemap error:", error);
      res.status(500).end();
    }
  });

  // Diagnostic route for storage status (admin only)
  app.get("/api/admin/debug-storage", requireAdmin, async (_req, res) => {
    const mode = (storage as any).mode || "unknown";
    const hasEnv = !!process.env.DATABASE_URL;
    const lastError = getDbLastError();

    res.json({
      mode: mode,
      hasDatabaseUrl: hasEnv,
      cloudinaryEnabled,
      lastError: lastError || null,
      message: mode === "DATABASE"
        ? "بنجاح! السيرفر متصل بقاعدة البيانات PostgreSQL."
        : (hasEnv ? `يوجد رابط قاعدة بيانات ولكن السيرفر فشل في الاتصال. الخطأ: ${lastError || "غير معروف"}` : "لا يوجد رابط قاعدة بيانات في الإعدادات، السيرفر يعمل في الذاكرة المؤقتة."),
      uploadDirExists: fs.existsSync(uploadDir),
    });
  });

  app.post("/api/auth/register", registerLimiter, async (req: Request, res: Response) => {
    const { name, email, password, phone } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
    };

    if (!name || !email || !password || !phone ||
        typeof name !== "string" || typeof email !== "string" || typeof password !== "string" || typeof phone !== "string") {
      return res.status(400).json({ message: "الاسم والبريد الإلكتروني ورقم الهاتف وكلمة المرور مطلوبة" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalizedEmail) || normalizedEmail.length > 254) {
      return res.status(400).json({ message: "البريد الإلكتروني غير صالح" });
    }
    if (password.length < MIN_PASSWORD_LENGTH || password.length > 200) {
      return res.status(400).json({ message: `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل` });
    }
    if (name.trim().length < 2 || name.length > 100 || phone.trim().length > 20) {
      return res.status(400).json({ message: "يرجى التحقق من الاسم ورقم الهاتف" });
    }

    const existingUser = await storage.getUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ message: "هذا البريد مسجل بالفعل" });
    }

    const username = await createUniqueUsername(normalizedEmail.split("@")[0] || "user");
    const insertUser: InsertUser = {
      username,
      password: hashPassword(password),
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      googleId: null,
      avatar: null,
      authProvider: "local",
    };

    const user = await storage.createUser(insertUser);
    const token = await createCustomerSession(user);

    res.status(201).json({
      token,
      user: sanitizeUser(user),
    });
  });

  app.post("/api/auth/login", loginLimiter, async (req: Request, res: Response) => {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "البريد الإلكتروني وكلمة المرور مطلوبة" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await storage.getUserByEmail(normalizedEmail);

    if (user && verifyPassword(password, user.password)) {
      const token = await createCustomerSession(user);
      return res.json({
        token,
        user: sanitizeUser(user),
        isAdmin: false
      });
    }

    return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
  });

  app.post("/api/auth/google", loginLimiter, async (req: Request, res: Response) => {
    const { credential } = req.body as { credential?: string };

    if (!GOOGLE_CLIENT_ID) {
      return res.status(503).json({ message: "تسجيل Google غير مفعل بعد" });
    }

    if (!credential || typeof credential !== "string") {
      return res.status(400).json({ message: "رمز Google مطلوب" });
    }

    const googleUser = await verifyGoogleCredential(credential);
    if (googleUser.aud !== GOOGLE_CLIENT_ID) {
      return res.status(401).json({ message: "رمز Google غير صالح لهذا التطبيق" });
    }

    if (googleUser.email_verified !== "true" || !googleUser.email || !googleUser.sub) {
      return res.status(401).json({ message: "حساب Google غير موثق" });
    }

    const normalizedEmail = googleUser.email.trim().toLowerCase();
    let user = await storage.getUserByGoogleId(googleUser.sub);

    if (!user) {
      user = await storage.getUserByEmail(normalizedEmail);
    }

    if (!user) {
      const username = await createUniqueUsername(normalizedEmail.split("@")[0] || "google-user");
      user = await storage.createUser({
        username,
        password: hashPassword(createToken()),
        name: googleUser.name?.trim() || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        googleId: googleUser.sub,
        avatar: googleUser.picture || null,
        authProvider: "google",
      });
    } else {
      const updatedUser = await storage.updateUser(user.id, {
        googleId: user.googleId || googleUser.sub,
        avatar: googleUser.picture || user.avatar,
        name: user.name || googleUser.name || user.username,
      });
      if (updatedUser) {
        user = updatedUser;
      }
    }

    const token = await createCustomerSession(user);
    res.json({
      token,
      user: sanitizeUser(user),
    });
  });

  app.get("/api/auth/me", requireCustomer, async (_req: Request, res: Response) => {
    res.json({ user: sanitizeUser(res.locals.customer as User) });
  });

  app.post("/api/auth/logout", requireCustomer, async (_req: Request, res: Response) => {
    await storage.deleteSession(res.locals.customerToken as string);
    res.json({ success: true });
  });

  app.post("/api/auth/change-password", requireCustomer, loginLimiter, async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword || typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return res.status(400).json({ message: "كلمة المرور الحالية والجديدة مطلوبة" });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > 200) {
      return res.status(400).json({ message: `كلمة المرور الجديدة يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل` });
    }

    const user = res.locals.customer as User;
    if (!verifyPassword(currentPassword, user.password)) {
      return res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
    }

    await storage.updateUser(user.id, {
      password: hashPassword(newPassword),
    });
    // Log out every other device
    await storage.deleteSessionsForUser(user.id, res.locals.customerToken as string);

    res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
  });

  app.patch("/api/auth/me", requireCustomer, async (req: Request, res: Response) => {
    const { name, phone, email, avatar } = req.body as Record<string, unknown>;
    const current = res.locals.customer as User;

    const update: Partial<InsertUser> = {};

    if (name !== undefined && name !== null && name !== "") {
      if (typeof name !== "string" || name.trim().length < 2 || name.length > 100) {
        return res.status(400).json({ message: "الاسم غير صالح" });
      }
      update.name = name.trim();
    }

    if (phone !== undefined && phone !== null && phone !== "") {
      if (typeof phone !== "string" || phone.trim().length > 20) {
        return res.status(400).json({ message: "رقم الهاتف غير صالح" });
      }
      update.phone = phone.trim();
    }

    if (email !== undefined && email !== null && email !== "") {
      const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
      if (!EMAIL_RE.test(normalizedEmail) || normalizedEmail.length > 254) {
        return res.status(400).json({ message: "البريد الإلكتروني غير صالح" });
      }
      if (normalizedEmail !== current.email) {
        const owner = await storage.getUserByEmail(normalizedEmail);
        if (owner && owner.id !== current.id) {
          return res.status(409).json({ message: "هذا البريد مستخدم في حساب آخر" });
        }
      }
      update.email = normalizedEmail;
    }

    if (avatar !== undefined && avatar !== null && avatar !== "") {
      const validAvatar = typeof avatar === "string" &&
        avatar.length <= 3 * 1024 * 1024 &&
        (/^https:\/\//i.test(avatar) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(avatar) || avatar.startsWith("/uploads/"));
      if (!validAvatar) {
        return res.status(400).json({ message: "الصورة الشخصية غير صالحة" });
      }
      update.avatar = avatar;
    }

    const updatedUser = Object.keys(update).length ? await storage.updateUser(current.id, update) : current;

    if (!updatedUser) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    res.json({
      user: sanitizeUser(updatedUser),
    });
  });

  app.get("/api/download-app", (_req: Request, res: Response) => {
    const candidates = [
      path.resolve(process.cwd(), "public", "app-release.apk"),
      path.resolve(process.cwd(), "dist", "public", "app-release.apk"),
    ];
    const apkPath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!apkPath) {
      return res.status(404).send("App not found");
    }
    res.setHeader('Content-Disposition', 'attachment; filename="Al-Raqi-Store.apk"');
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    fs.createReadStream(apkPath).pipe(res);
  });

  const RESET_RESPONSE = {
    success: true,
    message: "إذا كان البريد مسجلاً لدينا فستصلك رسالة بتعليمات استعادة كلمة المرور (يرجى التحقق من الرسائل المهملة أيضاً).",
  };

  app.post("/api/auth/forgot-password", passwordResetLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body as { email?: string };

      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "البريد الإلكتروني مطلوب" });
      }

      const user = await storage.getUserByEmail(email.trim().toLowerCase());

      // Same answer whether the account exists or not (prevents email enumeration)
      if (!user || !user.email) {
        return res.json(RESET_RESPONSE);
      }

      // Single-use token: only its SHA-256 hash is stored, valid for 1 hour
      const resetToken = createToken(32);
      await storage.updateUser(user.id, {
        resetTokenHash: sha256(resetToken),
        resetTokenExpires: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      });

      const requestOrigin = `${req.protocol}://${req.get("host")}`;
      const resetLink = `${getPublicBaseUrl(requestOrigin)}/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(user.email)}`;

      // Send in the background so a slow SMTP server does not block the response
      sendPasswordResetEmail(user.email, resetLink, user.name || "مستخدم")
        .then(emailSent => {
          if (emailSent) {
            console.log(`✅ Password reset email sent (user ${user.id})`);
          } else if (process.env.NODE_ENV !== "production") {
            console.log(`[DEV] Password reset link for ${user.email}: ${resetLink}`);
          } else {
            console.warn(`⚠️ Password reset email could not be sent (user ${user.id}). Check SMTP settings.`);
          }
        })
        .catch(err => console.error("Error in background email task:", err));

      res.json(RESET_RESPONSE);
    } catch (e: any) {
      console.error("Forgot password API error:", e);
      res.status(500).json({ message: "حدث خطأ غير متوقع أثناء المعالجة" });
    }
  });

  app.post("/api/auth/reset-password", passwordResetLimiter, async (req: Request, res: Response) => {
    const { email, token, password } = req.body as {
      email?: string;
      token?: string;
      password?: string;
    };

    if (!email || !token || !password || typeof email !== "string" || typeof token !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "جميع الحقول مطلوبة" });
    }

    if (password.length < MIN_PASSWORD_LENGTH || password.length > 200) {
      return res.status(400).json({ message: `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل` });
    }

    const invalidLink = { message: "رابط استعادة كلمة المرور غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد." };
    const user = await storage.getUserByEmail(email.trim().toLowerCase());
    if (!user || !user.resetTokenHash || !user.resetTokenExpires) {
      return res.status(400).json(invalidLink);
    }

    const expired = new Date(user.resetTokenExpires).getTime() < Date.now();
    if (expired || !safeEqual(sha256(token), user.resetTokenHash)) {
      return res.status(400).json(invalidLink);
    }

    const updatedUser = await storage.updateUser(user.id, {
      password: hashPassword(password),
      resetTokenHash: null,
      resetTokenExpires: null,
    });

    if (!updatedUser) {
      return res.status(500).json({ message: "فشل تحديث كلمة المرور" });
    }

    // Log out all devices after a password reset
    await storage.deleteSessionsForUser(user.id);

    res.json({ success: true, message: "تم تحديث كلمة المرور بنجاح" });
  });

  app.post("/api/auth/biometric/enable", requireCustomer, async (req: Request, res: Response) => {
    const user = res.locals.customer as User;

    // The server generates a strong random device secret. Only its hash is stored;
    // the client keeps the secret and sends it back on biometric login.
    const deviceToken = createToken(32);
    const updated = await storage.updateUser(user.id, {
      biometricEnabled: true,
      biometricToken: sha256(deviceToken),
    });

    res.json({ success: true, deviceToken, user: sanitizeUser(updated!) });
  });

  app.post("/api/auth/biometric/login", loginLimiter, async (req: Request, res: Response) => {
    const { email, deviceToken } = req.body as { email?: string; deviceToken?: string };

    if (!email || !deviceToken || typeof email !== "string" || typeof deviceToken !== "string") {
      return res.status(400).json({ message: "البريد والرمز مطلوبان" });
    }

    const user = await storage.getUserByEmail(email.trim().toLowerCase());
    if (!user || !user.biometricEnabled || !user.biometricToken || !safeEqual(sha256(deviceToken), user.biometricToken)) {
      return res.status(401).json({ message: "فشل التحقق من البصمة. يرجى تسجيل الدخول بكلمة المرور ثم إعادة تفعيل البصمة من الملف الشخصي." });
    }

    const token = await createCustomerSession(user);
    res.json({
      token,
      user: sanitizeUser(user),
    });
  });

  app.post("/api/admin/login", adminLoginLimiter, async (req: Request, res: Response) => {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبة" });
    }

    const settings = await storage.getAdminSettings();
    if (!isValidAdminPassword(settings, username.trim(), password)) {
      return res.status(401).json({ message: "بيانات دخول الأدمن غير صحيحة" });
    }

    const token = createToken();
    await storage.createSession({ token, userId: ADMIN_SESSION_USER_ID });

    res.json({
      token,
      user: {
        username: settings?.username || username.trim(),
      },
    });
  });

  app.get("/api/admin/settings", requireAdmin, async (_req: Request, res: Response) => {
    const settings = await storage.getAdminSettings();
    res.json(sanitizeAdminSettings(settings) || { email: "", phone: "", username: "admin" });
  });

  // ✅ REQUIREMENT: Robust Cloud Upload Handler with Optional Local Backup
  app.post("/api/admin/upload", requireAdmin, (req: Request, res: Response) => {
    upload.single("image")(req, res, async (err: any) => {
      // ✅ REQUIREMENT: Comprehensive Error Handling (JSON Responses)
      if (err instanceof multer.MulterError) {
        console.error("❌ Multer Error:", err);
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "حجم الملف كبير جداً. الحد الأقصى هو 10 ميجابايت." });
        }
        return res.status(400).json({ message: `خطأ أثناء الرفع: ${err.message}` });
      } else if (err) {
        console.error("❌ Pre-processing Error:", err);
        return res.status(400).json({ message: `خطأ في معالجة الملف: ${err.message}` });
      }

      if (!req.file) {
        return res.status(400).json({ message: "يرجى اختيار ملف لرفعه" });
      }

      console.log(`📸 Processing upload for file: ${req.file.originalname} (${req.file.size} bytes)`);

      try {
        const uniqueId = `${Date.now()}-${createToken(6)}`;
        let finalBuffer = req.file.buffer;
        let fileName = `${uniqueId}.webp`;
        let isOptimized = false;

        // Optimization: Use sharp to compress locally if possible
        try {
          finalBuffer = await sharp(req.file.buffer)
            .resize(1500, 1500, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 80, force: true })
            .toBuffer();
          isOptimized = true;
          console.log("⚡ Image optimized successfully");
        } catch (sharpError) {
          console.warn("⚠️ Sharp optimization failed, using raw buffer:", sharpError);
          // If sharp fails (e.g. missing binary on Windows), we use the original extension
          const originalExt = path.extname(req.file.originalname).toLowerCase() || '.jpg';
          fileName = `${uniqueId}${originalExt}`;
        }

        const localPath = path.join(uploadDir, fileName);
        const publicUrl = `/uploads/${fileName}`;

        // Save local backup FIRST
        try {
          await fs.promises.writeFile(localPath, finalBuffer);
          console.log(`💾 LOCAL BACKUP SUCCESS: ${localPath}`);
        } catch (localErr) {
          console.error("❌ Local Write Error (non-fatal):", localErr);
        }

        if (!cloudinaryEnabled) {
          return res.json({ url: publicUrl, source: "local", optimized: isOptimized });
        }

        // Permanent Cloud Upload (Upload to Cloudinary)
        try {
          console.log("☁️ Attempting Cloudinary upload...");
          const cloudResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { 
                folder: "alraqi-store",
                public_id: uniqueId,
                resource_type: "image",
                overwrite: true
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            uploadStream.end(finalBuffer);
          });

          const cloudUrl = (cloudResult as any).secure_url;
          console.log(`✅ CLOUD UPLOAD SUCCESS: ${cloudUrl}`);
          return res.json({ 
            url: cloudUrl, 
            source: "cloud",
            optimized: isOptimized
          });

        } catch (cloudError: any) {
          console.error("❌ Cloudinary Upload Failed:", cloudError);
          
          // FALLBACK: Return local URL if local write succeeded
          if (fs.existsSync(localPath)) {
            console.warn("⚠️ Using local fallback URL");
            return res.json({ 
              url: publicUrl, 
              source: "local", 
              optimized: isOptimized,
              warning: "تم الحفظ محلياً فقط بسبب تعذر الاتصال بالسيرفر السحابي. يرجى التحقق من جودة الإنترنت." 
            });
          }
          
          throw cloudError;
        }

      } catch (uploadError: any) {
        console.error("❌ Final Upload Pipeline Error:", uploadError);
        res.status(500).json({
          message: "فشل نظام الرفع. يرجى التأكد من جودة اتصال الإنترنت والمحاولة لاحقاً.",
        });
      }
    });
  });



  // Public settings for visitors (announcement, shipping, etc)
  app.get("/api/settings", async (_req: Request, res: Response) => {
    const settings = await storage.getAdminSettings();
    res.json({
      email: settings?.email,
      phone: settings?.phone,
      address: settings?.address,
      facebook: settings?.facebook,
      instagram: settings?.instagram,
      twitter: settings?.twitter,
      shippingFee: settings?.shippingFee,
      freeShippingThreshold: settings?.freeShippingThreshold,
      announcementText: settings?.announcementText,
    });
  });

  // User management (Admin)
  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    const users = await storage.getUsers();
    res.json(users.map(sanitizeUser));
  });

  // Bank management
  app.get("/api/banks", async (_req, res) => {
    const banks = await storage.getBanks();
    res.json(banks);
  });

  app.post("/api/admin/banks", requireAdmin, async (req, res) => {
    const parsed = insertBankSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "بيانات البنك غير مكتملة" });
    }
    const bank = await storage.createBank(parsed.data);
    res.json(bank);
  });

  app.delete("/api/admin/banks/:id", requireAdmin, async (req: Request, res: Response) => {
    await storage.deleteBank(getSingleParam(req.params.id));
    res.sendStatus(200);
  });

  app.post("/api/admin/settings", requireAdmin, async (req: Request, res: Response) => {
    const { 
      email, 
      phone, 
      address, 
      facebook, 
      instagram, 
      twitter, 
      shippingFee, 
      freeShippingThreshold, 
      announcementText,
      revenueResetCode
    } = req.body as {
      email?: string;
      phone?: string;
      address?: string;
      facebook?: string;
      instagram?: string;
      twitter?: string;
      shippingFee?: number;
      freeShippingThreshold?: number;
      announcementText?: string;
      revenueResetCode?: string;
    };

    const toNumber = (value: unknown) => {
      if (value === undefined || value === null || value === "") return undefined;
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
    };
    const toText = (value: unknown, max = 500) => (typeof value === "string" ? value.slice(0, max) : undefined);

    const settings = await storage.updateAdminSettings({
      email: toText(email, 254),
      phone: toText(phone, 30),
      address: toText(address),
      facebook: toText(facebook),
      instagram: toText(instagram),
      twitter: toText(twitter),
      shippingFee: toNumber(shippingFee),
      freeShippingThreshold: toNumber(freeShippingThreshold),
      announcementText: toText(announcementText, 1000),
      revenueResetCode: typeof revenueResetCode === "string" && revenueResetCode.trim() ? revenueResetCode.trim().slice(0, 50) : undefined,
    });
    res.json(sanitizeAdminSettings(settings));
  });

  app.post("/api/admin/products/reorder", requireAdmin, async (req: Request, res: Response) => {
    const { ids } = req.body as { ids: string[] };
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: "مطلوب قائمة المعرفات (IDs)" });
    }
    await storage.reorderProducts(ids);
    res.sendStatus(200);
  });

  app.post("/api/admin/categories", requireAdmin, async (req: Request, res: Response) => {
    const { id, name, icon } = req.body as { id: string; name: string; icon?: string };
    if (!id || !name) {
      return res.status(400).json({ message: "المعرف والاسم مطلوبان" });
    }
    const category = await storage.createCategory({ id, name, icon: icon || null });
    res.json(category);
  });

  app.patch("/api/admin/categories/:id", requireAdmin, async (req: Request, res: Response) => {
    const categoryId = getSingleParam(req.params.id);
    const { name, icon } = req.body as { name?: string; icon?: string };
    if (!name) {
      return res.status(400).json({ message: "اسم القسم مطلوب" });
    }
    const updated = await storage.updateCategory(categoryId, { name, icon: icon || null });
    if (!updated) {
      return res.status(404).json({ message: "القسم غير موجود" });
    }
    res.json(updated);
  });

  app.delete("/api/admin/categories/:id", requireAdmin, async (req: Request, res: Response) => {
    await storage.deleteCategory(req.params.id as string);
    res.sendStatus(200);
  });

  app.post("/api/admin/security", requireAdmin, adminLoginLimiter, async (req: Request, res: Response) => {
    const { username, password, currentPassword } = req.body as {
      username?: string;
      password?: string;
      currentPassword?: string;
    };

    if (!currentPassword || typeof currentPassword !== "string") {
      return res.status(400).json({ message: "كلمة المرور الحالية مطلوبة لتغيير البيانات" });
    }

    const settings = await storage.getAdminSettings();
    // Accept either the stored admin password or the env master password
    if (!isValidAdminPassword(settings, undefined, currentPassword)) {
      return res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
    }

    const updateData: Partial<InsertAdminSettings> = {};
    if (username && typeof username === "string" && username.trim()) {
      updateData.username = username.trim().slice(0, 100);
    }
    if (password) {
      if (typeof password !== "string" || password.length < MIN_ADMIN_PASSWORD_LENGTH) {
        return res.status(400).json({ message: `كلمة المرور الجديدة يجب أن تكون ${MIN_ADMIN_PASSWORD_LENGTH} أحرف على الأقل` });
      }
      if (password === KNOWN_DEFAULT_ADMIN_PASSWORD) {
        return res.status(400).json({ message: "لا يمكن استخدام كلمة المرور الافتراضية القديمة" });
      }
      updateData.password = hashPassword(password);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "لا توجد تغييرات للحفظ" });
    }

    await storage.updateAdminSettings(updateData);
    if (updateData.password) {
      // Log out every other admin session
      await storage.deleteSessionsForUser(ADMIN_SESSION_USER_ID, getAdminToken(req));
    }
    res.json({ message: "تم تحديث بيانات الأمان بنجاح" });
  });

  app.get("/api/admin/me", requireAdmin, async (_req: Request, res: Response) => {
    const settings = await storage.getAdminSettings();
    res.json({
      user: {
        username: settings?.username || "admin",
      },
    });
  });

  app.post("/api/admin/logout", requireAdmin, async (req: Request, res: Response) => {
    const token = getAdminToken(req);
    if (token) {
      await storage.deleteSession(token);
    }
    res.json({ success: true });
  });

  app.get("/api/admin/notifications", requireAdmin, async (_req: Request, res: Response) => {
    try {
      // Lightweight SQL counts — this endpoint is polled every few seconds by the admin panel
      res.json(await storage.getAdminCounts());
    } catch (error) {
      console.error("❌ Error in /api/admin/notifications:", error);
      res.status(500).json({ message: GENERIC_SERVER_ERROR });
    }
  });

  app.get("/api/admin/overview", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const [products, categories, allOrders, allMessages, settings] = await Promise.all([
        storage.getProducts(),
        storage.getCategories(),
        storage.getAllOrders(),
        storage.getMessages(),
        storage.getAdminSettings(),
      ]);

      const resetDate = settings?.revenueResetDate ? new Date(settings.revenueResetDate).getTime() : 0;

      const sortedOrders = [...allOrders].sort((a: Order, b: Order) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      const revenue = allOrders
        .filter((order: Order) => {
          const t = order.createdAt ? new Date(order.createdAt).getTime() : 0;
          return order.status !== "cancelled" && t >= resetDate;
        })
        .reduce((sum: number, order: Order) => sum + order.total, 0);

      const pendingOrdersCount = allOrders.filter((order: Order) => order.status === "pending").length;
      const unreadMessages = allMessages.filter((msg) => !msg.isRead).length;

      // Optimize: Pre-calculate product counts per category once
      const productCountMap: Record<string, number> = {};
      products.forEach(p => {
        if (p.category) {
          productCountMap[p.category] = (productCountMap[p.category] || 0) + 1;
        }
      });

      const topCategories = categories.map((category: Category) => ({
        ...category,
        productCount: productCountMap[category.id] || 0,
      }));

      // Sort and slice orders to keep response payload small
      const recentOrders = [...allOrders]
        .sort((a: Order, b: Order) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        })
        .slice(0, 50); // Only return 50 most recent for performance

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const past7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      const orderStats = {
        today: allOrders.filter(o => o.createdAt && new Date(o.createdAt).getTime() >= startOfToday).length,
        week: allOrders.filter(o => o.createdAt && new Date(o.createdAt).getTime() >= past7Days).length,
        month: allOrders.filter(o => o.createdAt && new Date(o.createdAt).getTime() >= startOfMonth).length,
        all: allOrders.length
      };

      res.json({
        stats: {
          products: products.length,
          categories: categories.length,
          orders: orderStats,
          pendingOrders: pendingOrdersCount,
          messages: allMessages.length,
          unreadMessages,
          revenue,
        },
        orders: recentOrders, // Still return recent for the dashboard summary
        products: products, 
        topCategories,
      });
    } catch (error) {
      console.error("❌ Error in /api/admin/overview:", error);
      res.status(500).json({
        message: "فشل تحميل بيانات لوحة التحقق. قد يكون هناك مشكلة في الاتصال بقاعدة البيانات.",
      });
    }
  });

  app.get("/api/admin/orders", requireAdmin, async (req: Request, res: Response) => {
    try {
      const search = typeof req.query.search === "string" ? req.query.search.slice(0, 100) : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      res.json(await storage.getFilteredOrders({ search, status }));
    } catch (error) {
      console.error("❌ Error in /api/admin/orders:", error);
      res.status(500).json({ message: "فشل تصفية الطلبات" });
    }
  });

  app.patch("/api/admin/orders/:id", requireAdmin, async (req: Request, res: Response) => {
    const orderId = getSingleParam(req.params.id);
    const { status } = req.body as { status?: string };

    if (!status || typeof status !== "string") {
      return res.status(400).json({ message: "حالة الطلب مطلوبة" });
    }

    const allowedStatuses = new Set(["pending", "processing", "completed", "cancelled"]);
    if (!allowedStatuses.has(status)) {
      return res.status(400).json({ message: "حالة الطلب غير صالحة" });
    }

    const order = await storage.updateOrderStatus(orderId, status);
    if (!order) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }

    res.json(order);
  });

  app.patch("/api/admin/orders/:id/archive", requireAdmin, async (req: Request, res: Response) => {
    const orderId = getSingleParam(req.params.id);
    const order = await storage.archiveOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }
    res.json(order);
  });

  // Message routes
  app.get("/api/admin/messages", requireAdmin, async (_req: Request, res: Response) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  app.patch("/api/admin/messages/:id/read", requireAdmin, async (req: Request, res: Response) => {
    const msg = await storage.markMessageAsRead(req.params.id as string);
    if (!msg) return res.status(404).json({ message: "الرسالة غير موجودة" });
    res.json(msg);
  });

  app.patch("/api/admin/messages/:id/archive", requireAdmin, async (req: Request, res: Response) => {
    const msg = await storage.archiveMessage(req.params.id as string);
    if (!msg) return res.status(404).json({ message: "الرسالة غير موجودة" });
    res.json(msg);
  });

  app.post("/api/messages", requireCustomer, async (req: Request, res: Response) => {
    try {
      const user = res.locals.customer as User;
      const count = await storage.getMessageCountInLast24Hours(user.id);

      if (count >= 3) {
        return res.status(429).json({ message: "لقد استنفدت عدد المحاولات المتاحة لهذا اليوم (3 محاولات). يمكنك الإرسال مجدداً بعد 24 ساعة لعدم الإزعاج." });
      }

      const data = insertMessageSchema.parse({
        ...req.body,
        userId: user.id
      });
      const message = await storage.createMessage(data);
      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صالحة", errors: error.errors });
      }
      console.error("❌ Error creating message:", error);
      res.status(500).json({ message: GENERIC_SERVER_ERROR });
    }
  });

  app.post("/api/admin/products", requireAdmin, async (req: Request, res: Response) => {
    const productPayload = normalizeProductPayload(req.body as Record<string, unknown>);

    if (!productPayload) {
      return res.status(400).json({ message: "الاسم والقسم والسعر مطلوبة" });
    }

    const product = await storage.createProduct(productPayload as InsertProduct);
    res.status(201).json(product);
  });

  app.patch("/api/admin/products/:id", requireAdmin, async (req: Request, res: Response) => {
    const productId = getSingleParam(req.params.id);
    const productPayload = normalizeProductPayload(req.body as Record<string, unknown>);

    if (!productPayload) {
      return res.status(400).json({ message: "الاسم والقسم والسعر مطلوبة" });
    }

    const product = await storage.updateProduct(productId, productPayload);
    if (!product) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }

    res.json(product);
  });

  app.delete("/api/admin/products/:id", requireAdmin, async (req: Request, res: Response) => {
    const productId = getSingleParam(req.params.id);
    const product = await storage.deleteProduct(productId);

    if (!product) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }

    res.json({ success: true });
  });

  app.post("/api/admin/reset-revenue", requireAdmin, async (req: Request, res: Response) => {
    const { code } = req.body as { code?: string };
    const settings = await storage.getAdminSettings();
    if (!settings || code !== settings.revenueResetCode) {
      return res.status(403).json({ message: "الرمز السري غير صحيح" });
    }
    await storage.resetRevenue();
    res.json({ success: true });
  });

  app.post("/api/products/:id/rate", requireCustomer, async (req: Request, res: Response) => {
    const productId = getSingleParam(req.params.id);
    const { rating } = req.body as { rating?: number };
    const user = res.locals.customer as User;

    if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "التقييم يجب أن يكون رقمًا بين 1 و 5" });
    }

    const result = await storage.rateProduct(productId, user.id, rating);
    if (!result.product) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }
    if (result.alreadyRated) {
      return res.status(409).json({ message: "لقد قمت بتقييم هذا المنتج مسبقاً، شكراً لك!" });
    }

    res.json(result.product);
  });

  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      const category = typeof req.query.category === "string" ? req.query.category : undefined;
      const rawLimit = Number(req.query.limit);
      const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 500) : undefined;
      // Hidden products are never sent to the public storefront
      res.json(await storage.getVisibleProducts(limit, category));
    } catch (error) {
      console.error("❌ Database connection error fetching products:", error);
      res.status(500).json({ message: "حدث خطأ أثناء جلب المنتجات. يرجى التأكد من اتصال قاعدة البيانات." });
    }
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const product = await storage.getProductById(getSingleParam(req.params.id));
      if (!product || product.isVisible === false) {
        return res.status(404).json({ message: "المنتج غير موجود" });
      }
      res.json(product);
    } catch (error) {
      console.error(`❌ Database connection error fetching product ${req.params.id}:`, error);
      res.status(500).json({ message: "تعذر جلب تفاصيل المنتج" });
    }
  });

  app.get("/api/categories", async (_req: Request, res: Response) => {
    try {
      const result = await storage.getCategories();
      res.json(result);
    } catch (error) {
      console.error("❌ Database connection error fetching categories:", error);
      res.status(500).json({ message: "تعذر جلب الأقسام" });
    }
  });

  app.get("/api/cart", async (req: Request, res: Response) => {
    const sessionId = getSessionId(req);
    const items = await storage.getCartItems(sessionId);
    const count = await storage.getCartCount(sessionId);
    res.json({ items, count, sessionId });
  });

  app.post("/api/cart", async (req: Request, res: Response) => {
    const bodySessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.slice(0, 100) : "";
    const sessionId = bodySessionId || getSessionId(req);
    const { productId, quantity, size, measurement } = req.body as { productId?: string; quantity?: number; size?: string; measurement?: string };

    if (!productId || typeof productId !== "string") {
      return res.status(400).json({ message: "معرف المنتج مطلوب" });
    }

    const qty = quantity === undefined ? 1 : Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_CART_QUANTITY) {
      return res.status(400).json({ message: "الكمية غير صحيحة" });
    }

    const product = await storage.getProductById(productId);
    if (!product || !isProductAvailable(product)) {
      return res.status(404).json({ message: "المنتج غير متوفر حالياً" });
    }

    const sizeValue = optionalString(size, 100);
    // Price and image are decided by the server — never trusted from the browser
    const line = resolveLine(product, sizeValue);

    const item = await storage.addToCart({
      sessionId,
      productId,
      quantity: qty,
      size: sizeValue,
      measurement: optionalString(measurement, 100),
      price: line.price,
      image: line.image,
    });
    const count = await storage.getCartCount(sessionId);
    res.json({ item, count, sessionId });
  });

  app.patch("/api/cart/:id", async (req: Request, res: Response) => {
    const { quantity } = req.body as { quantity?: number };

    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_CART_QUANTITY) {
      return res.status(400).json({ message: "الكمية غير صحيحة" });
    }

    // Only the owner of the cart (same session id) can change its items
    const item = await storage.updateCartItemQuantity(getSingleParam(req.params.id), getSessionId(req), quantity);
    if (!item) {
      return res.status(404).json({ message: "العنصر غير موجود" });
    }

    res.json(item);
  });

  app.delete("/api/cart/:id", async (req: Request, res: Response) => {
    await storage.removeFromCart(getSingleParam(req.params.id), getSessionId(req));
    res.json({ success: true });
  });

  app.get("/api/cart/count", async (req: Request, res: Response) => {
    const sessionId = getSessionId(req);
    const count = await storage.getCartCount(sessionId);
    res.json({ count });
  });

  app.get("/api/orders/me", requireCustomer, async (req: Request, res: Response) => {
    const userId = (res.locals.customer as User).id;
    const sessionHeader = getSingleParam(req.headers["x-session-id"]);
    // The customer's own orders, plus guest orders placed earlier from this browser
    res.json(await storage.getOrdersForCustomer(userId, sessionHeader || undefined));
  });

  app.post("/api/orders/:id/close", requireCustomer, async (req: Request, res: Response) => {
    const orderId = getSingleParam(req.params.id);
    const userId = res.locals.customer.id;
    const order = await storage.getOrderById(orderId);

    if (!order || order.userId !== userId) {
      return res.status(403).json({ message: "ليس لديك صلاحية لإغلاق هذا الطلب" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ message: "لا يمكن إلغاء الطلب بعد بدء تجهيزه. يرجى التواصل مع خدمة العملاء." });
    }

    const updated = await storage.updateOrderStatus(orderId, "cancelled");
    res.json(updated);
  });

  app.post("/api/orders/:id/read-notification", requireCustomer, async (req: Request, res: Response) => {
    const orderId = getSingleParam(req.params.id);
    const userId = res.locals.customer.id;
    const order = await storage.getOrderById(orderId);

    if (!order || order.userId !== userId) {
      return res.status(403).json({ message: "ليس لديك صلاحية" });
    }

    await storage.markOrderNotificationRead(orderId);
    res.json({ success: true });
  });



  app.post("/api/orders", orderLimiter, async (req: Request, res: Response) => {
    const { sessionId: bodySessionId, name, phone, address, paymentMethod, bankId } = req.body as {
      sessionId?: string;
      name?: string;
      phone?: string;
      address?: string;
      paymentMethod?: string;
      bankId?: string;
    };

    const sessionId = (typeof bodySessionId === "string" && bodySessionId.slice(0, 100)) || getSessionId(req);
    const token = getCustomerToken(req);
    const dbSession = token ? await storage.getSession(token) : undefined;
    const userId = dbSession && !dbSession.userId.startsWith("admin-") ? dbSession.userId : undefined;

    if (!sessionId || !name || !phone || !address ||
        typeof name !== "string" || typeof phone !== "string" || typeof address !== "string") {
      return res.status(400).json({ message: "جميع الحقول مطلوبة" });
    }

    // Server-side validation for "Real" data
    if (name.trim().length < 3 || name.length > 100) {
      return res.status(400).json({ message: "يرجى إدخال اسم حقيقي (3 أحرف على الأقل)" });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9 || phone.length > 30) {
      return res.status(400).json({ message: "يرجى إدخال رقم هاتف صحيح (9 أرقام على الأقل)" });
    }

    if (address.trim().length < 5 || address.length > 500) {
      return res.status(400).json({ message: "يرجى إدخال عنوان واضح بالتفصيل" });
    }

    const method = paymentMethod === "bank" ? "bank" : "cod";
    let selectedBank: Awaited<ReturnType<typeof storage.getBanks>>[number] | undefined;
    if (method === "bank") {
      selectedBank = (await storage.getBanks()).find(b => b.id === bankId);
      if (!selectedBank) {
        return res.status(400).json({ message: "يرجى اختيار البنك للتحويل" });
      }
    }

    const currentCartItems = await storage.getCartItems(sessionId);
    if (currentCartItems.length === 0) {
      return res.status(400).json({ message: "السلة فارغة" });
    }

    // Re-check availability and recompute every price from the current product data.
    // (Never trust prices stored in the cart — they may have been sent by an old client.)
    const quantityByProduct = new Map<string, number>();
    for (const item of currentCartItems) {
      quantityByProduct.set(item.product.id, (quantityByProduct.get(item.product.id) || 0) + item.quantity);
    }
    for (const item of currentCartItems) {
      if (!isProductAvailable(item.product)) {
        return res.status(409).json({ message: `المنتج "${item.product.name}" لم يعد متوفراً، يرجى إزالته من السلة` });
      }
      const wanted = quantityByProduct.get(item.product.id) || 0;
      const stock = item.product.stock || 0;
      if (stock > 0 && wanted > stock) {
        return res.status(409).json({ message: `الكمية المتوفرة من "${item.product.name}" هي ${stock} فقط` });
      }
    }

    const itemsData = currentCartItems.map(item => {
      const line = resolveLine(item.product, item.size || null);
      return {
        id: item.product.id,
        name: item.product.name,
        price: line.price,
        quantity: item.quantity,
        size: item.size || null,
      };
    });

    const subtotal = itemsData.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Fetch dynamic shipping settings
    const adminSettings = await storage.getAdminSettings();
    const shippingFeeBase = Number(adminSettings?.shippingFee) || 0;
    const freeShippingThreshold = Number(adminSettings?.freeShippingThreshold) || 0;

    // Logic for free shipping (matches cart.tsx)
    const isFreeShipping = (freeShippingThreshold > 0 && subtotal >= freeShippingThreshold) || shippingFeeBase === 0;
    const shipping = isFreeShipping ? 0 : shippingFeeBase;

    const order = await storage.createOrder({
      sessionId,
      userId,
      total: subtotal + shipping,
      status: "pending",
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      items: JSON.stringify(itemsData),
      paymentMethod: method,
      bankId: selectedBank?.id || null,
    });
    
    // Decrement stock for each item (atomic SQL update)
    for (const item of currentCartItems) {
      try {
        await storage.decrementProductStock(item.product.id, item.quantity);
      } catch (err) {
        console.error(`❌ ORDER: Failed to decrement stock for product ${item.product.id}:`, err);
        // We continue anyway so the order isn't lost, admin can fix stock manually
      }
    }

    await storage.clearCart(sessionId);

    // Generate Professional WhatsApp Invoice
    const adminPhoneRaw = adminSettings?.phone || process.env.ADMIN_PHONE || "249912345678";
    const sanitizedAdminPhone = adminPhoneRaw.replace(/[^0-9]/g, '');

    const paymentMethodText = method === "bank" ? "تحويل بنكي" : "الدفع عند الاستلام";
    const bankDetailsText = selectedBank
      ? `\n🏦 *بيانات التحويل:*\n   - البنك: ${selectedBank.bankName}\n   - الاسم: ${selectedBank.accountName}\n   - الحساب: ${selectedBank.accountNumber}\n`
      : "";

    const itemsText = itemsData.map((item, idx) =>
      `*${idx + 1}. ${item.name}${item.size ? ` (${item.size})` : ''}*\n   - الكمية: ${item.quantity}\n   - السعر: ${(item.price).toLocaleString()} ج.س`
    ).join('\n\n');

    const orderNumber = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000) + 1000}`;

    const rawMessage = `🟢 *الراقي للمنتجات الغذائية* 🟢\n` +
      `✨ *للتميز والفخامة* ✨\n\n` +
      `══════════════════\n` +
      `📄 *فاتورة طلب جديدة*\n` +
      `🔢 رقم الطلب: *${orderNumber}*\n` +
      `📅 التاريخ: ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}\n` +
      `══════════════════\n\n` +
      `👤 *بيانات العميل:*\n` +
      `   الاسم: *${name.trim()}*\n` +
      `   الهاتف: ${phone.trim()}\n` +
      `   العنوان: ${address.trim()}\n\n` +
      `💳 *طريقة الدفع:* ${paymentMethodText}${bankDetailsText}\n` +
      `══════════════════\n` +
      `📦 *المنتجات المطلوبة:*\n\n${itemsText}\n\n` +
      `══════════════════\n` +
      `💰 المجموع الفرعي: ${subtotal.toLocaleString()} ج.س\n` +
      `🚚 التوصيل: ${isFreeShipping ? "مجااااني 🎉" : `${shipping.toLocaleString()} ج.س`}\n` +
      `🌟 *الإجمالي النهائي: ${(subtotal + shipping).toLocaleString()} ج.س*\n` +
      `══════════════════\n\n` +
      `🙏 شكراً لتسوقكم معنا! سيتم التواصل معكم لتأكيد الطلب.\n` +
      getPublicBaseUrl();

    const whatsappUrl = `https://wa.me/${sanitizedAdminPhone}?text=${encodeURIComponent(rawMessage)}`;

    res.json({ ...order, whatsappUrl });
  });

  // Demo data — admin only (it can wipe the catalogue with ?force=true)
  app.post("/api/seed", requireAdmin, async (req: Request, res: Response) => {
    const force = req.query.force === "true";
    const productCount = await storage.countProducts();
    
    if (productCount > 0 && !force) {
      return res.json({ message: "البيانات موجودة بالفعل. استخدم ?force=true لإعادة التأسيس.", seeded: false });
    }

    if (force) {
      console.log("🔄 Force seeding: Clearing existing categories and products...");
      // We need to clear categories and products. 
      // This is a bit destructive so we only do it if the user specifically asked.
      const allCats = await storage.getCategories();
      for (const cat of allCats) {
        await storage.deleteCategory(cat.id);
      }
      const allProds = await storage.getProducts();
      for (const prod of allProds) {
        await storage.deleteProduct(prod.id);
      }
    }

    const catData = [
      { id: "spices", name: "التوابل والبهارات", icon: "/images/category-spices.png" },
      { id: "grains", name: "الحبوب والدقيق", icon: "/images/category-grains.png" },
      { id: "drinks", name: "المشروبات والكركديه", icon: "/images/category-drinks.png" },
      { id: "sweets", name: "التمور والحلويات", icon: "/images/category-sweets.png" },
      { id: "natural", name: "منتجات طبيعية", icon: "/images/category-natural.png" },
    ];

    for (const category of catData) {
      await storage.createCategory(category);
    }

    const productData: InsertProduct[] = [
      {
        name: "كركديه سوداني فاخر",
        nameEn: "Premium Sudanese Hibiscus",
        price: 4500,
        category: "drinks",
        image: "/images/product-hibiscus.png",
        rating: 4.8,
        reviews: 120,
        badge: "الأكثر مبيعًا",
        description: "كركديه سوداني فاخر مجفف بعناية من أفضل المزارع السودانية. يقدم ساخنًا أو باردًا بطعم رائع وفوائد صحية متعددة.",
        inStock: true,
      },
      {
        name: "صمغ عربي هشاب",
        nameEn: "Gum Arabic (Hashab)",
        price: 8000,
        category: "natural",
        image: "/images/product-gum.png",
        rating: 5,
        reviews: 85,
        badge: "عضوي",
        description: "صمغ عربي من نوع الهشاب الفاخر، يستخدم للأغراض الصحية والغذائية، وغني بالألياف الطبيعية.",
        inStock: true,
      },
      {
        name: "بهارات مشكلة",
        nameEn: "Special Mixed Spices",
        price: 3200,
        category: "spices",
        image: "/images/product-spices.png",
        rating: 4.9,
        reviews: 200,
        badge: null,
        description: "خلطة بهارات سودانية مشكلة من أجود الأنواع، مثالية للأطباق التقليدية والحديثة.",
        inStock: true,
      },
      {
        name: "دقيق ذرة",
        nameEn: "Corn Flour",
        price: 2100,
        category: "grains",
        image: "/images/category-grains.png",
        rating: 4.5,
        reviews: 45,
        badge: "جديد",
        description: "دقيق ذرة سوداني طبيعي لتحضير العصيدة والكسرة وغيرها من الأطباق السودانية التقليدية.",
        inStock: true,
      },
      {
        name: "بامية مجففة",
        nameEn: "Dried Okra",
        price: 1800,
        category: "spices",
        image: "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?q=80&w=1000&auto=format&fit=crop",
        rating: 4.7,
        reviews: 150,
        badge: null,
        description: "بامية مجففة ومطحونة بعناية، تستخدم في تحضير أشهر الأطباق السودانية.",
        inStock: true,
      },
      {
        name: "تمر قنديلة",
        nameEn: "Gondila Dates",
        price: 5500,
        category: "sweets",
        image: "/images/category-sweets.png",
        rating: 4.9,
        reviews: 310,
        badge: "موسمي",
        description: "تمر سوداني فاخر حلو المذاق وغني بالعناصر الغذائية.",
        inStock: true,
      },
    ];

    for (const product of productData) {
      await storage.createProduct(product);
    }

    res.json({ message: "تمت إضافة البيانات بنجاح", seeded: true });
  });



  return httpServer;
}
