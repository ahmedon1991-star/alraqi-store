import crypto from "node:crypto";
import type { Express, NextFunction, Request, Response } from "express";
import { type Server } from "http";
import { type Category, type InsertProduct, type InsertUser, type Order, type Product, type User, type InsertAdminSettings, type Bank, type InsertBank, insertMessageSchema, type Message, type InsertMessage } from "@shared/schema";
import { z } from "zod";
import { storage, getDbLastError } from "./storage";
import { sendPasswordResetEmail } from "./email";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "dist", "public", "uploads");
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`📁 Created upload directory at: ${uploadDir}`);
  }
} catch (err) {
  console.error(`❌ FAILED to create/access upload directory: ${err}`);
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: multerStorage });

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin12345";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";

// Admin sessions are now persisted in the database table 'sessions'

type GoogleTokenInfo = {
  sub?: string;
  email?: string;
  email_verified?: string;
  name?: string;
  picture?: string;
  aud?: string;
};

function createToken() {
  return crypto.randomBytes(24).toString("hex");
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) {
    return false;
  }

  const candidate = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(hash, "hex");
  if (candidate.length !== original.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidate, original);
}

function getSessionId(req: Request): string {
  const header = req.headers["x-session-id"];
  let sid = getSingleParam(header);
  if (!sid) {
    sid = Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
  return sid;
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

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = getAdminToken(req);
  if (!token) {
    return res.status(401).json({ message: "غير مصرح لك بالوصول إلى لوحة الإدارة" });
  }

  // Check if it's a persistent admin session in DB
  const session = await storage.getSession(token);
  // We use a convention for admin session userId: e.g. "admin-settings-id"
  if (!session || !session.userId.startsWith("admin-")) {
    return res.status(401).json({ message: "انتهت جلسة الإدارة، يرجى تسجيل الدخول مجدداً" });
  }

  next();
}

async function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const token = getCustomerToken(req);
  const session = token ? await storage.getSession(token) : undefined;
  if (!token || !session) {
    return res.status(401).json({ message: "يرجى تسجيل الدخول أولًا" });
  }

  const user = await storage.getUser(session.userId);
  if (!user) {
    if (token) await storage.deleteSession(token);
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
  // Update last active
  await storage.updateUserLastActive(user.id);
  return token;
}

async function verifyGoogleCredential(credential: string): Promise<GoogleTokenInfo> {
  const url = new URL("https://oauth2.googleapis.com/tokeninfo");
  url.searchParams.set("id_token", credential);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("تعذر التحقق من حساب Google");
  }

  return response.json() as Promise<GoogleTokenInfo>;
}

