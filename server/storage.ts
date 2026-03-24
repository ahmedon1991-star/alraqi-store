import crypto from "node:crypto";
import dotenv from "dotenv";
dotenv.config();

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
  type Bank,
  type InsertBank,
  banks,
  sessions,
  type Session,
  type InsertSession,
  messages,
  type Message,
  type InsertMessage,
} from "@shared/schema";
import { and, eq, sql, asc, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

type CartItemWithProduct = CartItem & { product: Product };

function createId() {
  return crypto.randomUUID();
}

let dbLastError: string | null = null;
export function getDbLastError() { return dbLastError; }

function createDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log("⚠️  STORAGE: No DATABASE_URL found in environment variables.");
    console.log("⚠️  STORAGE: Falling back to MemoryStorage. DATA WILL NOT BE PERSISTENT.");
    return null;
  }
  
  try {
    console.log("🚀 STORAGE: DATABASE_URL detected. Initializing PostgreSQL pool...");
    const pool = new pg.Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20, // Limit connections to prevent exhaustion on Render
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    
    // Log errors on idle client
    pool.on('error', (err) => {
      console.error('❌ STORAGE: Unexpected error on idle database client', err);
      dbLastError = err.message;
    });

    // Async connection test
    pool.query("SELECT 1").then(() => {
      console.log("✅ STORAGE: Database connection test OK.");
      dbLastError = null;
    }).catch((err) => {
      console.error("❌ STORAGE: Async connection test failed:", err);
      dbLastError = err.message;
    });

    console.log("✅ STORAGE: Drizzle initialized with PostgreSQL.");
    return drizzle(pool);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ STORAGE: Failed to connect to database:", msg);
    console.log("⚠️  STORAGE: Falling back to MemoryStorage due to connection error.");
    dbLastError = msg;
    return null;
  }
}

export const db = createDatabase();
console.log(`📡 STORAGE MODE: ${db ? "DATABASE (PostgreSQL)" : "MEMORY (Local Map)"}`);


export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  updateUserLastActive(id: string): Promise<void>;

  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getProductsByCategory(category: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<Product | undefined>;
  rateProduct(id: string, rating: number): Promise<Product | undefined>;
  reorderProducts(ids: string[]): Promise<void>;
  decrementProductStock(id: string, quantity: number): Promise<void>;

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
  getOrderById(id: string): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  incrementProductStock(id: string, quantity: number): Promise<void>;

  getAdminSettings(): Promise<AdminSettings | undefined>;
  updateAdminSettings(settings: Partial<InsertAdminSettings>): Promise<AdminSettings>;
  resetRevenue(): Promise<void>;

  getBanks(): Promise<Bank[]>;
  createBank(bank: InsertBank): Promise<Bank>;
  deleteBank(id: string): Promise<void>;

  createSession(session: InsertSession): Promise<Session>;
  getSession(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<void>;

  getMessageCountInLast24Hours(userId: string): Promise<number>;
  getMessages(): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: string): Promise<Message | undefined>;
  archiveMessage(id: string): Promise<Message | undefined>;
  archiveOrder(id: string): Promise<Order | undefined>;
}

export class DatabaseStorage implements IStorage {
  public readonly mode = "DATABASE";
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

  async getUsers(): Promise<User[]> {
    if (!db) return [];
    return db.select().from(users);
  }

  async updateUserLastActive(id: string): Promise<void> {
    if (!db) return;
    await db.update(users).set({ lastActive: new Date() }).where(eq(users.id, id));
  }

