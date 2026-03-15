import crypto from "node:crypto";
import {
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
  type Category,
  type InsertCategory,
  type CartItem,
  type InsertCartItem,
  type Order,
  type InsertOrder,
  users,
  products,
  categories,
  cartItems,
  orders,
  adminSettings,
  type AdminSettings,
  type InsertAdminSettings,
} from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

type CartItemWithProduct = CartItem & { product: Product };

function createId() {
  return crypto.randomUUID();
}

function createDatabase() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  return drizzle(pool);
}

const db = createDatabase();

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;

  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getProductsByCategory(category: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<Product | undefined>;
  rateProduct(id: string, rating: number): Promise<Product | undefined>;

  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  getCartItems(sessionId: string): Promise<CartItemWithProduct[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: string): Promise<void>;
  clearCart(sessionId: string): Promise<void>;
  getCartCount(sessionId: string): Promise<number>;

  createOrder(order: InsertOrder): Promise<Order>;
  getOrders(sessionId: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;

  getAdminSettings(): Promise<AdminSettings | undefined>;
  updateAdminSettings(settings: Partial<InsertAdminSettings>): Promise<AdminSettings>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    if (!db) {
      return undefined;
    }

    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) {
      return undefined;
    }

    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!db) {
      return undefined;
    }

    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    if (!db) {
      return undefined;
    }

    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!db) {
      throw new Error("Database is not configured");
    }

    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    if (!db) {
      return undefined;
    }

    const [updated] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updated;
  }

  async getProducts(): Promise<Product[]> {
    if (!db) {
      return [];
    }

    return db.select().from(products);
  }

  async getProductById(id: string): Promise<Product | undefined> {
    if (!db) {
      return undefined;
    }

    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    if (!db) {
      return [];
    }

    return db.select().from(products).where(eq(products.category, category));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    if (!db) {
      throw new Error("Database is not configured");
    }

    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    if (!db) {
      return undefined;
    }

    const [updated] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: string): Promise<Product | undefined> {
    if (!db) {
      return undefined;
    }

    const [deleted] = await db.delete(products).where(eq(products.id, id)).returning();
    return deleted;
  }

  async rateProduct(id: string, rating: number): Promise<Product | undefined> {
    if (!db) return undefined;

    const product = await this.getProductById(id);
    if (!product) return undefined;

    const currentRating = Number(product.rating) || 0;
    const currentReviews = Number(product.reviews) || 0;

    const newReviews = currentReviews + 1;
    // Calculate new average
    const newRating = ((currentRating * currentReviews) + rating) / newReviews;
    const roundedRating = Math.round(newRating * 10) / 10; // Keep 1 decimal

    const [updated] = await db.update(products).set({ rating: roundedRating, reviews: newReviews }).where(eq(products.id, id)).returning();
    return updated;
  }

  async getCategories(): Promise<Category[]> {
    if (!db) {
      return [];
    }

    return db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    if (!db) {
      throw new Error("Database is not configured");
    }

    const [created] = await db.insert(categories).values(category).returning();
    return created;
  }
  async deleteCategory(id: string): Promise<void> {
    if (!db) {
      return;
    }

    await db.delete(categories).where(eq(categories.id, id));
  }

  async getCartItems(sessionId: string): Promise<CartItemWithProduct[]> {
    if (!db) {
      return [];
    }

    const items = await db.select().from(cartItems).where(eq(cartItems.sessionId, sessionId));
    const result: CartItemWithProduct[] = [];

    for (const item of items) {
      const [product] = await db.select().from(products).where(eq(products.id, item.productId));
      if (product) {
        result.push({ ...item, product });
      }
    }

    return result;
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    if (!db) {
      throw new Error("Database is not configured");
    }

    const existing = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.sessionId, item.sessionId), eq(cartItems.productId, item.productId)));

    if (existing.length > 0) {
      const [updated] = await db
        .update(cartItems)
        .set({ quantity: existing[0].quantity + (item.quantity || 1) })
        .where(eq(cartItems.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(cartItems).values(item).returning();
    return created;
  }

  async updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined> {
    if (!db) {
      return undefined;
    }

    const [updated] = await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id)).returning();
    return updated;
  }

  async removeFromCart(id: string): Promise<void> {
    if (!db) {
      return;
    }

    await db.delete(cartItems).where(eq(cartItems.id, id));
  }

  async clearCart(sessionId: string): Promise<void> {
    if (!db) {
      return;
    }

    await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
  }

  async getCartCount(sessionId: string): Promise<number> {
    if (!db) {
      return 0;
    }

    const items = await db.select().from(cartItems).where(eq(cartItems.sessionId, sessionId));
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    if (!db) {
      throw new Error("Database is not configured");
    }

    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }

  async getOrders(sessionId: string): Promise<Order[]> {
    if (!db) {
      return [];
    }

    return db.select().from(orders).where(eq(orders.sessionId, sessionId));
  }

  async getAllOrders(): Promise<Order[]> {
    if (!db) {
      return [];
    }

    return db.select().from(orders);
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    if (!db) {
      return undefined;
    }

    const [updated] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return updated;
  }

  async getAdminSettings(): Promise<AdminSettings | undefined> {
    if (!db) return undefined;
    const [settings] = await db.select().from(adminSettings).where(eq(adminSettings.id, 1));
    if (!settings) {
      const [created] = await db.insert(adminSettings).values({ id: 1 }).returning();
      return created;
    }
    return settings;
  }

  async updateAdminSettings(settings: Partial<InsertAdminSettings>): Promise<AdminSettings> {
    if (!db) throw new Error("Database is not configured");
    const existing = await this.getAdminSettings();
    if (existing) {
      const [updated] = await db.update(adminSettings).set(settings).where(eq(adminSettings.id, 1)).returning();
      return updated;
    } else {
      const [created] = await db.insert(adminSettings).values({ id: 1, ...settings }).returning();
      return created;
    }
  }
}

