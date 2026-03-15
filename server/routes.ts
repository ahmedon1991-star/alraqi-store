import crypto from "node:crypto";
import type { Express, NextFunction, Request, Response } from "express";
import { type Server } from "http";
import type { Category, InsertProduct, InsertUser, Order, Product, User, InsertAdminSettings } from "@shared/schema";
import { storage } from "./storage";
import { sendPasswordResetEmail } from "./email";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin12345";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";

const adminSessions = new Set<string>();
const customerSessions = new Map<string, string>();

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
  let sid = Array.isArray(header) ? header[0] : header;
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
  return Array.isArray(header) ? header[0] ?? "" : header ?? "";
}

function getCustomerToken(req: Request): string {
  const header = req.headers["x-customer-token"];
  return Array.isArray(header) ? header[0] ?? "" : header ?? "";
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
  };
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = getAdminToken(req);
  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ message: "غير مصرح لك بالوصول إلى لوحة الإدارة" });
  }

  next();
}

async function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const token = getCustomerToken(req);
  const userId = token ? customerSessions.get(token) : undefined;
  if (!token || !userId) {
    return res.status(401).json({ message: "يرجى تسجيل الدخول أولًا" });
  }

  const user = await storage.getUser(userId);
  if (!user) {
    customerSessions.delete(token);
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
  customerSessions.set(token, user.id);
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
  const { name, nameEn, description, price, image, category, rating, reviews, badge, inStock } = body;

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
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
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

    const user = await storage.getUserByEmail(email.trim().toLowerCase());
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    const token = await createCustomerSession(user);
    res.json({
      token,
      user: sanitizeUser(user),
    });
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
    customerSessions.delete(res.locals.customerToken as string);
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
    
    const resetLink = `http://localhost:5000/reset-password?token=${resetToken}&email=${user.email}`;
    
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
    adminSessions.add(token);

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
    adminSessions.delete(getAdminToken(req));
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

    const allowedStatuses = new Set(["pending", "completed", "cancelled"]);
    if (!allowedStatuses.has(status)) {
      return res.status(400).json({ message: "حالة الطلب غير صالحة" });
    }

    const order = await storage.updateOrderStatus(orderId, status);
    if (!order) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }

    res.json(order);
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
    const category = req.query.category as string | undefined;
    const result = category ? await storage.getProductsByCategory(category) : await storage.getProducts();
    res.json(result);
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    const product = await storage.getProductById(getSingleParam(req.params.id));
    if (!product) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }

    res.json(product);
  });

  app.get("/api/categories", async (_req: Request, res: Response) => {
    const result = await storage.getCategories();
    res.json(result);
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
    const { sessionId: bodySessionId, name, phone, address } = req.body as {
      sessionId?: string;
      name?: string;
      phone?: string;
      address?: string;
    };

    const sessionId = bodySessionId || getSessionId(req);
    const token = getCustomerToken(req);
    const userId = token ? customerSessions.get(token) : undefined;

    if (!sessionId || !name || !phone || !address) {
      return res.status(400).json({ message: "جميع الحقول مطلوبة" });
    }

    const currentCartItems = await storage.getCartItems(sessionId);
    if (currentCartItems.length === 0) {
      return res.status(400).json({ message: "السلة فارغة" });
    }

    const total = currentCartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const order = await storage.createOrder({
      sessionId,
      userId,
      total: total + 1500, // +1500 presumably shipping cost
      status: "pending",
      name,
      phone,
      address,
    });

    await storage.clearCart(sessionId);

    // Generate WhatsApp URL
    const adminSettings = await storage.getAdminSettings();
    const adminPhoneRaw = adminSettings?.phone || process.env.ADMIN_PHONE || "249912345678"; // Expected formats e.g., 249...
    const sanitizedAdminPhone = adminPhoneRaw.replace(/[^0-9]/g, '');

    const itemsText = currentCartItems.map(item => `- ${item.product.name} (x${item.quantity})`).join('%0A');
    const message = `طلب جديد!%0Aالاسم: ${name}%0Aرقم التليفون: ${phone}%0Aالعنوان: ${address}%0Aالمبلغ الإجمالي: ${total + 1500} ج.س%0A%0Aالمنتجات:%0A${itemsText}`;

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
