import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

function getSessionId(req: Request): string {
  let sid = req.headers["x-session-id"] as string;
  if (!sid) {
    sid = Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
  return sid;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ===== Products =====
  app.get("/api/products", async (_req: Request, res: Response) => {
    const category = _req.query.category as string | undefined;
    let result;
    if (category) {
      result = await storage.getProductsByCategory(category);
    } else {
      result = await storage.getProducts();
    }
    res.json(result);
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    const product = await storage.getProductById(req.params.id);
    if (!product) return res.status(404).json({ message: "المنتج غير موجود" });
    res.json(product);
  });

  // ===== Categories =====
  app.get("/api/categories", async (_req: Request, res: Response) => {
    const result = await storage.getCategories();
    res.json(result);
  });

  // ===== Cart =====
  app.get("/api/cart", async (req: Request, res: Response) => {
    const sessionId = getSessionId(req);
    const items = await storage.getCartItems(sessionId);
    const count = await storage.getCartCount(sessionId);
    res.json({ items, count, sessionId });
  });

  app.post("/api/cart", async (req: Request, res: Response) => {
    const sessionId = req.body.sessionId || getSessionId(req);
    const { productId, quantity } = req.body;
    if (!productId) return res.status(400).json({ message: "productId مطلوب" });
    const item = await storage.addToCart({ sessionId, productId, quantity: quantity || 1 });
    const count = await storage.getCartCount(sessionId);
    res.json({ item, count, sessionId });
  });

  app.patch("/api/cart/:id", async (req: Request, res: Response) => {
    const { quantity } = req.body;
    if (typeof quantity !== "number" || quantity < 1) {
      return res.status(400).json({ message: "الكمية غير صحيحة" });
    }
    const item = await storage.updateCartItemQuantity(req.params.id, quantity);
    if (!item) return res.status(404).json({ message: "العنصر غير موجود" });
    res.json(item);
  });

  app.delete("/api/cart/:id", async (req: Request, res: Response) => {
    await storage.removeFromCart(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/cart/count", async (req: Request, res: Response) => {
    const sessionId = getSessionId(req);
    const count = await storage.getCartCount(sessionId);
    res.json({ count });
  });

  // ===== Orders =====
  app.post("/api/orders", async (req: Request, res: Response) => {
    const { sessionId, name, phone, address } = req.body;
    if (!sessionId || !name || !phone || !address) {
      return res.status(400).json({ message: "جميع الحقول مطلوبة" });
    }
    const cartItems = await storage.getCartItems(sessionId);
    if (cartItems.length === 0) {
      return res.status(400).json({ message: "السلة فارغة" });
    }
    const total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const order = await storage.createOrder({
      sessionId,
      total: total + 1500,
      status: "pending",
      name,
      phone,
      address,
    });
    await storage.clearCart(sessionId);
    res.json(order);
  });

  // ===== Seed Data =====
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
    for (const c of catData) {
      await storage.createCategory(c);
    }

    const productData = [
      { name: "كركديه سوداني فاخر", nameEn: "Premium Sudanese Hibiscus", price: 4500, category: "drinks", image: "https://images.unsplash.com/photo-1564858826723-57c2a74c2d61?q=80&w=1000&auto=format&fit=crop", rating: 4.8, reviews: 120, badge: "الأكثر مبيعاً", description: "كركديه سوداني فاخر مجفف بعناية من أفضل المزارع السودانية. يُقدم ساخنًا أو باردًا بطعم رائع وفوائد صحية عديدة.", inStock: true },
      { name: "صمغ عربي هشاب", nameEn: "Gum Arabic (Hashab)", price: 8000, category: "natural", image: "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?q=80&w=1000&auto=format&fit=crop", rating: 5.0, reviews: 85, badge: "عضوي", description: "صمغ عربي من نوع الهشاب الفاخر، يُستخدم للأغراض الصحية والغذائية. غني بالألياف الطبيعية.", inStock: true },
      { name: "بهارات مشكلة (سبيشيال)", nameEn: "Special Mixed Spices", price: 3200, category: "spices", image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=1000&auto=format&fit=crop", rating: 4.9, reviews: 200, badge: null, description: "خلطة بهارات سودانية مشكلة من أجود أنواع التوابل. مثالية للأطباق التقليدية والحديثة.", inStock: true },
      { name: "دقيق ذرة (طحين)", nameEn: "Corn Flour", price: 2100, category: "grains", image: "https://images.unsplash.com/photo-1620916297397-a4a5402a3c6c?q=80&w=1000&auto=format&fit=crop", rating: 4.5, reviews: 45, badge: "جديد", description: "دقيق ذرة سوداني طبيعي لتحضير العصيدة والكسرة وغيرها من الأطباق السودانية التقليدية.", inStock: true },
      { name: "بامية مجففة (ويكة)", nameEn: "Dried Okra (Weka)", price: 1800, category: "spices", image: "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?q=80&w=1000&auto=format&fit=crop", rating: 4.7, reviews: 150, badge: null, description: "بامية مجففة ومطحونة بعناية، تُستخدم في تحضير أشهر الأطباق السودانية مثل الملاح.", inStock: true },
      { name: "تمر قنديلة", nameEn: "Gondila Dates", price: 5500, category: "sweets", image: "https://images.unsplash.com/photo-1549487561-125026e6327c?q=80&w=1000&auto=format&fit=crop", rating: 4.9, reviews: 310, badge: "موسمي", description: "تمر قنديلة السوداني الفاخر، حلو المذاق وغني بالعناصر الغذائية. من أفضل أنواع التمور.", inStock: true },
      { name: "شطة سودانية حارة", nameEn: "Sudanese Hot Chili", price: 1500, category: "spices", image: "https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?q=80&w=1000&auto=format&fit=crop", rating: 4.6, reviews: 90, badge: null, description: "شطة سودانية أصلية بدرجات حرارة مختلفة. تضيف نكهة مميزة لكل أطباقك.", inStock: true },
      { name: "دكوة (خلطة القهوة)", nameEn: "Dakwa Coffee Mix", price: 3800, category: "drinks", image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1000&auto=format&fit=crop", rating: 4.8, reviews: 175, badge: "مميز", description: "خلطة القهوة السودانية التقليدية مع التوابل العطرية. تجربة قهوة لا مثيل لها.", inStock: true },
    ];
    for (const p of productData) {
      await storage.createProduct(p);
    }

    res.json({ message: "تم إضافة البيانات بنجاح", seeded: true });
  });

  return httpServer;
}