  async getProducts(): Promise<Product[]> {
    if (!db) {
      return [];
    }

    return db.select().from(products).orderBy(asc(products.sortOrder));
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

    return db.select().from(products).where(eq(products.category, category)).orderBy(asc(products.sortOrder));
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

  async reorderProducts(ids: string[]): Promise<void> {
    if (!db) return;
    for (let i = 0; i < ids.length; i++) {
      await db.update(products).set({ sortOrder: i }).where(eq(products.id, ids[i]));
    }
  }

  async decrementProductStock(id: string, dx: number): Promise<void> {
    if (!db) return;
    const product = await this.getProductById(id);
    if (!product) return;
    
    const newStock = Math.max(0, (product.stock || 0) - dx);
    console.log(`📦 DB_STORAGE: Decrementing stock for "${product.name}" (${id}): ${product.stock} -> ${newStock}`);
    await db.update(products)
      .set({ 
        stock: newStock,
        inStock: newStock > 0 
      })
      .where(eq(products.id, id));
    console.log(`✅ DB_STORAGE: Stock updated for "${product.name}"`);
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

    const existingItems = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.sessionId, item.sessionId), eq(cartItems.productId, item.productId)));
      
    // Find matching size and measurement
    const matchingItem = existingItems.find(
      e => (e.size || null) === (item.size || null) && (e.measurement || null) === (item.measurement || null)
    );

    if (matchingItem) {
      const [updated] = await db
        .update(cartItems)
        .set({ quantity: matchingItem.quantity + (item.quantity || 1) })
        .where(eq(cartItems.id, matchingItem.id))
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

    const [created] = await db.insert(orders).values({
      ...order,
      createdAt: new Date(),
    }).returning();
    return created;
  }

  async getOrders(sessionId: string): Promise<Order[]> {
    if (!db) {
      return [];
    }

    return db.select().from(orders).where(eq(orders.sessionId, sessionId));
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    if (!db) return undefined;
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getAllOrders(): Promise<Order[]> {
    if (!db) {
      return [];
    }

    return db.select().from(orders);
  }

  async incrementProductStock(id: string, dx: number): Promise<void> {
    if (!db) return;
    const product = await this.getProductById(id);
    if (!product) return;
    
    const newStock = (product.stock || 0) + dx;
    console.log(`📦 DB_STORAGE: Restoring stock for "${product.name}" (${id}): ${product.stock} -> ${newStock}`);
    await db.update(products)
      .set({ 
        stock: newStock,
        inStock: newStock > 0 
      })
      .where(eq(products.id, id));
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    if (!db) return undefined;

    const order = await this.getOrderById(id);
    if (!order) return undefined;

    const previousStatus = order.status;
    
    // Logic for returning/deducting stock based on status changes
    if (status === "cancelled" && previousStatus !== "cancelled") {
      try {
        const itemsData = JSON.parse(order.items || "[]");
        console.log(`📦 DB_STORAGE: Order ${id} cancelled. Restoring stock for ${itemsData.length} items.`);
        for (const item of itemsData) {
          if (item.id) await this.incrementProductStock(item.id, item.quantity || 1);
        }
      } catch (e) {
        console.error("Error restoring stock on cancellation:", e);
      }
    } else if (previousStatus === "cancelled" && status !== "cancelled") {
      try {
        const itemsData = JSON.parse(order.items || "[]");
        console.log(`📦 DB_STORAGE: Order ${id} restored from cancelled. Deducting stock again.`);
        for (const item of itemsData) {
          if (item.id) await this.decrementProductStock(item.id, item.quantity || 1);
        }
      } catch (e) {
        console.error("Error decrementing stock on order restore:", e);
      }
    }

    const [updated] = await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
    return updated;
  }

  async archiveOrder(id: string): Promise<Order | undefined> {
    if (!db) return undefined;
    const [updated] = await db.update(orders).set({ isArchived: true }).where(eq(orders.id, id)).returning();
    return updated;
  }

  async getAdminSettings(): Promise<AdminSettings | undefined> {
    if (!db) return undefined;
    const [settings] = await db.select().from(adminSettings).where(eq(adminSettings.id, 1));
    if (!settings) {
      console.log("🛠️  STORAGE: Creating initial admin settings record...");
      const [created] = await db.insert(adminSettings).values({ 
        id: 1,
        username: process.env.ADMIN_USERNAME || "admin",
        password: process.env.ADMIN_PASSWORD || "admin12345",
        email: process.env.SMTP_USER || "admin@example.com",
        phone: process.env.ADMIN_PHONE || "+249912345678",
      }).returning();
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
      // Should handle via getAdminSettings, but as fallback
      const [created] = await db.insert(adminSettings).values({ 
        id: 1, 
        username: process.env.ADMIN_USERNAME || "admin",
        password: process.env.ADMIN_PASSWORD || "admin12345",
        ...settings 
      }).returning();
      return created;
    }
  }

  async resetRevenue(): Promise<void> {
    if (!db) return;
    await db.update(adminSettings).set({ revenueResetDate: new Date() }).where(eq(adminSettings.id, 1));
  }

  async getBanks(): Promise<Bank[]> {
    if (!db) return [];
    return db.select().from(banks);
  }

  async createBank(bank: InsertBank): Promise<Bank> {
    if (!db) throw new Error("Database is not configured");
    const [created] = await db.insert(banks).values(bank).returning();
    return created;
  }

  async deleteBank(id: string): Promise<void> {
    if (!db) return;
    await db.delete(banks).where(eq(banks.id, id));
  }

  async createSession(session: InsertSession): Promise<Session> {
    if (!db) throw new Error("Database is not configured");
    const [created] = await db.insert(sessions).values(session).returning();
    return created;
  }

  async getSession(token: string): Promise<Session | undefined> {
    if (!db) return undefined;
    const [session] = await db.select().from(sessions).where(eq(sessions.token, token));
    return session;
  }

  async deleteSession(token: string): Promise<void> {
    if (!db) return;
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  async getMessages(): Promise<Message[]> {
    if (!db) return [];
    return db.select().from(messages).orderBy(sql`${messages.createdAt} DESC`);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    if (!db) throw new Error("Database is not configured");
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  async markMessageAsRead(id: string): Promise<Message | undefined> {
    if (!db) return undefined;
    const [updated] = await db.update(messages).set({ isRead: true }).where(eq(messages.id, id)).returning();
    return updated;
  }

  async archiveMessage(id: string): Promise<Message | undefined> {
    if (!db) return undefined;
    const [updated] = await db.update(messages).set({ isArchived: true }).where(eq(messages.id, id)).returning();
    return updated;
  }

  async getMessageCountInLast24Hours(userId: string): Promise<number> {
    if (!db) return 0;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(eq(messages.userId, userId), gte(messages.createdAt, yesterday)));
    return Number(result.count || 0);
  }
}

export class MemoryStorage implements IStorage {
  public readonly mode = "MEMORY";
  private users = new Map<string, User>();
  private products = new Map<string, Product>();
  private categories = new Map<string, Category>();
  private cartItems = new Map<string, CartItem>();
  private orders = new Map<string, Order>();
  private banks = new Map<string, Bank>();
  private sessions = new Map<string, Session>();
  private messages = new Map<string, Message>();
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
      biometricEnabled: user.biometricEnabled ?? false,
      biometricToken: user.biometricToken ?? null,
      createdAt: new Date(),
      lastActive: new Date(),
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
      biometricEnabled: user.biometricEnabled ?? existing.biometricEnabled,
      biometricToken: user.biometricToken ?? existing.biometricToken,
      password: user.password ?? existing.password,
      username: user.username ?? existing.username,
    };
    this.users.set(id, updated);
    return updated;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUserLastActive(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastActive = new Date();
      this.users.set(id, user);
    }
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return Array.from(this.products.values())
      .filter((product) => product.category === category)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
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
      sizes: product.sizes ?? null,
      measurements: product.measurements ?? null,
      stock: product.stock ?? 0,
      sortOrder: product.sortOrder ?? 0,
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
      sizes: product.sizes ?? existing.sizes,
      measurements: product.measurements ?? existing.measurements,
      stock: product.stock ?? existing.stock,
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
      size: item.size || null,
      measurement: item.measurement || null,
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
      items: order.items ?? null,
      paymentMethod: order.paymentMethod ?? "cod",
      bankId: order.bankId ?? null,
      createdAt: new Date(),
      updatedAt: null,
      isArchived: false,
    };
    this.orders.set(created.id, created);
    return created;
  }

  async getOrders(sessionId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((order) => order.sessionId === sessionId);
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async incrementProductStock(id: string, dx: number): Promise<void> {
    const product = this.products.get(id);
    if (!product) return;
    const newStock = (product.stock || 0) + dx;
    this.products.set(id, { 
      ...product, 
      stock: newStock,
      inStock: newStock > 0 
    });
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const existing = this.orders.get(id);
    if (!existing) {
      return undefined;
    }

    const previousStatus = existing.status;
    
    // Status Logic for Stock
    if (status === "cancelled" && previousStatus !== "cancelled") {
      try {
        const itemsData = JSON.parse(existing.items || "[]");
        for (const item of itemsData) {
          if (item.id) await this.incrementProductStock(item.id, item.quantity || 1);
        }
      } catch (e) {
        console.error("Error restoring stock on cancellation:", e);
      }
    } else if (previousStatus === "cancelled" && status !== "cancelled") {
      try {
        const itemsData = JSON.parse(existing.items || "[]");
        for (const item of itemsData) {
          if (item.id) await this.decrementProductStock(item.id, item.quantity || 1);
        }
      } catch (e) {
        console.error("Error decrementing stock on order restore:", e);
      }
    }

    const updated: Order = { ...existing, status, updatedAt: new Date() };
    this.orders.set(id, updated);
    return updated;
  }

  async archiveOrder(id: string): Promise<Order | undefined> {
    const existing = this.orders.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, isArchived: true };
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
        shippingFee: 0,
        freeShippingThreshold: 50000,
        announcementText: "",
        passwordToken: null,
        revenueResetDate: new Date(),
        revenueResetCode: "1234",
      };
    }
    return this.adminSettings ?? undefined;
  }

  async updateAdminSettings(settings: Partial<InsertAdminSettings>): Promise<AdminSettings> {
    const current = await this.getAdminSettings();
    const updated = { ...current, ...settings } as AdminSettings;
    this.adminSettings = updated;
    return updated;
  }

  async resetRevenue(): Promise<void> {
    const current = await this.getAdminSettings();
    if (current) {
      this.adminSettings = { ...current, revenueResetDate: new Date() };
    }
  }

  async getBanks(): Promise<Bank[]> {
    return Array.from(this.banks.values());
  }

  async createBank(bank: InsertBank): Promise<Bank> {
    const created: Bank = { ...bank, id: createId() };
    this.banks.set(created.id, created);
    return created;
  }

  async deleteBank(id: string): Promise<void> {
    this.banks.delete(id);
  }

  async createSession(session: InsertSession): Promise<Session> {
    const created: Session = { ...session, id: createId(), createdAt: new Date() };
    this.sessions.set(session.token, created);
    return created;
  }

  async getSession(token: string): Promise<Session | undefined> {
    return this.sessions.get(token);
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  async getMessages(): Promise<Message[]> {
    return Array.from(this.messages.values()).sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const created: Message = {
      userId: message.userId || null,
      name: message.name,
      email: message.email,
      phone: message.phone || null,
      message: message.message,
      id: createId(),
      isRead: false,
      isArchived: false,
      createdAt: new Date(),
    };
    this.messages.set(created.id, created);
    return created;
  }

  async markMessageAsRead(id: string): Promise<Message | undefined> {
    const existing = this.messages.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, isRead: true };
    this.messages.set(id, updated);
    return updated;
  }

  async archiveMessage(id: string): Promise<Message | undefined> {
    const existing = this.messages.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, isArchived: true };
    this.messages.set(id, updated);
    return updated;
  }

  async getMessageCountInLast24Hours(userId: string): Promise<number> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return Array.from(this.messages.values()).filter(m => 
      m.userId === userId && m.createdAt && m.createdAt >= yesterday
    ).length;
  }

  async reorderProducts(ids: string[]): Promise<void> {
    ids.forEach((id, index) => {
      const product = this.products.get(id);
      if (product) {
        this.products.set(id, { ...product, sortOrder: index });
      }
    });
  }

  async decrementProductStock(id: string, dx: number): Promise<void> {
    const product = this.products.get(id);
    if (!product) return;
    const newStock = Math.max(0, (product.stock || 0) - dx);
    this.products.set(id, { 
      ...product, 
      stock: newStock,
      inStock: newStock > 0 
    });
  }
}

export const storage: IStorage = db ? new DatabaseStorage() : new MemoryStorage();