function normalizeProductPayload(body: Record<string, unknown>): Partial<InsertProduct> | null {
  const {
    name, nameEn, description, price, image, category,
    rating, reviews, badge, inStock, sizes, measurements
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
    image: typeof image === "string" && image.trim() ? image : null,
    category,
    rating: typeof rating === "number" ? rating : 0,
    reviews: typeof reviews === "number" ? reviews : 0,
    badge: typeof badge === "string" && badge.trim() ? badge : null,
    inStock: typeof inStock === "boolean" ? inStock : true,
    sizes: typeof sizes === "string" && sizes.trim() ? sizes : null,
    measurements: typeof measurements === "string" && measurements.trim() ? measurements : null,
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Diagnostic route for storage status
  app.get("/api/admin/debug-storage", async (_req, res) => {
    const isDatabase = storage.constructor.name === "DatabaseStorage";
    const hasEnv = !!process.env.DATABASE_URL;
    const lastError = getDbLastError();
    res.json({
      mode: isDatabase ? "DATABASE (PostgreSQL)" : "MEMORY (Local Map)",
      hasDatabaseUrl: hasEnv,
      lastError: lastError || null,
      message: isDatabase
        ? "بنجاح! السيرفر متصل بقاعدة البيانات PostgreSQL."
        : (hasEnv ? `يوجد رابط قاعدة بيانات ولكن السيرفر فشل في الاتصال. الخطأ: ${lastError || "غير معروف"}` : "لا يوجد رابط قاعدة بيانات في الإعدادات، السيرفر يعمل في الذاكرة المؤقتة.")
    });
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { name, email, password, phone } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
    };

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "الاسم والبريد الإلكتروني ورقم الهاتف وكلمة المرور مطلوبة" });
    }

    const normalizedEmail = email.trim().toLowerCase();
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

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ message: "البريد الإلكتروني وكلمة المرور مطلوبة" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Try customer login first
    const user = await storage.getUserByEmail(normalizedEmail);
    const settings = await storage.getAdminSettings();

    if (user && verifyPassword(password, user.password)) {
      // Check if this customer is also the admin
      const adminEmail = settings?.email?.trim().toLowerCase() || ADMIN_USERNAME;
      const adminUsername = settings?.username?.trim().toLowerCase() || ADMIN_USERNAME;

      if (normalizedEmail === adminEmail || user.username === adminUsername) {
        const token = createToken();
        await storage.createSession({ token, userId: `admin-${settings?.id || 1}` });
        return res.json({
          token,
          user: { ...sanitizeUser(user), isAdmin: true },
          isAdmin: true
        });
      }

      const token = await createCustomerSession(user);
      return res.json({
        token,
        user: sanitizeUser(user),
        isAdmin: false
      });
    }

    // 2. Try direct admin login (if not a customer or customer password didn't match)
    const storedEmail = settings?.email?.trim().toLowerCase() || ADMIN_USERNAME;
    const storedUsername = settings?.username?.trim().toLowerCase() || ADMIN_USERNAME;
    const storedPassword = settings?.password || ADMIN_PASSWORD;

    const emailMatch = normalizedEmail === storedEmail || normalizedEmail === storedUsername;

    let passwordMatch = false;
    if (storedPassword.includes(':')) {
      passwordMatch = verifyPassword(password, storedPassword);
    } else {
      passwordMatch = password === storedPassword;
    }

    // fallback to env vars if not authenticated yet
    if (!emailMatch || !passwordMatch) {
      if ((normalizedEmail === ADMIN_USERNAME || normalizedEmail === process.env.ADMIN_EMAIL) && password === ADMIN_PASSWORD) {
        passwordMatch = true;
      }
    }

    if (emailMatch && passwordMatch) {
      const token = createToken();
      await storage.createSession({ token, userId: `admin-${settings?.id || 1}` });
      return res.json({
        token,
        user: { username: storedUsername, isAdmin: true },
        isAdmin: true
      });
    }

    return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
  });

  app.post("/api/auth/google", async (req: Request, res: Response) => {
    const { credential } = req.body as { credential?: string };

    if (!GOOGLE_CLIENT_ID) {
      return res.status(503).json({ message: "تسجيل Google غير مفعل بعد" });
    }

    if (!credential) {
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

  app.patch("/api/auth/me", requireCustomer, async (req: Request, res: Response) => {
    const { name, phone, email, avatar } = req.body as Partial<User>;
    const userId = res.locals.customer.id;

    // Basic validation could be added here
    const updatedUser = await storage.updateUser(userId, {
      name: name || undefined,
      phone: phone || undefined,
      email: email || undefined,
      avatar: avatar || undefined,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    res.json({
      user: sanitizeUser(updatedUser),
    });
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };

    if (!email) {
      return res.status(400).json({ message: "البريد الإلكتروني مطلوب" });
    }

    const user = await storage.getUserByEmail(email.trim().toLowerCase());

    // For security, we usually return success even if user not found, 
    // but for debugging purposes we will check existence here.
    if (!user) {
      return res.status(404).json({ message: "لم يتم العثور على حساب بهذا البريد الإلكتروني" });
    }

    // Generate a reset token
    const resetToken = createToken();
    // In a real app, you would save this token to the database with an expiration time
    // and send it via email.

    const protocol = req.protocol;
    const host = req.get('host');
    const resetLink = `${protocol}://${host}/reset-password?token=${resetToken}&email=${user.email}`;

    // Attempt to send real email
    const emailSent = await sendPasswordResetEmail(user.email || email, resetLink, user.name || "مستخدم");

    if (emailSent) {
      console.log(`✅ Email sent to ${user.email}`);
    } else {
      console.log(`\n--- [Password Reset Request (Email Not Configured)] ---`);
      console.log(`User: ${user.name} (${user.email})`);
      console.log(`Token: ${resetToken}`);
      console.log(`Reset Link: ${resetLink}`);
      console.log(`---------------------------------\n`);
    }

    res.json({
      success: true,
      message: "تم إرسال تعليمات استعادة كلمة المرور إلى بريدك الإلكتروني (يرجى التحقق من الرسائل المهملة أيضاً)."
    });
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    const { email, token, password } = req.body as {
      email?: string;
      token?: string;
      password?: string;
    };

    if (!email || !token || !password) {
      return res.status(400).json({ message: "جميع الحقول مطلوبة" });
    }

    const user = await storage.getUserByEmail(email.trim().toLowerCase());
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    // In a real app, we would verify the token from the DB. 
    // Since this is mock/dev, we just check if it's there.
    const updatedUser = await storage.updateUser(user.id, {
      password: hashPassword(password)
    });

    if (!updatedUser) {
      return res.status(500).json({ message: "فشل تحديث كلمة المرور" });
    }

    res.json({ success: true, message: "تم تحديث كلمة المرور بنجاح" });
  });

  app.post("/api/auth/biometric/enable", requireCustomer, async (req: Request, res: Response) => {
    const user = res.locals.customer as User;
    const { token } = req.body as { token: string };

    if (!token) return res.status(400).json({ message: "الرمز مطلوب" });

    // Store a hash or the token directly for biometric login verification
    // Here we'll just enable the flag for simplicity in this version
    const updated = await storage.updateUser(user.id, {
      biometricEnabled: true,
      biometricToken: token, // This token identifies the device/enrolled state
    });

    res.json({ success: true, user: sanitizeUser(updated!) });
  });

  app.post("/api/auth/biometric/login", async (req: Request, res: Response) => {
    const { email, deviceToken } = req.body as { email: string; deviceToken: string };

    if (!email || !deviceToken) {
      return res.status(400).json({ message: "البريد والرمز مطلوبان" });
    }

    const user = await storage.getUserByEmail(email.trim().toLowerCase());
    if (!user || !user.biometricEnabled || user.biometricToken !== deviceToken) {
      return res.status(401).json({ message: "فشل التحقق من السمات الحيوية أو الحساب غير منشط." });
    }

    // In a real app, verify deviceToken against a stored key
    const token = await createCustomerSession(user);
    res.json({
      token,
      user: sanitizeUser(user),
    });
  });

  app.post("/api/admin/login", async (req: Request, res: Response) => {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      return res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبة" });
    }

    const settings = await storage.getAdminSettings();
    const storedUsername = settings?.username || ADMIN_USERNAME;
    const storedPassword = settings?.password || ADMIN_PASSWORD;

    // First try database settings (could be hashed or plaintext if default)
    let authenticated = false;

    // Check if it's the hashed password from DB
    if (username === storedUsername) {
      if (storedPassword.includes(':')) {
        // Assume hashed
        if (verifyPassword(password, storedPassword)) {
          authenticated = true;
        }
      } else {
        // Assume plaintext (default case)
        if (password === storedPassword) {
          authenticated = true;
        }
      }
    }

    // Fallback to environment variables
    if (!authenticated) {
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        authenticated = true;
      }
    }

    if (!authenticated) {
      return res.status(401).json({ message: "بيانات دخول الأدمن غير صحيحة" });
    }

    const token = createToken();
    // Persist admin session in DB with a special identifier
    await storage.createSession({ token, userId: `admin-${settings?.id || 1}` });

    res.json({
      token,
      user: {
        username: storedUsername,
      },
    });
  });

  app.get("/api/admin/settings", requireAdmin, async (_req: Request, res: Response) => {
    const settings = await storage.getAdminSettings();
    res.json(settings || { email: ADMIN_USERNAME, phone: "+249912345678", username: ADMIN_USERNAME });
  });

  app.post("/api/admin/upload", requireAdmin, upload.single("image"), (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: "يرجى اختيار ملف لرفعه" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
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
    const bank = await storage.createBank(req.body);
    res.json(bank);
  });

  app.delete("/api/admin/banks/:id", requireAdmin, async (req: Request, res: Response) => {
    await storage.deleteBank(getSingleParam(req.params.id));
    res.sendStatus(200);
  });

  app.post("/api/admin/settings", requireAdmin, async (req: Request, res: Response) => {
    const { email, phone, address, facebook, instagram, twitter } = req.body as {
      email?: string;
      phone?: string;
      address?: string;
      facebook?: string;
      instagram?: string;
      twitter?: string;
    };
    const settings = await storage.updateAdminSettings({
      email,
      phone,
      address,
      facebook,
      instagram,
      twitter
    });
    res.json(settings);
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

  app.delete("/api/admin/categories/:id", requireAdmin, async (req: Request, res: Response) => {
    await storage.deleteCategory(req.params.id as string);
    res.sendStatus(200);
  });

  app.post("/api/admin/security", requireAdmin, async (req: Request, res: Response) => {
    const { username, password, currentPassword } = req.body as {
      username?: string;
      password?: string;
      currentPassword?: string;
    };

    if (!currentPassword) {
      return res.status(400).json({ message: "كلمة المرور الحالية مطلوبة لتغيير البيانات" });
    }

    const settings = await storage.getAdminSettings();
    const storedUsername = settings?.username || ADMIN_USERNAME;
    const storedPassword = settings?.password || ADMIN_PASSWORD;

    // Verify current password
    let authenticated = false;
    if (storedPassword.includes(':')) {
      if (verifyPassword(currentPassword, storedPassword)) authenticated = true;
    } else {
      if (currentPassword === storedPassword) authenticated = true;
    }

    if (!authenticated) {
      return res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
    }

    const updateData: Partial<InsertAdminSettings> = {};
    if (username) updateData.username = username;
    if (password) {
      // Basic strength check
      if (password.length < 8) {
        return res.status(400).json({ message: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل" });
      }
      updateData.password = hashPassword(password);
    }

    const updated = await storage.updateAdminSettings(updateData);
    res.json({ message: "تم تحديث بيانات الأمان بنجاح" });
  });

  app.get("/api/admin/me", requireAdmin, async (_req: Request, res: Response) => {
    const settings = await storage.getAdminSettings();
    res.json({
      user: {
        username: settings?.email || ADMIN_USERNAME,
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

  app.get("/api/admin/overview", requireAdmin, async (_req: Request, res: Response) => {
    const [products, categories, allOrders] = await Promise.all([
      storage.getProducts(),
      storage.getCategories(),
      storage.getAllOrders(),
    ]);

    const sortedOrders = [...allOrders].sort((a: Order, b: Order) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    const revenue = allOrders.reduce((sum: number, order: Order) => sum + order.total, 0);
    const pendingOrders = allOrders.filter((order: Order) => order.status === "pending");
    const topCategories = categories.map((category: Category) => ({
      ...category,
      productCount: products.filter((product: Product) => product.category === category.id).length,
    }));

    res.json({
      stats: {
        products: products.length,
        categories: categories.length,
        orders: allOrders.length,
        pendingOrders: pendingOrders.length,
        revenue,
      },
      orders: sortedOrders,
      products,
      topCategories,
    });
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

  // Message routes
  app.get("/api/admin/messages", requireAdmin, async (_req: Request, res: Response) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  app.patch("/api/admin/messages/:id/read", requireAdmin, async (req: Request, res: Response) => {
    const id = getSingleParam(req.params.id);
    const updated = await storage.markMessageAsRead(id);
    if (!updated) return res.status(404).json({ message: "الرسالة غير موجودة" });
    res.json(updated);
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
      res.status(500).json({ message: "Internal Server Error" });
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

  app.post("/api/products/:id/rate", requireCustomer, async (req: Request, res: Response) => {
    const productId = getSingleParam(req.params.id);
    const { rating } = req.body as { rating?: number };

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "التقييم يجب أن يكون رقمًا بين 1 و 5" });
    }

    const updatedProduct = await storage.rateProduct(productId, rating);
    if (!updatedProduct) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }

    res.json(updatedProduct);
  });

  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string | undefined;
      const result = category ? await storage.getProductsByCategory(category) : await storage.getProducts();
      res.json(result);
    } catch (error) {
      console.error("❌ Database connection error fetching products:", error);
      // نُرجع مصفوفة فارغة مؤقتاً أو خطأ معالج لمنع انهيار الواجهة
      res.status(500).json({ message: "حدث خطأ أثناء جلب المنتجات. يرجى التأكد من اتصال قاعدة البيانات.", error: String(error) });
    }
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const product = await storage.getProductById(getSingleParam(req.params.id));
      if (!product) {
        return res.status(404).json({ message: "المنتج غير موجود" });
      }
      res.json(product);
    } catch (error) {
      console.error(`❌ Database connection error fetching product ${req.params.id}:`, error);
      res.status(500).json({ message: "تعذر جلب تفاصيل المنتج", error: String(error) });
    }
  });

  app.get("/api/categories", async (_req: Request, res: Response) => {
    try {
      const result = await storage.getCategories();
      res.json(result);
    } catch (error) {
      console.error("❌ Database connection error fetching categories:", error);
      res.status(500).json({ message: "تعذر جلب الأقسام", error: String(error) });
    }
  });

  app.get("/api/cart", async (req: Request, res: Response) => {
    const sessionId = getSessionId(req);
    const items = await storage.getCartItems(sessionId);
    const count = await storage.getCartCount(sessionId);
    res.json({ items, count, sessionId });
  });

  app.post("/api/cart", async (req: Request, res: Response) => {
    const sessionId = req.body.sessionId || getSessionId(req);
    const { productId, quantity } = req.body as { productId?: string; quantity?: number };

    if (!productId) {
      return res.status(400).json({ message: "معرف المنتج مطلوب" });
    }

    const item = await storage.addToCart({ sessionId, productId, quantity: quantity || 1 });
    const count = await storage.getCartCount(sessionId);
    res.json({ item, count, sessionId });
  });

  app.patch("/api/cart/:id", async (req: Request, res: Response) => {
    const { quantity } = req.body as { quantity?: number };

    if (typeof quantity !== "number" || quantity < 1) {
      return res.status(400).json({ message: "الكمية غير صحيحة" });
    }

    const item = await storage.updateCartItemQuantity(getSingleParam(req.params.id), quantity);
    if (!item) {
      return res.status(404).json({ message: "العنصر غير موجود" });
    }

    res.json(item);
  });

  app.delete("/api/cart/:id", async (req: Request, res: Response) => {
    await storage.removeFromCart(getSingleParam(req.params.id));
    res.json({ success: true });
  });

  app.get("/api/cart/count", async (req: Request, res: Response) => {
    const sessionId = getSessionId(req);
    const count = await storage.getCartCount(sessionId);
    res.json({ count });
  });

  app.get("/api/orders/me", requireCustomer, async (req: Request, res: Response) => {
    const userId = res.locals.customer.id;
    // For now we get by sessionId but try to filter by userId if DB supports
    // In MemoryStorage we might not have a getOrdersByUserId yet. Let's use getOrders then filter
    // If we have a sessionId stored in cookie we should use it too.
    const allOrders = await storage.getAllOrders();
    const userOrders = allOrders.filter(o => o.userId === userId || o.sessionId === getSessionId(req));
    // Sort newest first
    const sortedOrders = userOrders.sort((a, b) => {
      return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
    });
    res.json(sortedOrders);
  });

  app.post("/api/orders", async (req: Request, res: Response) => {
    const { sessionId: bodySessionId, name, phone, address, paymentMethod, bankId } = req.body as {
      sessionId?: string;
      name?: string;
      phone?: string;
      address?: string;
      paymentMethod?: string;
      bankId?: string;
    };

    const sessionId = bodySessionId || getSessionId(req);
    const token = getCustomerToken(req);
    const dbSession = token ? await storage.getSession(token) : undefined;
    const userId = dbSession?.userId;

    if (!sessionId || !name || !phone || !address) {
      return res.status(400).json({ message: "جميع الحقول مطلوبة" });
    }

    // Server-side validation for "Real" data
    if (name.trim().length < 3) {
      return res.status(400).json({ message: "يرجى إدخال اسم حقيقي (3 أحرف على الأقل)" });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9) {
      return res.status(400).json({ message: "يرجى إدخال رقم هاتف صحيح (9 أرقام على الأقل)" });
    }

    if (address.trim().length < 5) {
      return res.status(400).json({ message: "يرجى إدخال عنوان واضح بالتفصيل" });
    }

    const currentCartItems = await storage.getCartItems(sessionId);
    if (currentCartItems.length === 0) {
      return res.status(400).json({ message: "السلة فارغة" });
    }

    const total = currentCartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const shipping = 1500;
    const itemsData = currentCartItems.map(item => ({
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      size: (item as any).size || null
    }));

    const order = await storage.createOrder({
      sessionId,
      userId,
      total: total + shipping,
      status: "pending",
      name,
      phone,
      address,
      items: JSON.stringify(itemsData),
      paymentMethod: paymentMethod || "cod",
      bankId: bankId || null,
    });

    await storage.clearCart(sessionId);

    // Generate Professional WhatsApp Invoice
    const adminSettings = await storage.getAdminSettings();
    const adminPhoneRaw = adminSettings?.phone || process.env.ADMIN_PHONE || "249912345678";
    const sanitizedAdminPhone = adminPhoneRaw.replace(/[^0-9]/g, '');

    const paymentMethodText = paymentMethod === "bank" ? "تحويل بنكي" : "الدفع عند الاستلام";
    let bankDetailsText = "";
    if (paymentMethod === "bank" && bankId) {
      const allBanks = await storage.getBanks();
      const selectedBank = allBanks.find(b => b.id === bankId);
      if (selectedBank) {
        bankDetailsText = `%0A🏦 *بيانات التحويل:*%0A   - البنك: ${selectedBank.bankName}%0A   - الاسم: ${selectedBank.accountName}%0A   - الحساب: ${selectedBank.accountNumber}%0A`;
      }
    }

    const itemsText = itemsData.map((item, idx) =>
      `*${idx + 1}. ${item.name}*%0A   - الكمية: ${item.quantity}%0A   - السعر: ${(item.price).toLocaleString()} ج.س`
    ).join('%0A%0A');

    const orderNumber = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000) + 1000}`;

    const message = `🌿 *الراقي للمنتجات السودانية*%0A🔖 *للتميز والفخامة*%0A%0A` +
      `━━━━━━━━━━━━━━━━━━%0A` +
      `📋 *فاتورة طلب جديدة*%0A` +
      `🔢 رقم الطلب: *${orderNumber}*%0A` +
      `📅 التاريخ: ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}%0A` +
      `━━━━━━━━━━━━━━━━━━%0A%0A` +
      `👤 *بيانات العميل:*%0A` +
      `   الاسم: *${name}*%0A` +
      `   الهاتف: ${phone}%0A` +
      `   العنوان: ${address}%0A%0A` +
      `💳 *طريقة الدفع:* ${paymentMethodText}${bankDetailsText}%0A` +
      `━━━━━━━━━━━━━━━━━━%0A` +
      `📦 *المنتجات المطلوبة:*%0A%0A${itemsText}%0A%0A` +
      `━━━━━━━━━━━━━━━━━━%0A` +
      `💰 المجموع: ${total.toLocaleString()} ج.س%0A` +
      `🚚 التوصيل: ${shipping.toLocaleString()} ج.س%0A` +
      `⭐ *الإجمالي النهائي: ${(total + shipping).toLocaleString()} ج.س*%0A` +
      `━━━━━━━━━━━━━━━━━━%0A%0A` +
      `🙏 شكراً لتسوقكم معنا! سيتم التواصل معكم لتأكيد الطلب.%0A` +
      `www.alraqi-store.com`;

    const whatsappUrl = `https://wa.me/${sanitizedAdminPhone}?text=${message}`;

    res.json({ ...order, whatsappUrl });
  });

  app.post("/api/seed", async (_req: Request, res: Response) => {
    const existingProducts = await storage.getProducts();
    if (existingProducts.length > 0) {
      return res.json({ message: "البيانات موجودة بالفعل", seeded: false });
    }

    const catData = [
      { id: "spices", name: "التوابل والبهارات", icon: "🌶️" },
      { id: "grains", name: "الحبوب والدقيق", icon: "🌾" },
      { id: "drinks", name: "المشروبات والكركديه", icon: "🥤" },
      { id: "sweets", name: "التمور والحلويات", icon: "🍬" },
      { id: "natural", name: "منتجات طبيعية", icon: "🌿" },
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
        image: "https://images.unsplash.com/photo-1555529324-448e898399e5?q=80&w=1000&auto=format&fit=crop",
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
        image: "https://images.unsplash.com/photo-1610450949065-2f2268393530?q=80&w=1000&auto=format&fit=crop",
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
        image: "https://images.unsplash.com/photo-1506368249639-73a05d6f6488?q=80&w=1000&auto=format&fit=crop",
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
        image: "https://images.unsplash.com/photo-1620916297397-a4a5402a3c6c?q=80&w=1000&auto=format&fit=crop",
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
        image: "https://images.unsplash.com/photo-1549487561-125026e6327c?q=80&w=1000&auto=format&fit=crop",
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
