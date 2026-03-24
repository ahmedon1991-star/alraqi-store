import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email").unique(),
  phone: varchar("phone", { length: 20 }),
  googleId: text("google_id").unique(),
  avatar: text("avatar"),
  authProvider: text("auth_provider").notNull().default("local"),
  biometricEnabled: boolean("biometric_enabled").default(false),
  biometricToken: text("biometric_token"),
  createdAt: timestamp("created_at").defaultNow(),
  lastActive: timestamp("last_active").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  phone: true,
  googleId: true,
  avatar: true,
  authProvider: true,
  biometricEnabled: true,
  biometricToken: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  price: integer("price").notNull(),
  image: text("image"),
  category: text("category").notNull(),
  rating: real("rating").default(0),
  reviews: integer("reviews").default(0),
  badge: text("badge"),
  inStock: boolean("in_stock").default(true),
  sizes: text("sizes"), // e.g., "S, M, L, XL"
  measurements: text("measurements"), // e.g., "Weight: 1kg, Length: 50cm"
  stock: integer("stock").notNull().default(0),
  sortOrder: integer("sort_order").default(0),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"),
});

export const insertCategorySchema = createInsertSchema(categories);
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  productId: varchar("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  size: text("size"),
  measurement: text("measurement"),
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true });
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  userId: varchar("user_id"),
  total: integer("total").notNull(),
  status: text("status").notNull().default("pending"),
  name: text("name"),
  phone: text("phone"),
  address: text("address"),
  items: text("items"), // Store JSON string of items: [{id, name, price, quantity, size}]
  paymentMethod: text("payment_method").notNull().default("cod"), // "cod" or "bank"
  bankId: varchar("bank_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isArchived: boolean("is_archived").default(false),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true, isArchived: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export const banks = pgTable("banks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bankName: text("bank_name").notNull(),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number").notNull(),
});

export const insertBankSchema = createInsertSchema(banks).omit({ id: true });
export type InsertBank = z.infer<typeof insertBankSchema>;
export type Bank = typeof banks.$inferSelect;

export const adminSettings = pgTable("admin_settings", {
  id: integer("id").primaryKey().default(1),
  email: text("email").notNull().default("admin@example.com"),
  phone: text("phone").notNull().default("+249912345678"),
  username: text("username").notNull().default("admin"),
  password: text("password").notNull().default("admin12345"),
  address: text("address").notNull().default("الخرطوم، السودان - شارع النيل"),
  facebook: text("facebook").notNull().default("https://facebook.com"),
  instagram: text("instagram").notNull().default("https://instagram.com"),
  twitter: text("twitter").notNull().default("https://twitter.com"),
  shippingFee: integer("shipping_fee").notNull().default(0),
  freeShippingThreshold: integer("free_shipping_threshold").notNull().default(50000),
  announcementText: text("announcement_text").notNull().default("خصم حصري 20% لفترة محدودة على كافة التوابل والبهارات!"),
  passwordToken: text("password_token"),
  revenueResetDate: timestamp("revenue_reset_date").defaultNow(),
  revenueResetCode: text("revenue_reset_code").notNull().default("1234"),
});

export const insertAdminSettingsSchema = createInsertSchema(adminSettings).omit({ id: true });
export type InsertAdminSettings = z.infer<typeof insertAdminSettingsSchema>;
export type AdminSettings = typeof adminSettings.$inferSelect;

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = { token: string; userId: string };

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  isArchived: boolean("is_archived").default(false),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, isRead: true, createdAt: true, isArchived: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