export class MemoryStorage implements IStorage {
  private users = new Map<string, User>();
  private products = new Map<string, Product>();
  private categories = new Map<string, Category>();
  private cartItems = new Map<string, CartItem>();
  private orders = new Map<string, Order>();
  private adminSettings: AdminSettings | null = null;

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.googleId === googleId);
  }

  async createUser(user: InsertUser): Promise<User> {
    const created: User = {
      id: createId(),
      username: user.username,
      password: user.password,
      name: user.name ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      googleId: user.googleId ?? null,
      avatar: user.avatar ?? null,
      authProvider: user.authProvider ?? "local",
    };
    this.users.set(created.id, created);
    return created;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: User = {
      ...existing,
      ...user,
      name: user.name ?? existing.name,
      email: user.email ?? existing.email,
      phone: user.phone ?? existing.phone,
      googleId: user.googleId ?? existing.googleId,
      avatar: user.avatar ?? existing.avatar,
      authProvider: user.authProvider ?? existing.authProvider,
      password: user.password ?? existing.password,
      username: user.username ?? existing.username,
    };
    this.users.set(id, updated);
    return updated;
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter((product) => product.category === category);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const created: Product = {
      id: createId(),
      name: product.name,
      nameEn: product.nameEn ?? null,
      description: product.description ?? null,
      price: product.price,
      image: product.image ?? null,
      category: product.category,
      rating: product.rating ?? 0,
      reviews: product.reviews ?? 0,
      badge: product.badge ?? null,
      inStock: product.inStock ?? true,
    };
    this.products.set(created.id, created);
    return created;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const existing = this.products.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: Product = {
      ...existing,
      ...product,
      nameEn: product.nameEn ?? existing.nameEn,
      description: product.description ?? existing.description,
      image: product.image ?? existing.image,
      badge: product.badge ?? existing.badge,
      inStock: product.inStock ?? existing.inStock,
      rating: product.rating ?? existing.rating,
      reviews: product.reviews ?? existing.reviews,
    };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: string): Promise<Product | undefined> {
    const existing = this.products.get(id);
    if (!existing) {
      return undefined;
    }

    this.products.delete(id);
    for (const [cartId, cartItem] of Array.from(this.cartItems.entries())) {
      if (cartItem.productId === id) {
        this.cartItems.delete(cartId);
      }
    }
    return existing;
  }

  async rateProduct(id: string, rating: number): Promise<Product | undefined> {
    const existing = this.products.get(id);
    if (!existing) return undefined;

    const currentRating = Number(existing.rating) || 0;
    const currentReviews = Number(existing.reviews) || 0;
    const newReviews = currentReviews + 1;
    const newRating = ((currentRating * currentReviews) + rating) / newReviews;
    const roundedRating = Math.round(newRating * 10) / 10;

    const updated = { ...existing, rating: roundedRating, reviews: newReviews };
    this.products.set(id, updated);
    return updated;
  }

  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const created: Category = {
      id: category.id,
      name: category.name,
      icon: category.icon ?? null,
    };
    this.categories.set(created.id, created);
    return created;
  }
  async deleteCategory(id: string): Promise<void> {
    this.categories.delete(id);
  }

  async getCartItems(sessionId: string): Promise<CartItemWithProduct[]> {
    return Array.from(this.cartItems.values())
      .filter((item) => item.sessionId === sessionId)
      .map((item) => {
        const product = this.products.get(item.productId);
        return product ? { ...item, product } : null;
      })
      .filter((item): item is CartItemWithProduct => item !== null);
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    const existing = Array.from(this.cartItems.values()).find(
      (cartItem) => cartItem.sessionId === item.sessionId && cartItem.productId === item.productId,
    );

    if (existing) {
      const updated: CartItem = {
        ...existing,
        quantity: existing.quantity + (item.quantity || 1),
      };
      this.cartItems.set(updated.id, updated);
      return updated;
    }

    const created: CartItem = {
      id: createId(),
      sessionId: item.sessionId,
      productId: item.productId,
      quantity: item.quantity || 1,
    };
    this.cartItems.set(created.id, created);
    return created;
  }

  async updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined> {
    const existing = this.cartItems.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: CartItem = { ...existing, quantity };
    this.cartItems.set(id, updated);
    return updated;
  }

  async removeFromCart(id: string): Promise<void> {
    this.cartItems.delete(id);
  }

  async clearCart(sessionId: string): Promise<void> {
    for (const [id, item] of Array.from(this.cartItems.entries())) {
      if (item.sessionId === sessionId) {
        this.cartItems.delete(id);
      }
    }
  }

  async getCartCount(sessionId: string): Promise<number> {
    return Array.from(this.cartItems.values())
      .filter((item) => item.sessionId === sessionId)
      .reduce((sum, item) => sum + item.quantity, 0);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const created: Order = {
      id: createId(),
      sessionId: order.sessionId,
      userId: order.userId ?? null,
      total: order.total,
      status: order.status ?? "pending",
      name: order.name ?? null,
      phone: order.phone ?? null,
      address: order.address ?? null,
      createdAt: new Date(),
    };
    this.orders.set(created.id, created);
    return created;
  }

  async getOrders(sessionId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((order) => order.sessionId === sessionId);
  }

  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const existing = this.orders.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: Order = { ...existing, status };
    this.orders.set(id, updated);
    return updated;
  }

  async getAdminSettings(): Promise<AdminSettings | undefined> {
    if (!this.adminSettings) {
      this.adminSettings = {
        id: 1,
        email: "admin@example.com",
        phone: "+249912345678",
        username: process.env.ADMIN_USERNAME || "admin",
        password: process.env.ADMIN_PASSWORD || "admin12345",
        address: "الخرطوم، السودان - شارع النيل",
        facebook: "https://facebook.com",
        instagram: "https://instagram.com",
        twitter: "https://twitter.com",
        passwordToken: null,
      };
    }
    return this.adminSettings;
  }

  async updateAdminSettings(settings: Partial<InsertAdminSettings>): Promise<AdminSettings> {
    const current = await this.getAdminSettings();
    const updated = { ...current, ...settings } as AdminSettings;
    this.adminSettings = updated;
    return updated;
  }
}

export const storage: IStorage = db ? new DatabaseStorage() : new MemoryStorage();
