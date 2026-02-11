import {
  type User, type InsertUser,
  type Product, type InsertProduct,
  type Category, type InsertCategory,
  type CartItem, type InsertCartItem,
  type Order, type InsertOrder,
  users, products, categories, cartItems, orders,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getProductsByCategory(category: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;

  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  getCartItems(sessionId: string): Promise<(CartItem & { product: Product })[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: string): Promise<void>;
  clearCart(sessionId: string): Promise<void>;
  getCartCount(sessionId: string): Promise<number>;

  createOrder(order: InsertOrder): Promise<Order>;
  getOrders(sessionId: string): Promise<Order[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getProducts(): Promise<Product[]> {
    return db.select().from(products);
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.category, category));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async getCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
  }

  async getCartItems(sessionId: string): Promise<(CartItem & { product: Product })[]> {
    const items = await db.select().from(cartItems).where(eq(cartItems.sessionId, sessionId));
    const result: (CartItem & { product: Product })[] = [];
    for (const item of items) {
      const [product] = await db.select().from(products).where(eq(products.id, item.productId));
      if (product) {
        result.push({ ...item, product });
      }
    }
    return result;
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    const existing = await db.select().from(cartItems)
      .where(and(eq(cartItems.sessionId, item.sessionId), eq(cartItems.productId, item.productId)));
    if (existing.length > 0) {
      const [updated] = await db.update(cartItems)
        .set({ quantity: existing[0].quantity + (item.quantity || 1) })
        .where(eq(cartItems.id, existing[0].id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(cartItems).values(item).returning();
    return created;
  }

  async updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined> {
    const [updated] = await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id)).returning();
    return updated;
  }

  async removeFromCart(id: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.id, id));
  }

  async clearCart(sessionId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
  }

  async getCartCount(sessionId: string): Promise<number> {
    const items = await db.select().from(cartItems).where(eq(cartItems.sessionId, sessionId));
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }

  async getOrders(sessionId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.sessionId, sessionId));
  }
}

export const storage = new DatabaseStorage();
